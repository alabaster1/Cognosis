# GitHub SSH Key Setup

**Status:** SSH key generated, needs to be added to GitHub

---

## Step 1: Copy the SSH Public Key

Your SSH public key:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAINMgdO8UrldS9LMR+JvXiEXA3QtJsogSzsjCjNUsqiJy elliot.agento@gmail.com
```

**Copy this entire line** (starting with `ssh-ed25519`).

---

## Step 2: Add to GitHub

1. Go to: https://github.com/settings/keys
2. Click: **"New SSH key"**
3. Title: `Cognosis Deployment (Elliot)`
4. Key type: **Authentication Key**
5. Paste the public key above
6. Click: **"Add SSH key"**

---

## Step 3: Test Connection

Once added, run:

```bash
cd /home/albert/Cognosis
ssh -T git@github.com
```

You should see:
```
Hi alabaster1! You've successfully authenticated, but GitHub does not provide shell access.
```

---

## Step 4: Push Changes

After SSH key is added:

```bash
cd /home/albert/Cognosis
git push origin main
```

This will push 5 commits:
- a4daaa9 (Website changes summary)
- f9bcf69 (Rewards & lottery section)
- 73dc087 (Remove Midnight, Coming Soon badges)
- e63c0af (Next steps docs)
- 76e6865 (PlutusV3 migration)

---

## Alternative: Use Personal Access Token

If you prefer not to use SSH:

1. Go to: https://github.com/settings/tokens
2. Click: **"Generate new token"** → **"Classic"**
3. Name: `Cognosis Deployment`
4. Expiration: 90 days (or custom)
5. Scopes: Check `repo` (full control)
6. Click: **"Generate token"**
7. Copy the token (starts with `ghp_`)

Then:

```bash
cd /home/albert/Cognosis
git remote set-url origin https://github.com/alabaster1/Cognosis.git
git config --global credential.helper store
git push origin main
# When prompted, enter:
#   Username: alabaster1
#   Password: <paste your token>
```

---

## Current Status

- ✅ SSH key generated
- ✅ SSH config created
- ✅ Git remote changed to SSH
- ⏸️ Waiting: SSH key needs to be added to GitHub
- 📝 Ready: 5 commits waiting to push

---

**Choose one method (SSH or token) and follow the steps above.**
