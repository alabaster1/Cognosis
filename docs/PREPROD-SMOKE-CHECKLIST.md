# Cognosis MVP Preprod Smoke Checklist

Use this checklist before every MVP release candidate.

## Environment
- [ ] `frontend`, `backend`, and `ai` services are running
- [ ] Backend health endpoint returns 200: `GET /health`
- [ ] AI health endpoint returns 200: `GET :8001/health`
- [ ] Database connection is healthy (no startup Prisma errors)
- [ ] Preprod Blockfrost key configured and valid

## Auth + Wallet
- [ ] Connect wallet in UI and confirm backend authentication succeeds
- [ ] Start RV experiment with connected wallet (no 403 ownership mismatch)
- [ ] Session owner cannot be changed by client-side payload tampering

## MVP Flow: Commit -> Score -> Settle
- [ ] Start RV session (`/api/cardano/rv/start`) returns `sessionId`, `targetId`, `commitHash`
- [ ] Confirm commit (`/api/cardano/rv/confirm-commit`) transitions to `committed`
- [ ] Submit impressions and score (`/api/cardano/rv/score`) returns:
  - [ ] `score` (0-100)
  - [ ] `scoringMethod` (`psi-score-ai` or fallback)
  - [ ] `redeemerCbor`
- [ ] Confirm settle (`/api/cardano/rv/confirm-settle`) transitions to `settled`
- [ ] Session appears in history/profile pages with score and updated status

## Scoring Resilience
- [ ] Normal path: AI scorer available (`scoringMethod=psi-score-ai`)
- [ ] Failure path: stop AI service and retry score
  - [ ] Fallback returns deterministic result
  - [ ] UI does not crash and shows scoring method label

## Tokens + Rewards UX
- [ ] `My Tokens` page loads from live session data
- [ ] Reward entries display tx hash links and amount formatting
- [ ] Preprod token metadata warning is visible and understandable
- [ ] Wallet shows received token quantity after settle tx confirmation

## Oracle Chat
- [ ] Oracle chat responds for normal prompt
- [ ] No Website/X user mode selector is visible
- [ ] Upstream failure produces safe user-facing error (no raw stack trace)
- [ ] Request ID is present in response headers/logs for debugging

## Observability + Errors
- [ ] `/api/stats/remote-viewing` returns 200 and non-crashing payload
- [ ] No unhandled promise rejections in backend logs during full flow
- [ ] Rejected state transitions are logged with reason

## Sign-off
- [ ] All checklist sections pass
- [ ] Known limitations documented in release notes
- [ ] Rollback steps documented for this RC
