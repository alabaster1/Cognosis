# Cognosis MVP RC1 Release Notes

Date: 2026-02-27
Scope: MVP Remote Viewing flow only

## What Is Included
- Single active MVP experiment: `Remote Viewing`
- Account surfaces wired to backend data:
  - `Profile`
  - `Session History`
  - `My Tokens`
- Cardano RV endpoint hardening:
  - session ownership enforcement
  - status transition guards
  - rejected transition logging
- Scoring reliability chain:
  - `psi-score-ai`
  - `openai-fallback`
  - `deterministic-fallback`
- RV results UI now displays scoring method
- Oracle chat hardening:
  - resilient parsing
  - upstream timeout
  - model allowlist
  - request limits
  - request IDs for tracing
- Oracle Website/X selector removed from end-user chat UI

## QA Added
- Backend test: `backend/tests/rvScoringMvp.test.js`
  - Happy path: AI scoring available
  - Failure path: AI unavailable -> deterministic fallback

## Known Limitations
- Preprod token metadata may display as unit/asset IDs in some wallets.
- Preprod tx indexing can lag, causing temporary `404` when polling tx hash.
- AI scoring quality depends on external provider availability and model behavior.
- Deterministic fallback is stable but lower fidelity than full AI scoring.
- Smoke checklist execution is environment-dependent and must be re-run per deploy.

## Non-Goals For MVP RC1
- Productionizing non-RV experiments
- Mainnet token UX guarantees
- Advanced oracle posting workflows (X/website automation modes)

## Upgrade Notes
- Ensure env configuration for:
  - AI service URL
  - OpenAI/Gemini keys as applicable
  - Blockfrost preprod credentials
- Run preprod smoke checklist before promoting RC1.
