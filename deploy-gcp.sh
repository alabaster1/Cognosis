#!/bin/bash
#
# Cognosis GCP Deployment Script
# Deploys the full stack to Google Cloud Platform using Cloud Run
#
# Usage:
#   ./deploy-gcp.sh [phase]
#
# Phases:
#   setup       - Project setup and API enablement (Phase 1)
#   infra       - Infrastructure creation: VPC, Cloud SQL, Redis (Phase 2)
#   containers  - Build and push container images (Phase 3)
#   secrets     - Create secrets in Secret Manager (Phase 4a)
#   deploy      - Deploy services to Cloud Run (Phase 4b)
#   domain      - Set up DNS and SSL (Phase 5)
#   migrate     - Run database migrations (Phase 6)
#   all         - Run all phases in sequence
#   status      - Check deployment status
#
# Environment variables (can be set in .env.gcp or exported):
#   PROJECT_ID          - GCP project ID (default: cognosis-predict)
#   REGION              - GCP region (default: us-central1)
#   BILLING_ACCOUNT_ID  - Your GCP billing account ID (required for 'setup')
#   OPENAI_API_KEY      - OpenAI API key (required for 'secrets')
#   JWT_SECRET          - JWT signing secret (auto-generated if not set)
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/.env.gcp"

# Load config file if exists
if [[ -f "$CONFIG_FILE" ]]; then
    echo -e "${BLUE}Loading configuration from ${CONFIG_FILE}${NC}"
    source "$CONFIG_FILE"
fi

# Default values
export PROJECT_ID="${PROJECT_ID:-cognosis-predict}"
export REGION="${REGION:-us-central1}"
export DOMAIN="${DOMAIN:-cognosispredict.com}"

# Derived values
export SA_EMAIL="cognosis-api@${PROJECT_ID}.iam.gserviceaccount.com"
export DB_INSTANCE="${PROJECT_ID}:${REGION}:cognosis-db"
export ARTIFACT_REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/cognosis-containers"

# Helper functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_gcloud() {
    if ! command -v gcloud &> /dev/null; then
        log_error "gcloud CLI is not installed. Please install the Google Cloud SDK."
        exit 1
    fi
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker."
        exit 1
    fi
}

confirm() {
    read -p "$(echo -e ${YELLOW}$1 [y/N]: ${NC})" response
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

# =============================================================================
# PHASE 1: Project Setup
# =============================================================================
phase_setup() {
    log_info "=== PHASE 1: GCP Project Setup ==="

    if [[ -z "${BILLING_ACCOUNT_ID:-}" ]]; then
        log_error "BILLING_ACCOUNT_ID is required. Set it in .env.gcp or export it."
        log_info "Find your billing account ID with: gcloud billing accounts list"
        exit 1
    fi

    # Check if project exists
    if gcloud projects describe "$PROJECT_ID" &>/dev/null; then
        log_info "Project ${PROJECT_ID} already exists"
    else
        log_info "Creating project ${PROJECT_ID}..."
        gcloud projects create "$PROJECT_ID" --name="Cognosis Predict"
    fi

    log_info "Setting active project..."
    gcloud config set project "$PROJECT_ID"

    # Link billing
    log_info "Linking billing account..."
    gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT_ID" || true

    # Enable APIs
    log_info "Enabling required APIs (this may take a few minutes)..."
    gcloud services enable \
        run.googleapis.com \
        cloudbuild.googleapis.com \
        artifactregistry.googleapis.com \
        sqladmin.googleapis.com \
        redis.googleapis.com \
        secretmanager.googleapis.com \
        vpcaccess.googleapis.com \
        compute.googleapis.com \
        dns.googleapis.com \
        cloudresourcemanager.googleapis.com

    # Create service account
    log_info "Creating service account..."
    if ! gcloud iam service-accounts describe "$SA_EMAIL" &>/dev/null; then
        gcloud iam service-accounts create cognosis-api \
            --display-name="Cognosis API Service Account"
    else
        log_info "Service account already exists"
    fi

    # Grant roles
    log_info "Granting IAM roles to service account..."
    for role in cloudsql.client secretmanager.secretAccessor redis.editor logging.logWriter cloudtrace.agent; do
        gcloud projects add-iam-policy-binding "$PROJECT_ID" \
            --member="serviceAccount:$SA_EMAIL" \
            --role="roles/$role" \
            --condition=None \
            --quiet || true
    done

    log_success "Phase 1 complete: Project setup finished"
}

# =============================================================================
# PHASE 2: Infrastructure Setup
# =============================================================================
phase_infra() {
    log_info "=== PHASE 2: Infrastructure Setup ==="

    # VPC Network
    log_info "Creating VPC network..."
    if ! gcloud compute networks describe cognosis-vpc &>/dev/null; then
        gcloud compute networks create cognosis-vpc --subnet-mode=auto
    else
        log_info "VPC network already exists"
    fi

    # VPC Connector
    log_info "Creating VPC connector (this may take a few minutes)..."
    if ! gcloud compute networks vpc-access connectors describe cognosis-connector --region="$REGION" &>/dev/null; then
        gcloud compute networks vpc-access connectors create cognosis-connector \
            --network=cognosis-vpc \
            --region="$REGION" \
            --range=10.8.0.0/28
    else
        log_info "VPC connector already exists"
    fi

    # Cloud SQL Instance
    log_info "Creating Cloud SQL instance (this may take 5-10 minutes)..."
    if ! gcloud sql instances describe cognosis-db &>/dev/null; then
        gcloud sql instances create cognosis-db \
            --database-version=POSTGRES_16 \
            --edition=ENTERPRISE \
            --tier=db-custom-2-7680 \
            --region="$REGION" \
            --network=projects/${PROJECT_ID}/global/networks/cognosis-vpc \
            --no-assign-ip \
            --storage-type=SSD \
            --storage-size=20GB \
            --storage-auto-increase
    else
        log_info "Cloud SQL instance already exists"
    fi

    # Create database
    log_info "Creating database..."
    gcloud sql databases create cognosis --instance=cognosis-db 2>/dev/null || log_info "Database already exists"

    # Create database user with random password
    log_info "Creating database user..."
    export DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    gcloud sql users create cognosis_user \
        --instance=cognosis-db \
        --password="$DB_PASSWORD" 2>/dev/null || log_warn "User may already exist - update password if needed"

    # Save DB password for later use
    echo "DB_PASSWORD=$DB_PASSWORD" >> "$CONFIG_FILE.secrets"
    chmod 600 "$CONFIG_FILE.secrets"
    log_info "Database password saved to ${CONFIG_FILE}.secrets"

    # Redis (Memorystore)
    log_info "Creating Redis instance (this may take a few minutes)..."
    if ! gcloud redis instances describe cognosis-cache --region="$REGION" &>/dev/null; then
        gcloud redis instances create cognosis-cache \
            --size=1 \
            --region="$REGION" \
            --network=cognosis-vpc \
            --redis-version=redis_7_0
    else
        log_info "Redis instance already exists"
    fi

    # Get Redis host
    REDIS_HOST=$(gcloud redis instances describe cognosis-cache --region="$REGION" --format='value(host)')
    log_info "Redis host: $REDIS_HOST"

    log_success "Phase 2 complete: Infrastructure setup finished"
    log_info "Important: Save your DB_PASSWORD from ${CONFIG_FILE}.secrets"
}

# =============================================================================
# PHASE 3: Container Build and Push
# =============================================================================
phase_containers() {
    log_info "=== PHASE 3: Container Build and Push ==="

    check_docker

    # Create Artifact Registry
    log_info "Creating Artifact Registry repository..."
    if ! gcloud artifacts repositories describe cognosis-containers --location="$REGION" &>/dev/null; then
        gcloud artifacts repositories create cognosis-containers \
            --repository-format=docker \
            --location="$REGION" \
            --description="Cognosis container images"
    else
        log_info "Artifact Registry already exists"
    fi

    # Configure Docker auth
    log_info "Configuring Docker authentication..."
    gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

    # Build and push backend
    log_info "Building backend image..."
    docker build -t "${ARTIFACT_REGISTRY}/backend:latest" -t "${ARTIFACT_REGISTRY}/backend:$(date +%Y%m%d-%H%M%S)" "$SCRIPT_DIR/backend"

    log_info "Pushing backend image..."
    docker push "${ARTIFACT_REGISTRY}/backend:latest"

    # Build and push AI service
    log_info "Building AI service image..."
    docker build -t "${ARTIFACT_REGISTRY}/ai-service:latest" -t "${ARTIFACT_REGISTRY}/ai-service:$(date +%Y%m%d-%H%M%S)" "$SCRIPT_DIR/ai"

    log_info "Pushing AI service image..."
    docker push "${ARTIFACT_REGISTRY}/ai-service:latest"

    log_success "Phase 3 complete: Container images built and pushed"
}

# =============================================================================
# PHASE 4a: Secrets Setup
# =============================================================================
phase_secrets() {
    log_info "=== PHASE 4a: Secrets Setup ==="

    # Load saved DB password
    if [[ -f "${CONFIG_FILE}.secrets" ]]; then
        source "${CONFIG_FILE}.secrets"
    fi

    if [[ -z "${DB_PASSWORD:-}" ]]; then
        log_error "DB_PASSWORD not found. Run 'phase_infra' first or set it manually."
        exit 1
    fi

    if [[ -z "${GEMINI_API_KEY:-}" ]]; then
        log_error "GEMINI_API_KEY is required. Set it in .env.gcp or export it."
        exit 1
    fi

    # Generate secrets if not set
    export JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
    export ENCRYPTION_KEY="${ENCRYPTION_KEY:-$(openssl rand -hex 32)}"
    export WEBHOOK_SECRET="${WEBHOOK_SECRET:-$(openssl rand -hex 32)}"
    export ADMIN_API_KEY="${ADMIN_API_KEY:-$(openssl rand -hex 32)}"

    # Create secrets
    create_secret() {
        local name=$1
        local value=$2
        if gcloud secrets describe "$name" &>/dev/null; then
            log_info "Updating secret: $name"
            echo -n "$value" | gcloud secrets versions add "$name" --data-file=-
        else
            log_info "Creating secret: $name"
            echo -n "$value" | gcloud secrets create "$name" --data-file=-
        fi
    }

    # Database password
    create_secret "db-password" "$DB_PASSWORD"

    # Gemini API key
    create_secret "gemini-api-key" "$GEMINI_API_KEY"

    # JWT secret
    create_secret "jwt-secret" "$JWT_SECRET"

    # Encryption key (for encrypting experiment data)
    create_secret "encryption-key" "$ENCRYPTION_KEY"

    # Webhook secret (for verifying AI service webhooks)
    create_secret "webhook-secret" "$WEBHOOK_SECRET"

    # Admin API key (for AI service admin endpoints)
    create_secret "admin-api-key" "$ADMIN_API_KEY"

    # Database connection string
    DB_CONNECTION_STRING="postgresql://cognosis_user:${DB_PASSWORD}@/cognosis?host=/cloudsql/${DB_INSTANCE}"
    create_secret "db-connection-string" "$DB_CONNECTION_STRING"

    # Optional: Add more secrets if needed
    if [[ -n "${UNSPLASH_ACCESS_KEY:-}" ]]; then
        create_secret "unsplash-access-key" "$UNSPLASH_ACCESS_KEY"
    fi

    if [[ -n "${PEXELS_API_KEY:-}" ]]; then
        create_secret "pexels-api-key" "$PEXELS_API_KEY"
    fi

    if [[ -n "${NASA_API_KEY:-}" ]]; then
        create_secret "nasa-api-key" "$NASA_API_KEY"
    fi

    # Grant secret access to service account
    log_info "Granting secret access to service account..."
    for secret in db-password gemini-api-key jwt-secret encryption-key webhook-secret admin-api-key db-connection-string; do
        gcloud secrets add-iam-policy-binding "$secret" \
            --member="serviceAccount:$SA_EMAIL" \
            --role="roles/secretmanager.secretAccessor" \
            --quiet || true
    done

    log_success "Phase 4a complete: Secrets created"
}

# =============================================================================
# PHASE 4b: Deploy Services
# =============================================================================
phase_deploy() {
    log_info "=== PHASE 4b: Deploy Services to Cloud Run ==="

    # Get Redis host
    REDIS_HOST=$(gcloud redis instances describe cognosis-cache --region="$REGION" --format='value(host)' 2>/dev/null || echo "")

    # Deploy Backend API
    log_info "Deploying backend API to Cloud Run..."
    gcloud run deploy cognosis-backend \
        --image="${ARTIFACT_REGISTRY}/backend:latest" \
        --region="$REGION" \
        --service-account="$SA_EMAIL" \
        --vpc-connector=cognosis-connector \
        --allow-unauthenticated \
        --min-instances=1 \
        --max-instances=10 \
        --memory=1Gi \
        --cpu=1 \
        --port=8080 \
        --session-affinity \
        --set-env-vars="NODE_ENV=production,REDIS_HOST=${REDIS_HOST:-localhost}" \
        --set-secrets="DATABASE_URL=db-connection-string:latest,JWT_SECRET=jwt-secret:latest,GEMINI_API_KEY=gemini-api-key:latest,ENCRYPTION_KEY=encryption-key:latest,WEBHOOK_SECRET=webhook-secret:latest" \
        --add-cloudsql-instances="$DB_INSTANCE"

    # Get backend URL
    BACKEND_URL=$(gcloud run services describe cognosis-backend --region="$REGION" --format='value(status.url)')
    log_info "Backend deployed at: $BACKEND_URL"

    # Deploy AI Service (internal only)
    log_info "Deploying AI service to Cloud Run..."
    # Note: Using ^ as delimiter to allow URLs with colons and commas in CORS_ORIGINS
    gcloud run deploy cognosis-ai-service \
        --image="${ARTIFACT_REGISTRY}/ai-service:latest" \
        --region="$REGION" \
        --service-account="$SA_EMAIL" \
        --vpc-connector=cognosis-connector \
        --no-allow-unauthenticated \
        --min-instances=0 \
        --max-instances=5 \
        --memory=2Gi \
        --cpu=2 \
        --port=8080 \
        --set-env-vars='^@^NODE_ENV=production@LLM_PROVIDER=gemini@CORS_ORIGINS=https://cognosispredict.com,https://api.cognosispredict.com' \
        --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,DATABASE_URL=db-connection-string:latest,ADMIN_API_KEY=admin-api-key:latest,WEBHOOK_SECRET=webhook-secret:latest" \
        --add-cloudsql-instances="$DB_INSTANCE"

    # Get AI service URL
    AI_SERVICE_URL=$(gcloud run services describe cognosis-ai-service --region="$REGION" --format='value(status.url)')
    log_info "AI Service deployed at: $AI_SERVICE_URL"

    # Allow backend to invoke AI service
    log_info "Configuring service-to-service authentication..."
    gcloud run services add-iam-policy-binding cognosis-ai-service \
        --region="$REGION" \
        --member="serviceAccount:$SA_EMAIL" \
        --role="roles/run.invoker" \
        --quiet

    # Update backend with AI service URL
    log_info "Updating backend with AI service URL..."
    gcloud run services update cognosis-backend \
        --region="$REGION" \
        --update-env-vars="AI_SERVICE_URL=${AI_SERVICE_URL}"

    log_success "Phase 4b complete: Services deployed"
    echo ""
    log_info "Backend URL: $BACKEND_URL"
    log_info "AI Service URL: $AI_SERVICE_URL (internal only)"
}

# =============================================================================
# PHASE 5: Domain and DNS Setup
# =============================================================================
phase_domain() {
    log_info "=== PHASE 5: Domain and DNS Setup ==="

    # Create Cloud DNS zone
    log_info "Creating Cloud DNS zone..."
    if ! gcloud dns managed-zones describe cognosis-zone &>/dev/null; then
        gcloud dns managed-zones create cognosis-zone \
            --dns-name="${DOMAIN}." \
            --visibility=public \
            --description="Cognosis DNS zone"
    else
        log_info "DNS zone already exists"
    fi

    # Get nameservers
    log_info "DNS Nameservers (update your domain registrar with these):"
    gcloud dns managed-zones describe cognosis-zone --format='value(nameServers)' | tr ';' '\n'
    echo ""

    # Reserve static IP
    log_info "Reserving static IP address..."
    if ! gcloud compute addresses describe cognosis-ip --global &>/dev/null; then
        gcloud compute addresses create cognosis-ip --global
    fi
    STATIC_IP=$(gcloud compute addresses describe cognosis-ip --global --format='value(address)')
    log_info "Static IP: $STATIC_IP"

    # Create SSL certificate
    log_info "Creating SSL certificate (may take time to provision)..."
    if ! gcloud compute ssl-certificates describe cognosis-cert --global &>/dev/null; then
        gcloud compute ssl-certificates create cognosis-cert \
            --domains="${DOMAIN},www.${DOMAIN},api.${DOMAIN}" \
            --global
    else
        log_info "SSL certificate already exists"
    fi

    # Create Network Endpoint Group (NEG)
    log_info "Creating serverless NEG..."
    if ! gcloud compute network-endpoint-groups describe cognosis-neg --region="$REGION" &>/dev/null; then
        gcloud compute network-endpoint-groups create cognosis-neg \
            --region="$REGION" \
            --network-endpoint-type=serverless \
            --cloud-run-service=cognosis-backend
    else
        log_info "NEG already exists"
    fi

    # Create backend service
    log_info "Creating backend service..."
    if ! gcloud compute backend-services describe cognosis-backend-svc --global &>/dev/null; then
        gcloud compute backend-services create cognosis-backend-svc \
            --global \
            --load-balancing-scheme=EXTERNAL_MANAGED

        gcloud compute backend-services add-backend cognosis-backend-svc \
            --global \
            --network-endpoint-group=cognosis-neg \
            --network-endpoint-group-region="$REGION"
    else
        log_info "Backend service already exists"
    fi

    # Create URL map
    log_info "Creating URL map..."
    if ! gcloud compute url-maps describe cognosis-urlmap &>/dev/null; then
        gcloud compute url-maps create cognosis-urlmap \
            --default-service=cognosis-backend-svc
    else
        log_info "URL map already exists"
    fi

    # Create HTTPS proxy
    log_info "Creating HTTPS proxy..."
    if ! gcloud compute target-https-proxies describe cognosis-https-proxy &>/dev/null; then
        gcloud compute target-https-proxies create cognosis-https-proxy \
            --ssl-certificates=cognosis-cert \
            --url-map=cognosis-urlmap
    else
        log_info "HTTPS proxy already exists"
    fi

    # Create forwarding rule
    log_info "Creating forwarding rule..."
    if ! gcloud compute forwarding-rules describe cognosis-https-rule --global &>/dev/null; then
        gcloud compute forwarding-rules create cognosis-https-rule \
            --load-balancing-scheme=EXTERNAL_MANAGED \
            --address=cognosis-ip \
            --target-https-proxy=cognosis-https-proxy \
            --global \
            --ports=443
    else
        log_info "Forwarding rule already exists"
    fi

    # Create DNS records
    log_info "Creating DNS records..."

    # Root domain
    gcloud dns record-sets create "${DOMAIN}." \
        --zone=cognosis-zone \
        --type=A \
        --ttl=300 \
        --rrdatas="$STATIC_IP" 2>/dev/null || log_info "Root A record may already exist"

    # API subdomain
    gcloud dns record-sets create "api.${DOMAIN}." \
        --zone=cognosis-zone \
        --type=A \
        --ttl=300 \
        --rrdatas="$STATIC_IP" 2>/dev/null || log_info "API A record may already exist"

    # www subdomain
    gcloud dns record-sets create "www.${DOMAIN}." \
        --zone=cognosis-zone \
        --type=A \
        --ttl=300 \
        --rrdatas="$STATIC_IP" 2>/dev/null || log_info "WWW A record may already exist"

    log_success "Phase 5 complete: Domain and DNS setup finished"
    echo ""
    log_warn "IMPORTANT: Update your domain registrar with the nameservers listed above!"
    log_info "SSL certificate provisioning may take 10-60 minutes"
}

# =============================================================================
# PHASE 6: Database Migration
# =============================================================================
phase_migrate() {
    log_info "=== PHASE 6: Database Migration ==="

    # Load saved DB password
    if [[ -f "${CONFIG_FILE}.secrets" ]]; then
        source "${CONFIG_FILE}.secrets"
    fi

    if [[ -z "${DB_PASSWORD:-}" ]]; then
        log_error "DB_PASSWORD not found. Set it manually or check ${CONFIG_FILE}.secrets"
        exit 1
    fi

    # Check for cloud_sql_proxy
    if ! command -v cloud_sql_proxy &>/dev/null && ! command -v cloud-sql-proxy &>/dev/null; then
        log_warn "Cloud SQL Auth Proxy not found. Installing..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.2/cloud-sql-proxy.darwin.arm64
            chmod +x cloud-sql-proxy
            PROXY_CMD="./cloud-sql-proxy"
        else
            curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.2/cloud-sql-proxy.linux.amd64
            chmod +x cloud-sql-proxy
            PROXY_CMD="./cloud-sql-proxy"
        fi
    else
        PROXY_CMD=$(command -v cloud_sql_proxy || command -v cloud-sql-proxy)
    fi

    log_info "Starting Cloud SQL Auth Proxy..."
    $PROXY_CMD "${PROJECT_ID}:${REGION}:cognosis-db" --port=5432 &
    PROXY_PID=$!

    # Wait for proxy to start
    sleep 5

    # Run Prisma migrations
    log_info "Running Prisma migrations..."
    cd "$SCRIPT_DIR/backend"

    DATABASE_URL="postgresql://cognosis_user:${DB_PASSWORD}@localhost:5432/cognosis" \
        npx prisma migrate deploy

    log_info "Stopping Cloud SQL Auth Proxy..."
    kill $PROXY_PID 2>/dev/null || true

    log_success "Phase 6 complete: Database migrations applied"
}

# =============================================================================
# Status Check
# =============================================================================
check_status() {
    log_info "=== Deployment Status ==="
    echo ""

    # Project
    log_info "Project: $PROJECT_ID"
    log_info "Region: $REGION"
    echo ""

    # Cloud SQL
    log_info "Cloud SQL Instance:"
    gcloud sql instances describe cognosis-db --format='table(name,state,region,databaseVersion)' 2>/dev/null || log_warn "Not found"
    echo ""

    # Redis
    log_info "Redis Instance:"
    gcloud redis instances describe cognosis-cache --region="$REGION" --format='table(name,state,host,port)' 2>/dev/null || log_warn "Not found"
    echo ""

    # Cloud Run Services
    log_info "Cloud Run Services:"
    gcloud run services list --region="$REGION" --format='table(name,status.url,status.traffic[0].percent)' 2>/dev/null || log_warn "Not found"
    echo ""

    # Load Balancer
    log_info "Load Balancer IP:"
    gcloud compute addresses describe cognosis-ip --global --format='value(address)' 2>/dev/null || log_warn "Not found"
    echo ""

    # SSL Certificate
    log_info "SSL Certificate Status:"
    gcloud compute ssl-certificates describe cognosis-cert --global --format='table(name,type,status,managed.status,managed.domainStatus)' 2>/dev/null || log_warn "Not found"
    echo ""

    # Health check
    BACKEND_URL=$(gcloud run services describe cognosis-backend --region="$REGION" --format='value(status.url)' 2>/dev/null || echo "")
    if [[ -n "$BACKEND_URL" ]]; then
        log_info "Backend Health Check:"
        curl -s "${BACKEND_URL}/health" | head -c 200
        echo ""
    fi
}

# =============================================================================
# Main
# =============================================================================
main() {
    check_gcloud

    case "${1:-help}" in
        setup)
            phase_setup
            ;;
        infra)
            phase_infra
            ;;
        containers)
            phase_containers
            ;;
        secrets)
            phase_secrets
            ;;
        deploy)
            phase_deploy
            ;;
        domain)
            phase_domain
            ;;
        migrate)
            phase_migrate
            ;;
        all)
            log_info "Running full deployment..."
            phase_setup
            phase_infra
            phase_containers
            phase_secrets
            phase_deploy
            phase_domain
            phase_migrate
            log_success "Full deployment complete!"
            check_status
            ;;
        status)
            check_status
            ;;
        help|*)
            echo "Cognosis GCP Deployment Script"
            echo ""
            echo "Usage: $0 [phase]"
            echo ""
            echo "Phases:"
            echo "  setup       - Project setup and API enablement (Phase 1)"
            echo "  infra       - Infrastructure creation: VPC, Cloud SQL, Redis (Phase 2)"
            echo "  containers  - Build and push container images (Phase 3)"
            echo "  secrets     - Create secrets in Secret Manager (Phase 4a)"
            echo "  deploy      - Deploy services to Cloud Run (Phase 4b)"
            echo "  domain      - Set up DNS and SSL (Phase 5)"
            echo "  migrate     - Run database migrations (Phase 6)"
            echo "  all         - Run all phases in sequence"
            echo "  status      - Check deployment status"
            echo ""
            echo "Before running, create .env.gcp with:"
            echo "  PROJECT_ID=cognosis-predict"
            echo "  REGION=us-central1"
            echo "  BILLING_ACCOUNT_ID=your-billing-account-id"
            echo "  GEMINI_API_KEY=your-gemini-key"
            echo "  DOMAIN=cognosispredict.com"
            ;;
    esac
}

main "$@"
