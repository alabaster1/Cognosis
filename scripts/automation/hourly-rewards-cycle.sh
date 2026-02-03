#!/bin/bash
###
# Cognosis Hourly Rewards Cycle (Preprod Testing)
# 
# Runs both systems every hour:
# 1. Lottery drawing (if frequency elapsed)
# 2. PSY snapshot + distribution
# 
# Usage:
#   ./hourly-rewards-cycle.sh
# 
# Setup cron (runs every hour):
#   0 * * * * /home/albert/Cognosis/scripts/automation/hourly-rewards-cycle.sh >> /home/albert/Cognosis/logs/hourly-cycle.log 2>&1
###

set -e

PROJECT_DIR="/home/albert/Cognosis"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/hourly-cycle-$(date +%Y-%m-%d).log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Redirect all output to log file
exec >> "$LOG_FILE" 2>&1

echo ""
echo "========================================"
echo "🦞 Cognosis Hourly Rewards Cycle"
echo "Started: $(date)"
echo "========================================"
echo ""

cd "$PROJECT_DIR"

# Load environment variables
if [ -f "$PROJECT_DIR/.env.local" ]; then
  export $(grep -v '^#' "$PROJECT_DIR/.env.local" | xargs)
fi

###
# PART 1: Lottery Drawing
###

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎰 PART 1: Lottery Drawing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PROJECT_DIR/scripts/cardano"

if ! npx ts-node trigger-lottery-draw.ts; then
  echo ""
  echo "⚠️  Lottery drawing failed or not ready"
  echo "   This is OK if:"
  echo "   - Drawing frequency hasn't elapsed yet"
  echo "   - No participants this cycle"
  echo "   - Lottery pool not initialized"
  echo ""
else
  echo ""
  echo "✅ Lottery drawing complete"
  echo ""
fi

###
# PART 2: PSY Snapshot + Distribution
###

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💰 PART 2: PSY Snapshot + Distribution"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$PROJECT_DIR/psy-rewards"

if ! bash scripts/hourly-cycle.sh; then
  echo ""
  echo "⚠️  PSY rewards cycle failed"
  echo "   Check logs above for details"
  echo ""
else
  echo ""
  echo "✅ PSY rewards cycle complete"
  echo ""
fi

###
# Summary
###

echo ""
echo "========================================"
echo "✅ Hourly Rewards Cycle Complete"
echo "Finished: $(date)"
echo "========================================"
echo ""
echo "Next cycle: $(date -d '+1 hour')"
echo ""
