# Cognosis Production Deploy 60-Minute Checklist

Date: 2026-02-27
Release tag: `mvp-rc1`
Owner: Alberto + Codex

## T+0 to T+5 (Immediate Health)
- [x] Backend health returns `200`: `GET /health`
- [x] AI health returns `200`: `GET :8001/health`
- [x] RV stats returns `200`: `GET /api/stats/remote-viewing`
- [x] No crash-loop/restart behavior in backend or AI logs

## T+5 to T+20 (Core Flow Signals)
- [ ] `/api/cardano/rv/start` success responses observed
- [ ] `/api/cardano/rv/score` success responses observed
- [ ] `/api/cardano/rv/confirm-settle` success responses observed
- [ ] No spike in 4xx/5xx on RV endpoints

## T+20 to T+40 (User-Facing Quality)
- [ ] Oracle chat responds without unhandled 5xx
- [ ] Oracle upstream failures, if any, return safe fallback messages
- [ ] Profile/History/Tokens pages load with live data
- [ ] Wallet-authenticated users can complete end-to-end RV flow

## T+40 to T+60 (Stability Review)
- [ ] Error rate on critical endpoints remains stable/low
- [ ] Latency on RV endpoints is within acceptable range
- [ ] No new high-severity backend exceptions
- [ ] No blocking user reports in support channel

## Go / No-Go
- [ ] GO (stable after 60 minutes)
- [ ] NO-GO (rollback required)

## If No-Go
- [ ] Execute rollback steps in `docs/MVP-RC1-ROLLBACK-RUNBOOK.md`
- [ ] Post incident summary with request IDs and timeline

## Evidence (Automated Checks)
- Backend URL: `https://cognosis-backend-dcqu34k7xq-uc.a.run.app`
- AI URL: `https://cognosis-ai-service-317492936379.us-central1.run.app`
- Backend health: `200 OK`
- AI health: `200 OK`
- RV stats: `200 OK` (degraded-safe payload)
- RV start route reachability: `401 No authorization token` (expected without auth)

## Deployment Notes
- `cognosis-ai-service` was created and recovered after missing secret errors.
- Missing secrets created in GCP: `admin-api-key`, `webhook-secret`.
- `cognosis-backend` is live on revision `cognosis-backend-00009-6v7` at 100% traffic.
