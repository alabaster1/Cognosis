# Vercel Deployment Setup

**Status:** ✅ Vercel CLI Installed (v50.9.6)

---

## Quick Deploy (After GitHub Push)

Once your SSH key is added to GitHub and you've pushed:

```bash
cd /home/albert/Cognosis

# Login to Vercel (opens browser)
vercel login

# Deploy to production
vercel --prod
```

---

## Detailed Setup

### Step 1: Login to Vercel

```bash
vercel login
```

This will:
1. Open your browser
2. Ask you to confirm login
3. Store authentication token locally

**Or login via email:**
```bash
vercel login --email your@email.com
```

---

### Step 2: Link Project (First Time)

```bash
cd /home/albert/Cognosis
vercel link
```

You'll be asked:
- **Set up and deploy?** Yes
- **Which scope?** Choose your account/team
- **Link to existing project?** No (create new)
- **Project name?** cognosis (or custom)
- **Directory?** ./ (current directory)

---

### Step 3: Configure Project

Vercel will auto-detect Next.js and use default settings:

```
Build Command: npm run build
Output Directory: .next
Install Command: npm install
Development Command: npm run dev
```

**Environment Variables (add in Vercel dashboard):**

```bash
# Cardano Network
NEXT_PUBLIC_NETWORK=preprod
NEXT_PUBLIC_CARDANO_NETWORK_ID=1

# Blockfrost API
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=preprodXXXXXXXXXXXXXXX

# PlutusV3 Contracts (preprod)
NEXT_PUBLIC_EXPERIMENT_ADDRESS=addr_test1wrfwt5tsy7gxk0cr857esk2pxf5cj738vzvc76gl6quswlqnd52h7
NEXT_PUBLIC_VAULT_ADDRESS=addr_test1wz54mujyqzpgsl5n46scw690z6a4c7z0w8fnmw3p5svr57cpj8jzj
NEXT_PUBLIC_LOTTERY_ADDRESS=addr_test1wqcddm6lc83z3442numt57uvz6kgqfcz252zvs8k75tkczsmr0sg4

# PSY Token
NEXT_PUBLIC_PSY_POLICY_ID=52f4f6afcef8453af8189f4eeec850df31cb1c27a9bf2d8e4594216e
NEXT_PUBLIC_PSY_ASSET_NAME=505359
```

---

### Step 4: Deploy to Production

```bash
vercel --prod
```

**Output:**
```
🔍  Inspect: https://vercel.com/your-account/cognosis/XXX [2s]
✅  Production: https://cognosis.vercel.app [deployed]
```

---

## Alternative: Deploy via Vercel Dashboard

### Step 1: Connect GitHub Repo

1. Go to: https://vercel.com/new
2. Click: **"Import Git Repository"**
3. Select: **alabaster1/Cognosis**
4. Click: **"Import"**

### Step 2: Configure Project

- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** ./
- **Build Command:** (leave default)
- **Output Directory:** (leave default)

### Step 3: Add Environment Variables

Click **"Environment Variables"** and add all variables listed above.

### Step 4: Deploy

Click: **"Deploy"**

Vercel will:
1. Clone your repo
2. Install dependencies
3. Build the project
4. Deploy to production (~2 minutes)

---

## Automatic Deployments

Once connected:
- **Every push to `main`** → Production deployment
- **Every pull request** → Preview deployment
- **Branch deployments** → Available as previews

---

## Custom Domain (Optional)

### Step 1: Add Domain

1. Go to: Project Settings → Domains
2. Add: `cognosispredict.com`
3. Follow DNS setup instructions

### Step 2: Configure DNS

Add these records at your domain registrar:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Step 3: Wait for SSL

Vercel automatically provisions SSL certificates (~5 minutes).

---

## Useful Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Open project in browser
vercel

# Deploy to preview (staging)
vercel

# Deploy to production
vercel --prod

# Remove deployment
vercel rm <deployment-url>
```

---

## Troubleshooting

### Build Failures

```bash
# Check build logs
vercel logs --follow

# Test build locally
npm install
npm run build
```

### Environment Variables Missing

1. Go to: Project Settings → Environment Variables
2. Add missing variables
3. Redeploy: `vercel --prod`

### Domain Not Working

1. Verify DNS records are correct
2. Wait up to 48 hours for DNS propagation
3. Check SSL certificate status in Vercel dashboard

---

## Current Status

- ✅ Vercel CLI installed (v50.9.6)
- ⏸️ Waiting: GitHub SSH key to be added
- ⏸️ Waiting: Push to GitHub
- 📝 Ready: Deploy with `vercel --prod`

---

## Next Steps

1. **Add SSH key to GitHub** (see GITHUB-SSH-SETUP.md)
2. **Push to GitHub:** `git push origin main`
3. **Login to Vercel:** `vercel login`
4. **Deploy:** `vercel --prod`

**Deployment time:** ~2-3 minutes after push

🚀 Ready to deploy!
