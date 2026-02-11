# Cognosis

A privacy-preserving mobile app for psi experiments with blockchain integrity and AI scoring.

## Architecture

- **Frontend**: React Native (Expo) - Cross-platform mobile app
- **Backend**: Node.js + Express - REST API
- **Blockchain**: Ethereum (Sepolia testnet) - Immutable commitments
- **Storage**: IPFS - Encrypted response storage
- **Database**: MongoDB - Metadata and scores
- **AI**: OpenAI + CLIP - Automated scoring

## Setup

1. Run `./install.sh` to set up the environment
2. Configure environment variables in `config/.env`
3. Start MongoDB: `mongod`
4. Start backend: `cd backend && npm run dev`
5. Start AI service: `cd ai && python3 scoring_engine.py`
6. Start frontend: `cd frontend && npx expo start`

## Project Structure

```
Cognosis/
├── frontend/          # React Native mobile app
├── backend/           # Node.js API server
├── blockchain/        # Smart contracts & scripts
├── storage/           # IPFS & encryption modules
├── ai/                # Scoring engine
├── config/            # Environment configuration
├── database/          # DB migrations
└── docs/              # Documentation
```

## Experiment Flow

1. User logs in with wallet (MetaMask)
2. App generates random target & commits hash to blockchain
3. User submits response (text/drawing/voice)
4. Response encrypted & uploaded to IPFS
5. Target revealed after submission
6. AI scores similarity between response and target
7. Results displayed in dashboard

## Security & Privacy

- Client-side AES-256 encryption
- Blockchain precommitment (SHA-256)
- Zero-knowledge proof support
- Differential privacy for aggregated stats

## License

House of Gazer
