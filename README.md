# Cognosis Web - Privacy-Preserving Psi Research Platform

A Next.js web application for conducting verified psi experiments with blockchain integrity and AI-powered analysis.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## ✨ Features

- **10 Experiment Types**: Remote Viewing, Precognition, Telepathy, Dream Journal, Synchronicity, Intuition, Psychokinesis, Retrocausality, Multi-Party Telepathy, Global Consciousness
- **Blockchain Verified**: Cryptographic commitments on Midnight Network
- **Privacy-Preserving**: Zero-knowledge architecture with client-side encryption
- **AI-Powered Scoring**: Semantic analysis using OpenAI GPT-4
- **Decentralized Storage**: IPFS/Pinata for permanent experiment records

## 🛠️ Tech Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Midnight Network SDK, IPFS/Pinata
- Zustand, TanStack React Query, Framer Motion
- AES-256-GCM Encryption

## ⚙️ Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_MIDNIGHT_NETWORK=testnet
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_PINATA_API_KEY=your_key
NEXT_PUBLIC_PINATA_API_SECRET=your_secret
NEXT_PUBLIC_IPFS_GATEWAY=https://gateway.pinata.cloud
NEXT_PUBLIC_APP_URL=http://localhost:4000
```

## 📁 Project Structure

```
web/
├── src/
│   ├── app/              # Next.js pages
│   ├── components/       # React components
│   ├── services/         # API & blockchain services
│   ├── store/            # Zustand state
│   └── types/            # TypeScript types
```

## 🔐 Security

### Commit-Reveal Protocol
1. User makes prediction → encrypt with random key
2. Generate commitment: `H(H(prediction:nonce))`
3. Upload encrypted data to IPFS
4. Submit commitment hash to blockchain
5. After target date: reveal & verify with AI scoring

## 🧪 Available Experiments

1. **Remote Viewing** - Describe distant locations
2. **Precognition** - Predict future events
3. **Telepathy** - Receive transmitted thoughts
4. **Dream Journal** - Analyze precognitive dreams
5. **Synchronicity** - Track meaningful coincidences
6. **Intuition Testing** - Test intuitive decisions
7. **Psychokinesis** - Influence physical systems
8. **Retrocausality** - Test backward causation
9. **Multi-Party Telepathy** - Group telepathy
10. **Global Consciousness** - Global event participation

## 🚀 Development

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm start         # Start production server
npm run lint      # Run linter
```

## 📚 Documentation

- [Architecture Overview](../ARCHITECTURE.md)
- [Experiment Types](../Experiments.md)
- [Smart Contracts](../PHASE_3_SMART_CONTRACTS_AI_SCORING.md)
- [Backend API](../backend/README.md)

## 🚢 Deployment

### Vercel (Recommended)
```bash
vercel
```

### Docker
```bash
docker build -t Cognosis-web .
docker run -p 3000:3000 Cognosis-web
```

## 🎯 Roadmap

- [x] Foundation & Core Services
- [x] UI/UX & Onboarding
- [x] Remote Viewing Experiment
- [ ] All 10 Experiment Types
- [ ] Dashboard & History
- [ ] AI Scoring Integration
- [ ] Multi-party Experiments
- [ ] Production Deployment

---

Built with privacy, integrity, and scientific rigor.
