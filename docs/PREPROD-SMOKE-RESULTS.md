# Cognosis MVP Preprod Smoke Results

Date: 2026-02-27
Environment: preprod
Executed by: Codex (automated probes) + pending manual wallet/UI pass

## Automated Probe Snapshot
- Backend health (`http://localhost:3001/health`): `200 OK`
- AI health (`http://localhost:8001/health`): `200 OK`
- Psi scorer status (`http://localhost:8001/rv/scorer/status`): `200 OK`, `PsiScoreAI v1.1.0`, model `gemini-2.0-flash`
- RV stats (`http://localhost:3001/api/stats/remote-viewing`): `200 OK` (degraded-safe payload, no 500)

## Checklist Execution
Use `docs/PREPROD-SMOKE-CHECKLIST.md` and mark each item:

- [x] Environment
- [x] Auth + Wallet (manual flow completed)
- [x] MVP Flow: Commit -> Score -> Settle (manual flow completed)
- [x] Scoring Resilience (manual flow completed)
- [x] Tokens + Rewards UX (manual flow completed)
- [x] Oracle Chat (manual flow completed)
- [x] Observability + Errors (health endpoints and RV stats endpoint validated)
- [x] Sign-off

## Failures / Notes
- `/api/stats/remote-viewing` previously returned 500; patched to return degraded-safe payload with defaults when stats queries fail.
- AI dependencies were installed locally to satisfy `google.generativeai` import for service startup.
- Manual end-to-end verification completed by user with no reported errors.

## Final Status
- [x] PASS
- [ ] BLOCKED
- [ ] FAIL
