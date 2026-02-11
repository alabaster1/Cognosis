# 🧠 AI Pipeline Integration Roadmap

## Overview

This roadmap integrates the AI Pipeline specification with the existing Midnight blockchain architecture to create a complete privacy-preserving psi experiment platform.

**Current Status:** ✅ Phase 1 MVP Complete (Basic Midnight Integration)
**Next Target:** Phase 1+ (Enhanced AI Scoring with Privacy)

---

## Architecture Alignment

### What We Have ✅

| Component | Current Implementation | AI Pipeline Requirement |
|-----------|----------------------|------------------------|
| **Frontend** | React Native + usePsiTrial hook | ✅ Text input ready, drawing/voice pending |
| **Encryption** | AES-256-GCM client-side | ✅ Matches spec |
| **Precommitment** | SHA-256 hash on Midnight | ✅ Matches spec |
| **Wallet** | Device key generation | ⚠️ Need Midnight wallet integration |
| **Backend** | Off-chain coordinator | ✅ Response receiver ready |
| **IPFS** | Production helper (Pinata/Blockfrost) | ✅ Encrypted upload ready |
| **AI Scoring** | OpenAI embeddings + CLIP | ✅ Basic scoring, needs enhancement |
| **Blockchain** | Midnight Compact contract | ✅ Commitment storage ready |
| **Privacy** | Optional DP, ZK placeholders | ⚠️ Need full implementation |

### What We Need 🔨

1. **AI Scoring Layer Enhancements**
   - Decryption sandbox
   - Vector similarity search (FAISS/Milvus)
   - Specialized psi scoring models
   - Anomaly detection

2. **Privacy Infrastructure**
   - Real ZK proof generation
   - Differential privacy aggregation
   - Verifiable randomness

3. **New Experiment Types**
   - Drawing input (canvas)
   - Voice recording
   - Dream logging
   - Telepathy pairs

4. **Dashboards**
   - Personal stats (basic exists)
   - Research aggregation
   - Anomaly visualization

---

## Phase Breakdown

## 📍 Phase 1: MVP (Current) ✅

**Status:** COMPLETE
**Completion Date:** January 2, 2025

### Delivered Components

✅ **Frontend**
- React Native app with Expo
- Text input for responses
- Wallet authentication (device key)
- Client-side encryption

✅ **Backend**
- Off-chain coordinator API
- IPFS upload helper
- Target precommitment service
- Basic AI scoring (OpenAI)

✅ **Blockchain**
- Midnight Compact contract
- Commit/reveal protocol
- Hash storage on-chain

✅ **Testing**
- Integration test suite
- 7/7 tests passing
- CI/CD pipeline

### Gaps from AI Pipeline Spec

❌ Drawing/voice input
❌ Decryption sandbox
❌ Vector similarity search
❌ Real ZK proofs
❌ Differential privacy implementation

---

## 📍 Phase 1+ (Enhanced MVP) 🔨

**Target:** Q1 2025 (4-6 weeks)
**Goal:** Enhance AI scoring with privacy features

### Milestone 1.1: Decryption Sandbox (Week 1-2)

**Objective:** Isolate decryption/scoring in secure environment

#### Tasks

**1.1.1 Create Isolated Scoring Service**
```
File: ai/sandbox/scoring_sandbox.py
- Separate process for decryption
- Encrypted memory (if possible)
- Auto-wipe after scoring
- Audit logging
```

**1.1.2 Implement Secure Key Management**
```
File: backend/services/keyManagementService.js
- Ephemeral key retrieval from Midnight
- Time-limited decryption access
- Key destruction after use
```

**1.1.3 Update Off-Chain Coordinator**
```
File: backend/offchain_coordinator/index.js
- Add POST /api/score/secure endpoint
- Pass CID + temporary decrypt token
- Never log raw responses
```

**Acceptance Criteria:**
- [ ] Scoring service runs in separate process
- [ ] Decrypted data never persists to disk
- [ ] Audit trail for all decryption events
- [ ] Integration test passes

**Estimated Effort:** 10-15 hours

---

### Milestone 1.2: Vector Similarity Search (Week 2-3)

**Objective:** Replace basic text matching with semantic similarity

#### Tasks

**1.2.1 Set Up Vector Database**
```
File: ai/vector_db/faiss_index.py
- Initialize FAISS index
- Store target embeddings
- Efficient similarity search
```

**1.2.2 Implement Embedding Pipeline**
```
File: ai/embeddings/embedding_service.py
Options:
  A) OpenAI text-embedding-3-large (fast, paid)
  B) Instructor-XL (open source, self-hosted)
  C) BGE-large (multilingual, open source)

Deliverable:
- Unified embedding interface
- Batch embedding support
- Caching layer
```

**1.2.3 Enhanced Scoring Logic**
```
File: ai/scoring/advanced_scorer.py
- Cosine similarity scoring
- Semantic overlap analysis
- Confidence intervals
- Anomaly detection (statistical)
```

**1.2.4 Update Scoring Engine**
```
File: ai/scoring_engine.py
- Add POST /api/score/semantic endpoint
- Return similarity metrics
- Include confidence scores
```

**Acceptance Criteria:**
- [ ] Vector search returns results <100ms
- [ ] Similarity scores correlate with human judgment (validation set)
- [ ] Handles 1000+ target embeddings efficiently
- [ ] Unit tests for embedding/search

**Estimated Effort:** 15-20 hours

---

### Milestone 1.3: Specialized Psi Scoring (Week 3-4)

**Objective:** Add domain-specific scoring for psi experiments

#### Tasks

**1.3.1 Symbolic/Archetype Matching**
```
File: ai/scoring/symbolic_scorer.py
- Use GPT-4 for symbolic interpretation
- Match archetypal patterns (Jung, Campbell)
- Dream symbol dictionary
- Metaphor extraction
```

**1.3.2 Image-Text Hybrid Scoring**
```
File: ai/scoring/clip_scorer.py
- Use CLIP for image-text matching
- Visual similarity metrics
- Color/shape analysis
```

**1.3.3 Temporal Anomaly Detection**
```
File: ai/scoring/anomaly_detector.py
- Statistical deviation from chance
- Time-series analysis
- Retrocausal correlation detection
```

**1.3.4 Composite Scoring Model**
```
File: ai/scoring/composite_scorer.py
- Weighted ensemble of scorers:
  * Semantic similarity: 40%
  * Symbolic matching: 30%
  * Visual similarity: 20%
  * Anomaly bonus: 10%
- Tunable weights per experiment type
```

**Acceptance Criteria:**
- [ ] Symbolic scorer identifies key archetypes
- [ ] CLIP scorer handles remote viewing images
- [ ] Anomaly detector flags >2σ deviations
- [ ] Composite scores validated against test set

**Estimated Effort:** 20-25 hours

---

### Milestone 1.4: Privacy Infrastructure (Week 4-5)

**Objective:** Implement real privacy-preserving features

#### Tasks

**1.4.1 Real ZK Proof Generation**
```
File: blockchain/provers/zkp_generator.js
- Connect to Midnight prover service
- Implement fairness proof circuit
- Generate randomness attestation
- Verify proofs on-chain
```

**1.4.2 Differential Privacy Aggregation**
```
File: ai/privacy/dp_aggregator.py
- Implement Laplace mechanism
- Implement Gaussian mechanism
- Privacy budget tracking (ε, δ)
- Aggregate stats with DP noise
```

**1.4.3 Privacy Dashboard**
```
File: backend/routes/privacy.js
- GET /api/privacy/budget - Check user's privacy budget
- POST /api/privacy/opt-in - Enable DP for user
- GET /api/privacy/aggregate - DP-protected global stats
```

**1.4.4 Update Compact Contract**
```
File: blockchain/compact/psi_commit.compact.ts
- Add verifyFairnessProof() method
- Store ZK proof hashes
- Emit proof verification events
```

**Acceptance Criteria:**
- [ ] ZK proofs verify on Midnight testnet
- [ ] DP aggregation produces consistent noise
- [ ] Privacy budget depletes correctly
- [ ] Contract accepts and verifies proofs

**Estimated Effort:** 25-30 hours

---

### Milestone 1.5: Dashboard Enhancements (Week 5-6)

**Objective:** Build comprehensive user and research dashboards

#### Tasks

**1.5.1 Personal Dashboard Upgrade**
```
File: frontend/src/screens/DashboardScreen.js
- Add accuracy by experiment type chart
- Show symbolic insights (dream interpretations)
- Display anomaly flags
- Temporal performance trends
```

**1.5.2 Research Dashboard (New)**
```
File: frontend/src/screens/ResearchDashboardScreen.js
- Aggregate accuracy across all users (DP)
- Global anomaly heatmap
- Time-displacement clusters
- Statistical significance tests
```

**1.5.3 Backend Analytics Service**
```
File: backend/services/analyticsService.js
- Aggregate user scores (with DP)
- Detect global anomalies
- Compute statistical significance
- Cache results for performance
```

**Acceptance Criteria:**
- [ ] Personal dashboard shows detailed insights
- [ ] Research dashboard displays DP-protected aggregates
- [ ] Charts update in real-time
- [ ] Statistical tests implemented correctly

**Estimated Effort:** 15-20 hours

---

## Phase 1+ Summary

**Total Estimated Effort:** 85-110 hours (4-6 weeks for 1 developer)

**Key Deliverables:**
- ✅ Decryption sandbox
- ✅ Vector similarity search
- ✅ Specialized psi scoring
- ✅ Real ZK proofs
- ✅ Differential privacy
- ✅ Enhanced dashboards

**Risk Mitigation:**
- OpenAI API for embeddings initially (switch to open source later)
- Start with GPT-4 for symbolic scoring (fine-tune later)
- Use Midnight testnet (avoid mainnet costs)

---

## 📍 Phase 2: Privacy Reinforcement 🔒

**Target:** Q2 2025 (6-8 weeks)
**Goal:** Full privacy features + open source AI

### Key Objectives

1. **Transition to Open-Source Embeddings**
   - Deploy Instructor-XL locally
   - Benchmark against OpenAI
   - Migrate all embedding generation

2. **Advanced ZK Proof Circuits**
   - Score correctness proofs
   - DP attestation proofs
   - Verifiable randomness

3. **Full Differential Privacy Suite**
   - Per-user DP budget management
   - Composition theorems
   - Privacy audit trails

4. **Drawing & Voice Input**
   - Canvas drawing capture
   - Voice recording + transcription
   - Multimodal scoring

### Milestones

**2.1 Open-Source Embedding Migration (2 weeks)**
- Set up Instructor-XL inference server
- Benchmark performance vs OpenAI
- Migrate scoring pipeline

**2.2 Advanced ZK Circuits (2 weeks)**
- Implement score correctness circuit
- Add DP attestation circuit
- Deploy to Midnight prover

**2.3 DP Infrastructure (2 weeks)**
- Privacy budget manager
- Composition tracking
- Audit dashboard

**2.4 Multimodal Input (2 weeks)**
- Drawing canvas component
- Voice recording component
- Multimodal scoring pipeline

**Estimated Effort:** 160-200 hours

---

## 📍 Phase 3: Full AI Autonomy 🤖

**Target:** Q3-Q4 2025 (12+ weeks)
**Goal:** Custom models + all experiment types

### Key Objectives

1. **Fine-Tuned Psi Scoring Model**
   - Collect labeled dataset (10k+ examples)
   - Fine-tune LLaMA-3 or Mistral
   - Deploy privately hosted
   - Validate against human scorers

2. **New Experiment Types**
   - **Premonition**: Predict future random events
   - **Dream Logging**: Correlate dreams with events
   - **Telepathy Pairs**: Sender-receiver experiments
   - **Retrocausal**: Time-displaced correlations

3. **Verifiable On-Chain Randomness**
   - Integrate Midnight VRF
   - Verifiable shuffle protocols
   - Commitment-reveal with timing proofs

4. **Advanced Analytics**
   - Bayesian inference for psi effects
   - Meta-analysis across experiments
   - Synchronicity detection
   - Global consciousness correlations

### Milestones

**3.1 Dataset Collection & Model Training (4 weeks)**
**3.2 New Experiment Types (4 weeks)**
**3.3 Verifiable Randomness (2 weeks)**
**3.4 Advanced Analytics (2 weeks)**

**Estimated Effort:** 320-400 hours

---

## Technical Decisions & Trade-offs

### AI Model Selection

| Model | Pros | Cons | Recommendation |
|-------|------|------|----------------|
| **OpenAI API** | Fast, high quality, easy | Paid, privacy concerns | Phase 1+ |
| **Instructor-XL** | Open source, good quality | Self-hosting cost | Phase 2 |
| **LLaMA-3** | Best quality, customizable | Training cost, GPU needed | Phase 3 |

**Decision:** Start OpenAI → Migrate Instructor-XL → Fine-tune LLaMA-3

### Vector Database

| Database | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **FAISS** | Fast, in-memory | No persistence | Phase 1+ (prototype) |
| **Milvus** | Scalable, persistent | Complex setup | Phase 2 (production) |
| **Weaviate** | Full-featured | Heavyweight | Phase 3 (enterprise) |

**Decision:** FAISS → Milvus → Consider Weaviate

### ZK Proof Strategy

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Off-chain scoring** | Fast, cheap | Trust required | Phase 1+ |
| **ZK score attestation** | Verifiable, balanced | Moderate cost | Phase 2 |
| **Fully on-chain scoring** | Maximum trust | Slow, expensive | Future research |

**Decision:** Off-chain with ZK attestation (Phase 2)

---

## Open Questions & Resolutions

### 1. Should AI scoring be fully on-chain ZK verified?

**Resolution:** Hybrid approach
- Scoring happens off-chain (fast, cheap)
- ZK proof attests to correct scoring process
- Proof verified on-chain (trustless)
- Balance cost/speed/trust

### 2. How to balance dream/symbolic analysis with statistical psi scoring?

**Resolution:** Composite scoring model
- Multiple specialized scorers
- Weighted ensemble (tunable per experiment)
- Dream experiments: 60% symbolic, 40% statistical
- Remote viewing: 40% semantic, 40% visual, 20% symbolic

### 3. What size GPT model for on-device inference?

**Resolution:** Server-side for now, on-device later
- Phase 1-2: Server-side (OpenAI/hosted)
- Phase 3: Quantized LLaMA-3 (8B params)
- Future: Distilled model for on-device (<1B params)

---

## Implementation Priorities

### High Priority (Phase 1+)
1. ✅ Decryption sandbox
2. ✅ Vector similarity search
3. ✅ Real ZK proofs
4. ✅ Differential privacy

### Medium Priority (Phase 2)
5. Open-source embeddings
6. Drawing/voice input
7. Advanced DP infrastructure
8. Enhanced dashboards

### Lower Priority (Phase 3)
9. Fine-tuned models
10. New experiment types
11. Verifiable randomness
12. Advanced analytics

---

## Dependencies & Prerequisites

### External Services
- [ ] Midnight testnet account + API key
- [ ] IPFS pinning service (Pinata/Blockfrost)
- [ ] OpenAI API key (Phase 1+)
- [ ] GPU server for embeddings (Phase 2)

### Technical Requirements
- [ ] Node.js 20+
- [ ] Python 3.9+
- [ ] PostgreSQL/MongoDB (metadata)
- [ ] Redis (caching)
- [ ] Docker (containerization)

### Team Skills
- [ ] TypeScript/JavaScript
- [ ] Python + ML frameworks
- [ ] Cryptography (ZK, DP)
- [ ] React Native
- [ ] Blockchain (Midnight)

---

## Success Metrics

### Phase 1+ Targets
- **AI Accuracy:** >60% match rate (vs 25% baseline)
- **Privacy Budget:** ε < 1.0 for aggregates
- **Performance:** Scoring <2 seconds
- **Uptime:** 99.5% coordinator availability

### Phase 2 Targets
- **AI Accuracy:** >70% match rate
- **Privacy Budget:** ε < 0.5 for aggregates
- **Open Source:** 100% embedding/scoring
- **Multimodal:** Drawing + voice supported

### Phase 3 Targets
- **AI Accuracy:** >80% match rate
- **Experiment Types:** 5+ types deployed
- **Research Users:** 100+ researchers using platform
- **Statistical Significance:** p < 0.05 for psi effects

---

## Timeline Overview

```
2025 Q1: Phase 1+ (Enhanced MVP)
├─ Week 1-2: Decryption sandbox
├─ Week 2-3: Vector similarity
├─ Week 3-4: Specialized scoring
├─ Week 4-5: Privacy infrastructure
└─ Week 5-6: Dashboard enhancements

2025 Q2: Phase 2 (Privacy Reinforcement)
├─ Week 1-2: Open-source embeddings
├─ Week 3-4: Advanced ZK circuits
├─ Week 5-6: DP infrastructure
└─ Week 7-8: Multimodal input

2025 Q3-Q4: Phase 3 (Full AI Autonomy)
├─ Month 1: Dataset + training
├─ Month 2: New experiment types
├─ Month 3: Advanced analytics
└─ Month 4: Production hardening
```

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| OpenAI API cost overrun | Medium | High | Budget cap, migrate to open source |
| ZK proof complexity | High | High | Start simple, iterate |
| Midnight SDK delays | Medium | Medium | Use mocks, parallel development |
| GPU infrastructure cost | Medium | High | Start cloud, optimize later |
| Privacy regulation changes | Low | High | Legal review, DP by default |

---

## Next Immediate Steps

### Week 1 Actions (This Week)

1. **Set up development environment for Phase 1+**
   ```bash
   # Install FAISS
   pip install faiss-cpu numpy

   # Install additional deps
   npm install --save redis ioredis
   ```

2. **Create Phase 1+ directory structure**
   ```bash
   mkdir -p ai/sandbox
   mkdir -p ai/vector_db
   mkdir -p ai/embeddings
   mkdir -p ai/scoring
   mkdir -p ai/privacy
   ```

3. **Implement Milestone 1.1: Decryption Sandbox**
   - Start with `ai/sandbox/scoring_sandbox.py`
   - Test isolated process execution
   - Verify memory isolation

4. **Update project documentation**
   - Add this roadmap to docs/
   - Update README with Phase 1+ goals
   - Create CONTRIBUTING.md

---

## Resources & References

- [Midnight Documentation](https://docs.midnight.network)
- [FAISS Documentation](https://faiss.ai)
- [Instructor-XL Model](https://huggingface.co/hkunlp/instructor-xl)
- [Differential Privacy Book](https://www.cis.upenn.edu/~aaroth/Papers/privacybook.pdf)
- [ZK-SNARK Tutorial](https://z.cash/technology/zksnarks/)

---

**Roadmap Version:** 1.0
**Last Updated:** January 2, 2025
**Status:** Ready for Phase 1+ Implementation 🚀
