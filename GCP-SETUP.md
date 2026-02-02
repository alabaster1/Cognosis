# Google Cloud Platform (GCP) Setup

**Status:** ✅ gcloud CLI Installed (v554.0.0)

---

## Step 1: Initialize gcloud CLI

```bash
# Source updated bashrc (gcloud was added to PATH)
source ~/.bashrc

# Or use full path
~/google-cloud-sdk/bin/gcloud init
```

This will:
1. Ask you to login (opens browser)
2. Select or create a GCP project
3. Configure default region/zone

**Alternative: Manual login**
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud config set compute/region us-central1
```

---

## Step 2: Enable Required APIs

```bash
# Enable Cloud Run, Cloud Build, Secret Manager
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  compute.googleapis.com
```

---

## Step 3: Set Up Billing

1. Go to: https://console.cloud.google.com/billing
2. Link a billing account to your project
3. Verify billing is enabled:
   ```bash
   gcloud beta billing projects describe YOUR_PROJECT_ID
   ```

---

## Step 4: Create GCP Project (if needed)

```bash
# Create new project
gcloud projects create cognosis-predict --name="Cognosis Predict"

# Set as default
gcloud config set project cognosis-predict

# Enable billing (requires billing account ID)
gcloud beta billing projects link cognosis-predict \
  --billing-account=BILLING_ACCOUNT_ID
```

---

## Deploy Using Automated Script

The repository includes a comprehensive deployment script:

```bash
cd /home/albert/Cognosis

# View available phases
./deploy-gcp.sh

# Run all phases in sequence
./deploy-gcp.sh all
```

**Deployment Phases:**

1. **setup** - Project setup and API enablement
2. **infra** - Infrastructure (VPC, Cloud SQL, Redis)
3. **containers** - Build and push container images
4. **secrets** - Create secrets in Secret Manager
5. **deploy** - Deploy services to Cloud Run
6. **domain** - Set up DNS and SSL
7. **migrate** - Run database migrations

---

## Manual Deployment (Cloud Run)

### Build Container

```bash
cd /home/albert/Cognosis

# Build for Cloud Run
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cognosis-web
```

### Deploy to Cloud Run

```bash
gcloud run deploy cognosis-web \
  --image gcr.io/YOUR_PROJECT_ID/cognosis-web \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_NETWORK=preprod,NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=preprodXXXX"
```

---

## Environment Variables (Cloud Run)

Set via command line:

```bash
gcloud run services update cognosis-web \
  --set-env-vars "
NEXT_PUBLIC_NETWORK=preprod,
NEXT_PUBLIC_EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7,
NEXT_PUBLIC_VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj,
NEXT_PUBLIC_LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4,
NEXT_PUBLIC_PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
"
```

Or via console:
1. Go to: Cloud Run → cognosis-web → Edit & Deploy New Revision
2. Variables & Secrets → Add variable
3. Deploy

---

## Using Secret Manager (for sensitive data)

### Create Secrets

```bash
# Create OpenAI API key secret
echo -n "sk-XXXXXXXX" | gcloud secrets create openai-api-key --data-file=-

# Create Blockfrost project ID secret
echo -n "preprodXXXX" | gcloud secrets create blockfrost-project-id --data-file=-
```

### Grant Access to Cloud Run

```bash
# Get the service account email
gcloud run services describe cognosis-web --region us-central1 --format="value(spec.template.spec.serviceAccountName)"

# Grant access
gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"
```

### Mount in Cloud Run

```bash
gcloud run services update cognosis-web \
  --set-secrets="OPENAI_API_KEY=openai-api-key:latest"
```

---

## Database Setup (Cloud SQL + PostgreSQL)

### Create Instance

```bash
gcloud sql instances create cognosis-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=SECURE_PASSWORD
```

### Create Database

```bash
gcloud sql databases create cognosis --instance=cognosis-db
```

### Connect from Cloud Run

```bash
gcloud run services update cognosis-web \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:cognosis-db \
  --set-env-vars="DATABASE_URL=postgresql://postgres:PASSWORD@/cognosis?host=/cloudsql/YOUR_PROJECT_ID:us-central1:cognosis-db"
```

---

## Custom Domain Setup

### Add Domain Mapping

```bash
gcloud beta run domain-mappings create \
  --service cognosis-web \
  --domain cognosispredict.com \
  --region us-central1
```

### Configure DNS

Add these records at your domain registrar:

```
Type: A
Name: @
Value: [IP from gcloud command output]

Type: CNAME  
Name: www
Value: ghs.googlehosted.com
```

### Verify Domain

```bash
gcloud domains verify cognosispredict.com
```

---

## Monitoring & Logs

### View Logs

```bash
# Real-time logs
gcloud run services logs read cognosis-web --follow --region us-central1

# Recent logs
gcloud run services logs tail cognosis-web --region us-central1
```

### Metrics

```bash
# Service details
gcloud run services describe cognosis-web --region us-central1

# Traffic metrics (via Cloud Console)
# https://console.cloud.google.com/run
```

---

## Cost Optimization

### Free Tier Limits (Cloud Run)

- 2 million requests per month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds of compute

### Set Budget Alerts

```bash
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="Cognosis Budget" \
  --budget-amount=50USD \
  --threshold-rule=percent=90
```

---

## Automated Deployment Script

The included `deploy-gcp.sh` handles everything automatically:

```bash
cd /home/albert/Cognosis

# Edit configuration
nano .env.gcp
```

**Required in .env.gcp:**
```bash
PROJECT_ID=cognosis-predict
REGION=us-central1
BILLING_ACCOUNT_ID=XXXXXX-YYYYYY-ZZZZZZ
OPENAI_API_KEY=sk-XXXXXXXX
BLOCKFROST_PROJECT_ID=preprodXXXX
```

**Then deploy:**
```bash
./deploy-gcp.sh all
```

This will:
1. Create GCP project
2. Enable APIs
3. Build containers
4. Deploy to Cloud Run
5. Set up database
6. Configure domain
7. Run migrations

**Estimated time:** 15-20 minutes

---

## Troubleshooting

### Permission Denied Errors

```bash
# Ensure you're logged in
gcloud auth list

# Re-authenticate if needed
gcloud auth login
```

### Build Failures

```bash
# Check build logs
gcloud builds list --limit=5

# View specific build
gcloud builds log BUILD_ID
```

### Service Not Accessible

```bash
# Check service status
gcloud run services describe cognosis-web --region us-central1

# Ensure allow-unauthenticated is set
gcloud run services update cognosis-web \
  --allow-unauthenticated \
  --region us-central1
```

---

## Current Status

- ✅ gcloud CLI installed (v554.0.0)
- ⏸️ Waiting: gcloud init (login required)
- ⏸️ Waiting: Project configuration
- 📝 Ready: Deploy with `./deploy-gcp.sh all`

---

## Next Steps

### Option A: Automated Deployment

1. **Initialize gcloud:**
   ```bash
   gcloud init
   ```

2. **Configure environment:**
   ```bash
   cd /home/albert/Cognosis
   cp .env.gcp.example .env.gcp
   nano .env.gcp  # Add your values
   ```

3. **Deploy:**
   ```bash
   ./deploy-gcp.sh all
   ```

### Option B: Manual Deployment

1. **Initialize gcloud:** `gcloud init`
2. **Enable APIs:** See "Enable Required APIs" above
3. **Build image:** `gcloud builds submit`
4. **Deploy to Cloud Run:** `gcloud run deploy`
5. **Set env vars:** `gcloud run services update`

---

## Comparison: Vercel vs GCP

| Feature | Vercel | GCP Cloud Run |
|---------|--------|---------------|
| **Ease of Setup** | ⭐⭐⭐⭐⭐ Extremely easy | ⭐⭐⭐ Moderate |
| **Cost (free tier)** | Generous free tier | Good free tier |
| **Custom Domain** | Easy, auto SSL | Manual DNS setup |
| **Build Time** | ~2 minutes | ~5-10 minutes |
| **Deployment** | Git push auto-deploys | Manual or CI/CD |
| **Backend Support** | Serverless functions | Full containers |
| **Database** | Requires external | Cloud SQL included |
| **Scaling** | Automatic | Automatic |

**Recommendation for Cognosis:**
- **Start with Vercel** (simpler, faster deployment)
- **Move to GCP later** if you need:
  - Full backend control
  - Managed PostgreSQL
  - More complex infrastructure
  - Custom VPC/networking

---

**Status:** ✅ GCP CLI ready | Choose Vercel (easy) or GCP (full control)

🚀 Both platforms ready to deploy!
