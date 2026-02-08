#!/bin/bash
###
# Setup Hourly Cron Job for Cognosis Rewards
# 
# Installs cron job that runs:
# - Lottery drawing (every hour)
# - PSY snapshot + distribution (every hour)
# 
# Usage:
#   ./setup-hourly-cron.sh
###

set -e

PROJECT_DIR="/home/albert/Cognosis"
CRON_SCRIPT="$PROJECT_DIR/scripts/automation/hourly-rewards-cycle.sh"
LOG_DIR="$PROJECT_DIR/logs"

echo "🦞 Cognosis Hourly Rewards Cron Setup"
echo ""

# Ensure script is executable
chmod +x "$CRON_SCRIPT"
chmod +x "$PROJECT_DIR/psy-rewards/scripts/hourly-cycle.sh"

echo "✅ Made scripts executable"
echo ""

# Create log directory
mkdir -p "$LOG_DIR"
echo "✅ Created log directory: $LOG_DIR"
echo ""

# Build cron line (runs every hour at :00)
CRON_LINE="0 * * * * $CRON_SCRIPT >> $LOG_DIR/cron.log 2>&1"

echo "📝 Cron job to install:"
echo "   $CRON_LINE"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "hourly-rewards-cycle.sh"; then
  echo "⚠️  Cron job already exists!"
  echo ""
  echo "Current crontab:"
  crontab -l | grep "hourly-rewards-cycle"
  echo ""
  read -p "Replace existing cron job? (y/n) " -n 1 -r
  echo ""
  
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
  fi
  
  # Remove old cron job
  crontab -l | grep -v "hourly-rewards-cycle.sh" | crontab -
  echo "✅ Removed old cron job"
fi

# Install new cron job
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo ""
echo "✅ Cron job installed!"
echo ""
echo "📊 Verification:"
echo ""
crontab -l | grep "hourly-rewards-cycle"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "The rewards cycle will run every hour at :00"
echo "Next run: $(date -d 'next hour' '+%Y-%m-%d %H:00:00')"
echo ""
echo "📋 To view logs:"
echo "   tail -f $LOG_DIR/hourly-cycle-\$(date +%Y-%m-%d).log"
echo ""
echo "To remove cron job:"
echo "   crontab -e"
echo "   (delete the line with 'hourly-rewards-cycle.sh')"
echo ""
