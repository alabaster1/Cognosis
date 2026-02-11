# Cognosis Deployment Runbook

**Version**: 2.0.0 - Midnight Integration
**Last Updated**: January 2025

---

## Overview

This runbook provides step-by-step deployment procedures for Cognosis to both testnet-02 and mainnet environments on the Midnight blockchain.

---

## Prerequisites

### Required Tools
- Node.js v18+ and npm
- Midnight CLI (for contract compilation)
- Lace Wallet (browser extension or mobile)
- Git
- PM2 (for process management)
- Docker (optional, for containerized deployment)

### Required Credentials
- Midnight wallet seed phrase (24 words)
- IPFS pinning service API keys (Pinata or Blockfrost)
- OpenAI API key (for AI scoring)
- Server SSH access

### Network Access
- RPC node access: `https://rpc.testnet.midnight.network`
- Indexer access: `https://indexer.testnet.midnight.network`
- Proving server: `https://proving-server.testnet.midnight.network`

---

## Pre-Deployment Checklist

### Testnet Deployment
- [ ] Lace wallet set up with testnet mode enabled
- [ ] tDUST tokens obtained from faucet
- [ ] All environment variables configured in `.env`
- [ ] Compact contract compiled successfully
- [ ] Integration tests passing (7/7)
- [ ] IPFS pinning service configured
- [ ] AI scoring service tested

### Mainnet Deployment
- [ ] **Security audit completed and passed**
- [ ] All testnet testing completed successfully
- [ ] Mainnet wallet funded with DUST tokens
- [ ] `.env.mainnet` reviewed and verified
- [ ] Disaster recovery plan documented
- [ ] Monitoring and alerting configured
- [ ] Team approval obtained
- [ ] Legal/compliance review completed

---

## Testnet-02 Deployment

### Step 1: Environment Setup

```bash
# Clone repository (if not already done)
git clone <repository-url>
cd Cognosis

# Install dependencies
npm install
cd frontend && npm install && cd ..
cd backend/offchain_coordinator && npm install && cd ../..

# Configure environment
cp config/.env.example config/.env
nano config/.env
```

**Required environment variables:**
```env
# Midnight Configuration
MIDNIGHT_NETWORK=testnet-02
MIDNIGHT_NODE_URL=https://rpc.testnet.midnight.network
MIDNIGHT_INDEXER_URL=https://indexer.testnet.midnight.network
MIDNIGHT_PROVING_SERVER_URL=https://proving-server.testnet.midnight.network
MIDNIGHT_CONTRACT_ADDRESS=
MIDNIGHT_WALLET_SEED=<your-24-word-seed>
MIDNIGHT_ENVIRONMENT=testnet

# IPFS Configuration
IPFS_GATEWAY=https://ipfs.io
PINNING_SERVICE=pinata
PINNING_API_KEY=<your-pinata-key>
PINNING_API_SECRET=<your-pinata-secret>

# AI Configuration
OPENAI_API_KEY=<your-openai-key>
OPENAI_MODEL=gpt-4

# Server Configuration
PORT=3001
NODE_ENV=production
```

### Step 2: Lace Wallet Setup

Follow the guide: `docs/LACE_WALLET_SETUP.md`

Key steps:
1. Install Lace extension or mobile app
2. Create new wallet or restore from seed
3. Switch to testnet mode in settings
4. Get tDUST from faucet: `https://faucet.testnet.midnight.network`
5. Verify balance shows tDUST tokens

### Step 3: Compile Smart Contract

```bash
cd blockchain/scripts
./compile-contract.sh
```

**Expected output:**
```
Compiling Compact contract...
✓ Compiled: psi_commit.compact.ts
✓ Output: ../compiled/psi_commit.json
✓ Verification key generated
```

### Step 4: Deploy Contract to Testnet

```bash
./deploy-testnet.sh
```

**Deployment flow:**
1. Confirms environment is set to testnet
2. Connects to Lace wallet
3. Estimates deployment gas
4. Prompts for confirmation
5. Deploys contract
6. Returns contract address

**Expected output:**
```
Deploying to testnet-02...
Contract Address: mid_test1abc123def456...
Transaction Hash: midnight:xyz789...
Block Height: 123456
Gas Used: 245000
```

**Save the contract address!**

### Step 5: Update Configuration

```bash
cd ../../config
nano .env
```

Add the deployed contract address:
```env
MIDNIGHT_CONTRACT_ADDRESS=mid_test1abc123def456...
```

### Step 6: Start Backend Services

```bash
cd ../backend/offchain_coordinator

# Start with PM2
pm2 start index.js --name psiapp-coordinator

# Or start with Node directly
node index.js

# Verify it's running
curl http://localhost:3001/health
```

**Expected health response:**
```json
{
  "status": "healthy",
  "service": "offchain-coordinator",
  "midnight": {
    "initialized": true,
    "network": "testnet-02"
  },
  "uptime": "0.5 hours",
  "timestamp": "2025-01-03T12:00:00.000Z"
}
```

### Step 7: Run Integration Tests

```bash
cd ../../scripts
./run_poc.sh
```

**Expected output:**
```
Running Cognosis Integration Tests...

Test 1: IPFS Upload ✓
Test 2: Commitment Creation ✓
Test 3: Blockchain Commit ✓
Test 4: Reveal Window Verification ✓
Test 5: Commitment Reveal ✓
Test 6: AI Scoring ✓
Test 7: Full Flow ✓

All tests passed! (7/7)
```

### Step 8: Deploy Frontend

```bash
cd ../frontend

# For Expo development
npm start

# For production build (iOS)
eas build --platform ios --profile production

# For production build (Android)
eas build --platform android --profile production
```

### Step 9: Monitor Deployment

```bash
# Check logs
pm2 logs psiapp-coordinator

# Check metrics
curl http://localhost:3001/metrics

# Check for alerts
curl http://localhost:3001/health
```

---

## Mainnet Deployment

⚠️ **WARNING: Mainnet deployment is irreversible and uses real funds!**

### Pre-Deployment Validation

```bash
# Run complete test suite on testnet
cd scripts
./run_full_tests.sh

# Verify all tests pass
# Check error rates are < 1%
# Validate gas optimization is working
# Ensure monitoring is operational
```

### Mainnet Deployment Steps

```bash
cd blockchain/scripts
./deploy-mainnet.sh
```

**This script will:**
1. Show extensive safety warnings
2. Require checklist completion confirmation
3. Verify wallet has sufficient DUST
4. Estimate deployment cost
5. Require typed confirmation: "DEPLOY TO MAINNET"
6. Deploy contract
7. Verify deployment
8. Output contract address

### Post-Deployment

```bash
# Update mainnet configuration
cp config/.env.mainnet config/.env
nano config/.env
# Add: MIDNIGHT_CONTRACT_ADDRESS=<mainnet-address>

# Restart services
pm2 restart psiapp-coordinator

# Monitor closely for 24 hours
pm2 logs psiapp-coordinator --lines 1000
```

---

## Rollback Procedures

### If Testnet Deployment Fails

```bash
# 1. Stop coordinator
pm2 stop psiapp-coordinator

# 2. Revert environment
git checkout config/.env

# 3. Clear contract address
nano config/.env
# Set: MIDNIGHT_CONTRACT_ADDRESS=

# 4. Restart in mock mode
pm2 restart psiapp-coordinator

# 5. Investigate logs
pm2 logs psiapp-coordinator
```

### If Mainnet Deployment Fails

⚠️ **Smart contracts cannot be rolled back once deployed!**

**Mitigation strategies:**
1. Deploy a new fixed version
2. Update frontend to use new contract
3. Migrate data if possible
4. Communicate with users

**Prevention is key:** Always test thoroughly on testnet first!

---

## Monitoring & Alerting

### Key Metrics to Monitor

**Health endpoint:** `GET /health`
```json
{
  "status": "healthy|degraded|unhealthy",
  "issues": [],
  "uptime": "24.5 hours"
}
```

**Metrics endpoint:** `GET /metrics`
```json
{
  "commits": {
    "total": 1000,
    "successful": 980,
    "failed": 20
  },
  "reveals": {
    "total": 950,
    "successful": 940,
    "failed": 10
  },
  "errorRates": {
    "commits": "0.020",
    "reveals": "0.011"
  },
  "recentErrors": [...],
  "activeAlerts": [...]
}
```

### Alert Conditions

**Critical Alerts:**
- Error rate > 10%
- Network connectivity lost
- Wallet balance < 100 DUST
- Proving server unreachable

**Warning Alerts:**
- Error rate > 5%
- Response time > 5 seconds
- Gas price spike > 2x normal

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Memory and CPU usage
pm2 status

# Restart on high memory usage
pm2 set pm2-auto-restart max_memory_restart 1G
```

---

## Troubleshooting

### "Midnight Client in MOCK MODE"

**Cause:** `MIDNIGHT_CONTRACT_ADDRESS` is empty
**Fix:** Add contract address to `.env` after deployment

### "Wallet initialization failed"

**Cause:** Incorrect seed phrase or network mismatch
**Fix:**
```bash
# Verify seed phrase is correct (24 words)
# Verify network matches wallet (testnet vs mainnet)
nano config/.env
# Correct MIDNIGHT_WALLET_SEED
pm2 restart psiapp-coordinator
```

### "Insufficient funds"

**Cause:** Wallet out of tDUST/DUST
**Fix:**
- Testnet: Get tDUST from faucet
- Mainnet: Purchase DUST and transfer to wallet

### "Contract not found"

**Cause:** Wrong network or contract address
**Fix:**
```bash
# Verify contract address matches network
# Check blockchain explorer
# Redeploy if necessary
```

### "Transaction timeout"

**Cause:** Network congestion or gas too low
**Fix:**
- Retry transaction
- Gas optimization is automatic (20% margin)
- Check network status

### High Error Rate

**Investigation steps:**
```bash
# 1. Check metrics
curl http://localhost:3001/metrics

# 2. Review recent errors
pm2 logs psiapp-coordinator | grep ERROR

# 3. Check network status
curl https://rpc.testnet.midnight.network/health

# 4. Verify IPFS is working
curl https://ipfs.io/ipfs/QmTest

# 5. Test AI scoring
curl -X POST http://localhost:3001/api/score \
  -H "Content-Type: application/json" \
  -d '{"response": "test", "target": "test"}'
```

---

## Disaster Recovery

### Database Backup

```bash
# Backup commitment store (if using database)
pg_dump psiapp > backup_$(date +%Y%m%d).sql

# Or backup JSON files
tar -czf backup.tar.gz data/
```

### Contract Migration

If contract needs replacement:
1. Deploy new contract to same network
2. Update `MIDNIGHT_CONTRACT_ADDRESS`
3. Restart services
4. Update frontend to use new contract
5. Communicate to users

### Service Recovery

```bash
# Full service restart
pm2 restart all

# If PM2 corrupted
pm2 kill
pm2 start ecosystem.config.js

# Nuclear option - full reinstall
npm install
pm2 reload all
```

---

## Performance Optimization

### Gas Optimization

Already implemented in `midnight-client.js`:
- 20% safety margin on gas limit
- 10% buffer on max fee per gas
- Automatic base fee detection
- Fallback to safe defaults

### Response Time Optimization

```bash
# Enable HTTP/2
# Use connection pooling
# Cache blockchain queries (5 minute TTL)
# Use CDN for IPFS gateway
```

### Scaling

**Horizontal scaling:**
```bash
# Run multiple coordinator instances
pm2 start index.js -i 4  # 4 instances

# Use load balancer (nginx)
# Configure sticky sessions for WebSocket
```

---

## Compliance & Security

### Security Best Practices

- [ ] Wallet seed phrase stored in encrypted vault
- [ ] API keys rotated every 90 days
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Dependency security audits (npm audit)

### Audit Trail

All transactions logged with:
- Timestamp
- User wallet address
- Transaction hash
- Gas used
- Success/failure status

### GDPR Compliance

- User data encrypted at rest
- Right to erasure implemented
- Data retention policy: 1 year
- Privacy policy updated

---

## Maintenance Schedule

### Daily
- [ ] Check health endpoint
- [ ] Review error logs
- [ ] Verify wallet balance

### Weekly
- [ ] Review metrics dashboard
- [ ] Check for dependency updates
- [ ] Backup data

### Monthly
- [ ] Security audit
- [ ] Performance review
- [ ] Gas optimization review
- [ ] Update documentation

---

## Support & Escalation

### On-Call Rotation
- Primary: DevOps Engineer
- Secondary: Backend Engineer
- Escalation: CTO

### Contact Information
- Slack: #psiapp-ops
- PagerDuty: psiapp-alerts
- Email: ops@psiapp.com

### External Support
- Midnight Discord: https://discord.gg/midnight
- Midnight Support: support@midnight.network
- Lace Support: https://www.lace.io/support

---

## Appendix

### Useful Commands

```bash
# Check contract on blockchain explorer
open https://explorer.testnet.midnight.network/address/<contract-address>

# Test commit endpoint
curl -X POST http://localhost:3001/api/commit \
  -H "Content-Type: application/json" \
  -d @test_commit.json

# Check IPFS pinning
curl https://api.pinata.cloud/data/pinList \
  -H "Authorization: Bearer $PINNING_API_KEY"

# Monitor network gas prices
curl https://rpc.testnet.midnight.network/gas/price
```

### Environment Variable Reference

See `config/.env.example` for complete list with descriptions.

### Version History

- v2.0.0 - Midnight blockchain integration
- v1.5.0 - IPFS pinning service added
- v1.0.0 - Initial release (mock mode)

---

**End of Runbook**

For questions or updates, contact the development team.
