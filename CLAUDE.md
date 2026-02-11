# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cognosis Institute (PsyApp) is a privacy-preserving platform for conducting verified psi/parapsychology experiments with blockchain integrity verification and AI-powered analysis.

**Production**: https://cognosispredict.com
**Backend API**: https://api.cognosispredict.com (Cloud Run: cognosis-backend-317492936379.us-central1.run.app)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Next.js 16 + Turbopack)              │
│  Wallet-only auth, Zustand state, React Query, Socket.io   │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket (:3000 → :3001)
┌────────────────────▼────────────────────────────────────────┐
│              Backend API (Express/Node.js)                  │
│  Prisma ORM, Midnight Network SDK, IPFS/Pinata             │
└──────┬──────────────┬─────────────────────┬─────────────────┘
       │              │                     │ HTTP (:8001)
┌──────▼──────┐ ┌─────▼─────┐     ┌─────────▼──────────┐
│ PostgreSQL  │ │   Redis   │     │   AI Service       │
│   (Prisma)  │ │ (Sessions)│     │  (Python FastAPI)  │
└─────────────┘ └───────────┘     └────────────────────┘
```

## Development Commands

### Full Stack (Docker)
```bash
docker-compose up              # All services
docker-compose up postgres redis  # Just databases
```

### Frontend (port 3000)
```bash
npm install      # From project root
npm run dev      # Development with Turbopack
npm run build    # Production build
npm run lint     # ESLint
```

### Backend (port 3001)
```bash
cd backend
npm install
npm run dev      # Nodemon watch mode
npm run start    # Production
```

### AI Service (port 8001)
```bash
cd ai
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### Database
```bash
cd backend
npx prisma migrate dev --name <name>   # Create migration
npx prisma migrate deploy              # Apply migrations
npx prisma generate                    # Regenerate client
npx prisma studio                      # Visual browser
```

### Deployment (GCP Cloud Run)
```bash
./deploy-gcp.sh deploy    # Deploy all services
./deploy-gcp.sh status    # Check deployment status
```

## Key Directories

**Frontend** (`/src/`)
- `app/experiments/` - 35 experiment type pages
- `components/ai/ChatKit/` - AI agent chat interface
- `services/apiService.ts` - HTTP client for backend
- `services/blockchainService.ts` - Cardano/Midnight wallet ops
- `store/` - Zustand stores

**Backend** (`/backend/`)
- `routes/` - Express routes (experiments, commitReveal, agents, rvSessions)
- `services/` - Business logic (blockchainService, ipfsService, predictionScoringService)
- `prisma/schema.prisma` - Database schema
- `middleware/rateLimit.js` - Rate limiting config

**AI Service** (`/ai/`)
- `agents/rv_expert.py` - Remote viewing expert (CRV 6-stage protocol)
- `agents/psi_score_ai.py` - Multi-dimensional scoring
- `main.py` - FastAPI endpoints

## Core Patterns

### Authentication
Wallet-only via Cardano/Lucid-Evolution. No passwords. JWT in HTTP-only cookies. `optionalAuthMiddleware` for guest mode.

### Commit-Reveal Protocol
1. User prediction → client encrypts with AES-256-GCM
2. Commitment hash: `H(H(prediction:nonce))`
3. Store commitment on Midnight Network blockchain
4. Upload encrypted response to IPFS (Pinata)
5. After reveal date: AI scoring via PsiScoreAI

### Rate Limiting
- `apiLimiter`: 15/min general
- `blockchainLimiter`: blockchain ops
- `uploadLimiter`: file uploads
- `authLimiter`: auth routes

## Experiment Types

35 experiments including: remote-viewing, precognition, telepathy, telepathy-ghost, telepathy-live, telepathy-emotions, multi-party-telepathy, ai-telepathy, psychokinesis, pk-influence, dice-influence, dream-journal, synchronicity, synchronicity-bingo, intuition, retrocausality, ganzfeld, global-consciousness, card-prediction, zener-oracle, rv-crv-protocol, event-forecasting, precog-explorer, quantum-coin-arena, pattern-oracle, timeline-racer, time-loop, memory-field, emotion-echo, mind-pulse, retro-roulette, psi-poker, remote-viewing-images, remote-viewing-locations, remote-viewing-objects

## AI Agents

- **RVExpertAgent**: Remote viewing guidance with 6-stage CRV workflow
- **PsiScoreAI**: Multi-dimensional scoring (spatial 25%, semantic 25%, emotional 20%, sensory 15%, symbolic 15%)
- **ExperimentConductor**: Real-time participant guidance
- **DataAnalyst**: Statistical analysis (binomial, t-tests, effect sizes)
- **MetaCoordinator**: Multi-agent orchestration

## Tech Stack

**Frontend**: Next.js 16, TypeScript, Tailwind CSS 4, Zustand 5, React Query 5, Framer Motion 12, Lucid-Evolution (Cardano), Socket.io-client

**Backend**: Express 4, Prisma 6 (PostgreSQL), Socket.io, Midnight Network SDKs, IPFS (Pinata), Ethers.js

**AI**: FastAPI, Uvicorn, OpenAI/Gemini, OpenCLIP, Sentence Transformers, Guardrails-AI

**Blockchain**: Midnight Network (primary), Cardano preprod testnet

## Environment Files

Copy `.env.example` files and configure:
- `backend/.env` - DATABASE_URL, OPENAI_API_KEY, JWT_SECRET, PINATA keys
- `.env.local` - NEXT_PUBLIC_API_URL, NEXT_PUBLIC_BLOCKFROST_API_KEY
- `ai/.env` - LLM_PROVIDER, GEMINI_API_KEY or OPENAI_API_KEY
- `.env.gcp` - GCP deployment config (PROJECT_ID, REGION, DOMAIN)

## Scientific Methodology

### Blockchain Integration Status

**Current Implementation**:
- **Cardano**: Production-ready for commitment anchoring via Blockfrost. Use transaction metadata (label 1967) for immutable timestamps. Enable with `BLOCKFROST_API_KEY`.
- **IPFS/Pinata**: Distributed storage enabled when `PINATA_API_KEY` and `PINATA_API_SECRET` are configured. Falls back to in-memory mock storage in development.
- **Midnight Network**: Planned for future implementation when mainnet launches. Current mock services (`blockchainService.js`, `midnight-client.js`) serve as architectural scaffolding demonstrating the integration pattern.

**Mock Mode Behavior**:
When blockchain credentials are not configured, services operate in mock mode:
- `blockchainService.js`: In-memory experiment storage with simulated tx hashes
- `ipfsService.js`: In-memory Map storage with mock CIDs
- Scientific integrity in mock mode relies on database immutability and server-side controls

### Dual-Mode Architecture

The platform separates engagement mechanics from scientific data collection:

```
┌─────────────────────────────────────────────────────────────┐
│               FRONTEND (Game Mode)                          │
│  - Achievements, leaderboards, streaks, XP                  │
│  - Real-time encouraging feedback                           │
│  - Rewards based on PARTICIPATION, not accuracy             │
└─────────────────────┬───────────────────────────────────────┘
                      │ (Engagement layer decoupled from scoring)
┌─────────────────────▼───────────────────────────────────────┐
│               BACKEND (Scientific Grade)                    │
│  - Blind scoring (no user context passed to AI scorers)     │
│  - Two-tailed statistical tests with corrections            │
│  - Immutable audit trails and versioned AI models           │
│  - Pre-registered analysis pipelines (planned)              │
└─────────────────────────────────────────────────────────────┘
```

### Scoring Architecture

Two separate scores are computed for each experiment:

| Score Type | Purpose | Shown to User | Used for Analysis |
|------------|---------|---------------|-------------------|
| `engagementScore` | Fast, fun feedback for gamification | Yes | No |
| `scientificScore` | Rigorous, blinded analysis | No | Yes |

**Key Principles**:
- Gamification rewards participation (streaks, completion, variety), NOT accuracy
- Scientific scoring is blinded: user ID, experiment history, and identifying context stripped before AI scoring
- AI model versions are logged with each scientific score for reproducibility
- Engagement scores can be encouraging; scientific scores must be rigorous

### Statistical Methods

**Two-Tailed Testing**: Default for all statistical analyses. Tests for both psi-hitting (above chance) and psi-missing (below chance).

**Multiple Comparison Correction**:
- Bonferroni correction: `α_adjusted = α / n_comparisons`
- Benjamini-Hochberg FDR: For controlling false discovery rate

**Baseline Validation**: Chance baselines by experiment type are validated against empirical null distributions.

### Blinding Protocol

For scientific-grade scoring:
1. Strip user ID, wallet address, experiment history before AI scoring
2. Randomize order of predictions in scoring batches
3. Use fixed AI model temperature (0.0) for deterministic outputs
4. Log all scoring decisions with model version and timestamp

### Research Mode (Planned)

Future "Research Mode" will provide:
- No real-time feedback during sessions
- Pre-registered analysis plans with blockchain timestamps
- Mandatory protocol completion
- Publication-ready data export
