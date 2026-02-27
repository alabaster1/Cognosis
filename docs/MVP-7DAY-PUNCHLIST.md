# Cognosis MVP 7-Day Punch List

Target: ship a stable, testable MVP around one verified end-to-end flow.

## Scope Lock
- Primary flow only: `Remote Viewing` (`/experiments/remote-viewing`)
- Out of scope for MVP: all other experiment types as production features
- Success metric: authenticated user can complete commit -> score -> settle without manual intervention

## Day 1: Product Surface Freeze
- [ ] Keep only one active experiment in nav/catalog (`remote-viewing`)
- [ ] Mark all other experiments as `Coming soon`
- [ ] Remove mock account data from profile/history/tokens pages
- [ ] Acceptance: from homepage and nav, user can only start the MVP experiment

## Day 2: Data Integrity & Ownership
- [ ] Enforce session ownership checks on all user-session endpoints
- [ ] Ensure all user-facing stats read from canonical backend routes
- [ ] Add defensive null-handling for score/reward fields
- [ ] Acceptance: no cross-user leakage; pages never crash on missing values

## Day 3: Scoring Reliability
- [ ] Finalize scoring chain: AI service -> OpenAI fallback -> deterministic fallback
- [ ] Persist scoring method + details with each scored session
- [ ] Show scoring method in results UI
- [ ] Acceptance: scoring always returns deterministic output, never random fallback

## Day 4: Wallet + Token UX
- [ ] Show tx links and reward metadata in `My Tokens`
- [ ] Add in-app explanation for preprod token metadata limitations
- [ ] Validate PSY amount formatting and units everywhere
- [ ] Acceptance: user can trace each token reward to a session and tx

## Day 5: Oracle Hardening
- [ ] Keep resilient response parsing for `/api/oracle/chat`
- [ ] Add model allowlist + safe fallback message for upstream errors
- [ ] Add request limit + timeout safeguards
- [ ] Acceptance: oracle chat degrades gracefully, no unhandled 5xx to UI

## Day 6: QA + Automated Checks
- [x] Add one happy-path integration test for RV flow
- [x] Add one failure-path test (AI service unavailable)
- [x] Create preprod smoke checklist and run it
- [x] Acceptance: both tests pass; smoke checklist completes without blockers
  - Preprod checklist draft: `docs/PREPROD-SMOKE-CHECKLIST.md`
  - Smoke results log: `docs/PREPROD-SMOKE-RESULTS.md`

## Day 7: Release Readiness
- [x] Add release notes + known limitations
- [x] Verify observability: health endpoints + core error logs
- [x] Freeze MVP scope and tag release candidate
- [x] Acceptance: deployable candidate with explicit rollback and runbook notes
  - RC release notes: `docs/MVP-RC1-RELEASE-NOTES.md`
  - RC rollback runbook: `docs/MVP-RC1-ROLLBACK-RUNBOOK.md`
  - Automated observability probes recorded in `docs/PREPROD-SMOKE-RESULTS.md`

## Open Risks To Track Daily
- Local AI service availability (`:8001`)
- Preprod indexer lag causing tx confirmation delays
- Wallet metadata inconsistencies for preprod assets
- Auth token expiry causing account pages to fail closed
