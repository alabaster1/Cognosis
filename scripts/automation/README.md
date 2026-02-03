# Cognosis Hourly Rewards Automation (Preprod Testing)

**Purpose:** Automate lottery drawings and PSY snapshot/distributions for rapid testing on preprod testnet.

**⚠️ PREPROD ONLY:** These hourly cycles are for testing. Production will run:
- Lottery: Weekly
- PSY snapshots: Monthly

---

## What Gets Automated

### 1. Lottery Drawing (Every Hour)
- Checks if drawing frequency (1 hour) has elapsed
- Queries lottery participants
- Calculates weighted tickets
- Selects winner via random selection
- Distributes prize pool
- Resets lottery for next cycle

**Script:** `../cardano/trigger-lottery-draw.ts`

### 2. PSY Snapshot + Distribution (Every Hour)
- Takes snapshot of all PSY holders
- Queries accumulated reward pool
- Distributes ADA proportionally to holders
- Saves snapshot history

**Script:** `../../psy-rewards/scripts/hourly-cycle.sh`

---

## Quick Start

### Step 1: Make Scripts Executable

```bash
cd ~/Cognosis/scripts/automation
chmod +x *.sh
```

### Step 2: Install Hourly Cron Job

```bash
./setup-hourly-cron.sh
```

This installs a cron job that runs every hour at :00.

### Step 3: Verify Cron Job

```bash
crontab -l | grep hourly-rewards
```

Should show:
```
0 * * * * /home/albert/Cognosis/scripts/automation/hourly-rewards-cycle.sh >> /home/albert/Cognosis/logs/cron.log 2>&1
```

---

## Manual Testing

### Run Full Cycle Manually

```bash
cd ~/Cognosis/scripts/automation
./hourly-rewards-cycle.sh
```

### Run Lottery Drawing Only

```bash
cd ~/Cognosis/scripts/cardano
npx ts-node trigger-lottery-draw.ts
```

### Run PSY Snapshot Only

```bash
cd ~/Cognosis/psy-rewards
npm run snapshot -- --network preprod
```

### Run PSY Distribution Only

```bash
cd ~/Cognosis/psy-rewards
npm run distribute -- --snapshot snapshots/snapshot-2026-02-03.json
```

---

## Monitoring

### View Today's Logs

```bash
tail -f ~/Cognosis/logs/hourly-cycle-$(date +%Y-%m-%d).log
```

### View Cron Execution Log

```bash
tail -f ~/Cognosis/logs/cron.log
```

### Check Last Lottery Drawing

```bash
cd ~/Cognosis/scripts/cardano
cat logs/lottery-draw-*.json | jq
```

### Check Last Snapshot

```bash
cd ~/Cognosis/psy-rewards
ls -lh snapshots/ | tail -5
cat snapshots/snapshot-*.json | jq
```

---

## Troubleshooting

### Cron Job Not Running

**Check cron service:**
```bash
systemctl status cron
```

**Check crontab:**
```bash
crontab -l
```

**Check permissions:**
```bash
ls -la ~/Cognosis/scripts/automation/*.sh
# All should have -rwxr-xr-x (executable)
```

### Lottery Drawing Fails

**Common reasons:**
- Drawing frequency hasn't elapsed yet (check time)
- No participants this cycle (OK, pool rolls over)
- Lottery pool not initialized (run `init-lottery-preprod.ts`)
- BLOCKFROST_API_KEY or WALLET_SEED_PHRASE not set

**Check logs:**
```bash
grep "lottery" ~/Cognosis/logs/hourly-cycle-*.log
```

### PSY Snapshot Fails

**Common reasons:**
- Ogmios not running (check port 1337)
- cardano-node not synced
- No PSY holders on preprod (expected early on)

**Check Ogmios:**
```bash
curl http://localhost:1337/health
```

**Check cardano-node:**
```bash
ps aux | grep cardano-node
```

---

## Stop Automation

### Remove Cron Job

```bash
crontab -e
# Delete the line with "hourly-rewards-cycle.sh"
# Save and exit
```

### Or Remove All Cron Jobs (Nuclear Option)

```bash
crontab -r
```

---

## Configuration

### Change Lottery Frequency

Edit: `~/Cognosis/scripts/cardano/psy-reward-config.ts`

```typescript
lottery: {
  drawingFrequencyMs: 60 * 60 * 1000, // 1 hour (current)
  // Change to:
  // drawingFrequencyMs: 30 * 60 * 1000, // 30 minutes
  // drawingFrequencyMs: 5 * 60 * 1000,  // 5 minutes
}
```

Then re-initialize lottery:
```bash
cd ~/Cognosis/scripts/cardano
npx ts-node init-lottery-preprod.ts
```

### Change Snapshot Frequency

**Option 1: Modify Cron Schedule**

```bash
crontab -e
```

Change from hourly (`0 * * * *`) to:
- Every 30 minutes: `*/30 * * * *`
- Every 15 minutes: `*/15 * * * *`
- Every 5 minutes: `*/5 * * * *`

**Option 2: Run Manually**

Disable cron and trigger manually when needed:
```bash
crontab -r  # Remove cron
cd ~/Cognosis/psy-rewards
bash scripts/hourly-cycle.sh  # Manual run
```

---

## Files Overview

| File | Purpose |
|------|---------|
| `hourly-rewards-cycle.sh` | Master script (runs both lottery + PSY) |
| `setup-hourly-cron.sh` | Installs cron job |
| `../cardano/trigger-lottery-draw.ts` | Lottery drawing logic |
| `../../psy-rewards/scripts/hourly-cycle.sh` | PSY snapshot + distribution |
| `../../logs/hourly-cycle-*.log` | Daily logs |
| `../../logs/cron.log` | Cron execution log |

---

## Production Deployment

When moving to mainnet:

1. **Change frequencies:**
   - Lottery: 1 week (not 1 hour)
   - PSY snapshots: 1 month (not 1 hour)

2. **Update cron schedule:**
   ```bash
   # Lottery: Weekly (Sunday midnight)
   0 0 * * 0 /path/to/trigger-lottery-draw.sh
   
   # PSY: Monthly (1st of month, midnight)
   0 0 1 * * /path/to/psy-hourly-cycle.sh
   ```

3. **Security:**
   - Move wallet seed to secure key management
   - Use hardware wallet for admin operations
   - Enable transaction signing alerts

4. **Monitoring:**
   - Set up alerts for failed distributions
   - Monitor reward pool balances
   - Log rotation (logrotate)

---

**Created:** 2026-02-03  
**Status:** Active (Preprod Testing)  
**Next Review:** Before mainnet launch
