# Cognosis MVP RC1 Rollback Runbook

Date: 2026-02-27
Applies to: MVP RC1 deployment

## Trigger Conditions
- RV start/score/settle path failing for authenticated users
- Sustained 5xx errors on:
  - `/api/cardano/rv/start`
  - `/api/cardano/rv/score`
  - `/api/stats/remote-viewing`
- Oracle chat returning sustained upstream failures
- Data integrity issue in session ownership/state transitions

## Immediate Containment
1. Disable user-facing promotion links to non-essential surfaces.
2. Keep existing sessions read-only until rollback is complete.
3. Capture logs and request IDs from failing requests.

## Rollback Strategy
1. Revert application deployment to previous stable tag/commit.
2. Restart services in order:
   - backend
   - ai service
   - frontend
3. Validate health endpoints:
   - `GET /health` on backend
   - `GET /health` on AI service
4. Run minimal smoke:
   - wallet auth
   - RV start
   - RV score
   - profile/history load

## Database Considerations
- Do not run destructive schema rollback unless migration specifically requires it.
- If schema changed in RC1, use Prisma migration rollback procedure for the specific migration only.
- Preserve scored/settled session records; do not delete user session data for rollback.

## Verification Checklist (Post-Rollback)
- [ ] `/api/cardano/rv/start` succeeds for authenticated wallet owner
- [ ] `/api/cardano/rv/score` returns a valid score and scoring method
- [ ] `/api/stats/remote-viewing` returns 200
- [ ] Oracle chat returns safe response (or safe degraded message)
- [ ] No spike of unhandled exceptions in backend logs for 15 minutes

## Communication
1. Announce rollback start in team channel with reason and timestamp.
2. Announce rollback complete with validated checks.
3. Open follow-up incident ticket with:
   - failing request IDs
   - root cause hypothesis
   - remediation owner

## Exit Criteria
- Core MVP RV flow stable for 15+ minutes under normal load.
- Smoke checks pass.
- Incident notes captured.
