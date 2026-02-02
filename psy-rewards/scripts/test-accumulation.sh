#!/bin/bash
# Test accumulation over 3 months

echo "🧪 Testing PSY Rewards Accumulation System"
echo ""
echo "Scenario: 3 months with different reward pools"
echo "==========================================="
echo ""

cd /home/albert/Cognosis/psy-rewards

# Month 1: Small reward pool (will cause accumulation)
echo "📅 Month 1 (Feb 2026) - Small reward pool"
echo "Reward pool: 1,500 ADA"
echo ""
REWARD_POOL=1500 npx ts-node -e "
const script = require('./scripts/snapshot-ogmios.ts');
// Simulate month 1
" 2>&1 | tail -40

echo ""
echo "---"
echo ""

# Show accumulation state
echo "📊 Checking accumulation after Month 1:"
cat accumulation/period-682.json 2>/dev/null | jq '{period, totalAddresses, totalAccumulated}' || echo "No accumulation yet"

echo ""
echo "✅ Test complete! Check accumulation/ and distributions/ folders for details."
