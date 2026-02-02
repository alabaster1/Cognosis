# Website Changes Summary - 2026-02-02

**Status:** ✅ Complete - Ready for Deployment

---

## Changes Made

### 1. Removed All Midnight References 🚫

**Commit:** `73dc087`

**Files Changed:** 27 files
- Frontend: All React/TypeScript components
- Backend: API routes and services
- Replaced "Midnight network" → "Cardano blockchain"
- Cleaned all references from codebase

**Impact:**
- No confusion about privacy layer
- Clear Cardano-only messaging
- Consistent branding throughout site

---

### 2. Remote Viewing as Only Active Feature ✨

**Commit:** `73dc087`

**Changes:**
- **Homepage:** Added "FLAGSHIP FEATURE" badge to RV hero section
- **Homepage:** Added "COMING SOON" badges to 9 other experiments
- **Experiments Page:** Only RV category is clickable
- **Experiments Page:** All other experiments grayed out with "Full Integration Coming Soon"

**Visual Changes:**
- Experiment cards for non-RV: 60% opacity, cursor-not-allowed, amber badges
- RV experiments: Full color, clickable, active state
- Clear visual distinction between active and coming soon

---

### 3. Reward & Lottery System Explanation 💰

**Commit:** `f9bcf69`

**New Section Added:** "Earn Rewards for Accuracy" (after "How It Works")

**Left Card - PSY Token Rewards:**
- Base reward: 100 PSY (participation)
- 50% accuracy: ~150 PSY
- 75% accuracy: ~245 PSY
- 100% perfect: 400 PSY
- Exponential curve explanation
- Blockchain verification badge

**Right Card - Weekly Lottery:**
- 4-step process visualization
- Automatic entry with each experiment
- Pool accumulation throughout week
- Cardano VRF for provably fair draws
- Example current pool display (2,450 ADA)
- Sunday 12:00 UTC draw time

**Design:**
- Side-by-side gradient cards (cyan for rewards, amber for lottery)
- Icon headers with Sparkles icons
- Nested info boxes with structured data
- Trust badges at bottom (Shield, Target icons)
- CTA button: "Start Earning PSY Tokens"

**Messaging:**
- Clear reward structure
- Transparent lottery mechanics
- Blockchain verification emphasized
- Fair and objective AI scoring

---

## What Users See Now

### Homepage Flow:

1. **Hero:** Remote Viewing flagship feature
2. **Stats:** Live trials, accuracy, researchers
3. **How It Works:** 3-step RV process
4. **⭐ Rewards & Lottery:** NEW - Earn PSY, join lottery
5. **Why Cardano:** Blockchain benefits
6. **Other Experiments:** 9 coming soon experiments
7. **Features:** Privacy, AI, blockchain, storage

### Experiments Page:

**Active:**
- Remote Viewing (4 variants) - all clickable

**Coming Soon:**
- Game-Like Experiments (5)
- Multiplayer & Global (4)
- Telepathy & Empathy (3)
- Precognition & Forecasting (3)
- Time & Causality (4)
- Consciousness & Awareness (3)
- Psychokinesis & Influence (2)
- Other (1)

---

## Technical Details

### Git Commits:

```bash
f9bcf69 - feat: Add reward and lottery system explanation to homepage
73dc087 - feat: Remove Midnight references, mark non-RV experiments as Coming Soon
e63c0af - docs: Add NEXT-STEPS.md for website updates
76e6865 - ✅ PlutusV3 Migration Complete - Preprod Deployed
```

### Files Modified:

**Homepage:**
- `src/app/page.tsx` - Added rewards section, updated coming soon badges

**Experiments:**
- `src/app/experiments/page.tsx` - Added coming soon logic and badges

**Global Changes:**
- 27 files cleaned of Midnight references

---

## Deployment Instructions

### Step 1: Push to GitHub

```bash
cd /home/albert/Cognosis
git push origin main
```

*Note: You'll need to authenticate with GitHub credentials or token*

### Step 2A: Deploy via Vercel (Recommended)

**If GitHub repo is connected to Vercel:**
- Automatic deployment on push
- Preview URL generated
- Production deployment on merge to main

**If not connected yet:**
1. Go to https://vercel.com
2. Click "New Project"
3. Import `alabaster1/Cognosis` repo
4. Accept defaults
5. Deploy

**Vercel will:**
- Auto-detect Next.js
- Build and deploy in ~2 minutes
- Provide production URL

### Step 2B: Deploy Manually via Vercel CLI

```bash
# Install Vercel CLI (one-time)
npm install -g vercel

# Login
vercel login

# Deploy to production
cd /home/albert/Cognosis
vercel --prod
```

### Step 2C: Deploy via GCP (Alternative)

```bash
cd /home/albert/Cognosis
./deploy-gcp.sh all
```

*Requires GCP project setup and configuration*

---

## Environment Variables Needed

**For production deployment:**

```bash
# Cardano Network
NEXT_PUBLIC_NETWORK=preprod  # or mainnet when ready
NEXT_PUBLIC_CARDANO_NETWORK_ID=1  # preprod

# Blockfrost API
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=preprodXXXXXXXXXXXXXXX

# Contract Addresses (PlutusV3 preprod)
NEXT_PUBLIC_EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
NEXT_PUBLIC_VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
NEXT_PUBLIC_LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4

# PSY Token
NEXT_PUBLIC_PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
NEXT_PUBLIC_PSY_ASSET_NAME=505359

# OpenAI (for oracle backend)
OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Preview Changes Locally

**To see changes before deploying:**

```bash
cd /home/albert/Cognosis
npm install
npm run dev
```

Open: http://localhost:3000

**What you'll see:**
- Remote Viewing as hero feature
- Rewards & Lottery explanation (new section)
- Other experiments with "Coming Soon" badges
- No Midnight references anywhere

---

## Post-Deployment Checklist

After deployment:

- [ ] Verify homepage loads correctly
- [ ] Check RV experiments are clickable
- [ ] Verify other experiments show "Coming Soon"
- [ ] Test rewards section displays properly
- [ ] Check no Midnight mentions anywhere
- [ ] Verify mobile responsiveness
- [ ] Test wallet connection (if enabled)
- [ ] Check CardanoScan links (preprod)

---

## Rollback Plan

If issues arise:

```bash
# Revert to previous commit
git revert f9bcf69
git revert 73dc087
git push origin main

# Vercel will auto-redeploy previous version
```

Or via Vercel dashboard:
- Go to project deployments
- Click "..." on previous deployment
- Select "Promote to Production"

---

## Next Steps After Deployment

1. **Test User Flow:**
   - Submit RV experiment through website
   - Verify oracle reveals correctly
   - Check PSY rewards display

2. **Update Documentation:**
   - Add deployment URL to README
   - Update links in Discord
   - Create user guide for rewards

3. **Mainnet Deployment (Future):**
   - Follow `PLUTUSV3-DEPLOYMENT.md`
   - Deploy mainnet contracts
   - Update env vars to mainnet
   - Redeploy website

---

## Support

**If deployment issues:**
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Check Next.js build errors
- Test locally first: `npm run dev`

**Questions:**
- See `NEXT-STEPS.md` for website updates guide
- See `PLUTUSV3-DEPLOYMENT.md` for contract details
- Ask Elliot for help debugging 🦞

---

**Status:** ✅ All code changes complete and committed  
**Action Required:** Push to GitHub and deploy via Vercel

**Commits Ready to Deploy:**
- f9bcf69 (Rewards & Lottery)
- 73dc087 (Remove Midnight, Coming Soon badges)
- e63c0af (Documentation)
- 76e6865 (PlutusV3 migration)

**Deployment Time:** ~5 minutes via Vercel

🚀 Ready when you are!
