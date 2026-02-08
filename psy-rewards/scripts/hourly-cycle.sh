#!/bin/bash
##
# PSY Rewards Hourly Cycle (Preprod Testing)
# 
# Runs every hour on preprod to test full cycle:
# 1. Take snapshot of PSY holders
# 2. Distribute accumulated ADA rewards
# 
# For production, this would run monthly, not hourly.
##

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🦞 PSY Rewards Hourly Cycle - $(date)"
echo "================================================"
echo ""

cd "$PROJECT_DIR"

# Step 1: Take snapshot
echo "📸 STEP 1: Taking PSY holder snapshot..."
echo ""

npm run snapshot -- --network preprod 2>&1 | tee -a logs/hourly-cycle.log

SNAPSHOT_FILE=$(ls -t snapshots/snapshot-*.json 2>/dev/null | head -1)

if [ -z "$SNAPSHOT_FILE" ]; then
  echo "❌ No snapshot file found! Aborting."
  exit 1
fi

echo ""
echo "✅ Snapshot complete: $SNAPSHOT_FILE"
echo ""

# Step 2: Check if there are rewards to distribute
echo "💰 STEP 2: Checking for accumulated rewards..."
echo ""

# TODO: Query reward vault for accumulated ADA
# For now, skip distribution if no rewards
REWARD_POOL_ADA=$(jq -r '.rewardPool // 0' "$SNAPSHOT_FILE" 2>/dev/null || echo "0")

echo "   Reward pool: $REWARD_POOL_ADA ADA"
echo ""

if [ "$REWARD_POOL_ADA" = "0" ] || [ -z "$REWARD_POOL_ADA" ]; then
  echo "⏭️  No rewards to distribute this cycle."
  echo "   (Pool is empty or below minimum threshold)"
  echo ""
  echo "✅ Cycle complete (snapshot only)"
  echo ""
  exit 0
fi

# Step 3: Distribute rewards
echo "📤 STEP 3: Distributing rewards to PSY holders..."
echo ""

npm run distribute -- --snapshot "$SNAPSHOT_FILE" --network preprod 2>&1 | tee -a logs/hourly-cycle.log

echo ""
echo "✅ Distribution complete!"
echo ""

# Step 4: Summary
echo "📊 CYCLE SUMMARY"
echo "================================================"
echo "Timestamp: $(date)"
echo "Snapshot: $(basename "$SNAPSHOT_FILE")"
echo "Holders: $(jq -r '.holders | length' "$SNAPSHOT_FILE")"
echo "Total supply: $(jq -r '.totalSupply' "$SNAPSHOT_FILE") PSY"
echo "Distributed: $REWARD_POOL_ADA ADA"
echo ""
echo "🎉 Hourly cycle complete!"
echo ""
