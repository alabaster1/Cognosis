#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="${BACKEND_URL:-https://cognosis-backend-877651215690.us-central1.run.app}"
FRONTEND_URL="${FRONTEND_URL:-https://cognosispredict.com}"

echo "[smoke] Backend URL: ${BACKEND_URL}"
echo "[smoke] Frontend URL: ${FRONTEND_URL}"

health="$(curl -fsS "${BACKEND_URL}/health")"
echo "${health}" | node -e '
const fs = require("fs");
const body = JSON.parse(fs.readFileSync(0, "utf8"));
if (body.status !== "ok") {
  console.error("[smoke] /health status is not ok:", body.status);
  process.exit(1);
}
console.log("[smoke] /health ok");
'

config="$(curl -fsS "${BACKEND_URL}/api/cardano/config")"
echo "${config}" | node -e '
const fs = require("fs");
const body = JSON.parse(fs.readFileSync(0, "utf8"));
if (!body.success) {
  console.error("[smoke] /api/cardano/config returned success=false");
  process.exit(1);
}
const validators = body.config?.validators || {};
const missing = ["psiExperiment", "researchPool", "rewardVault"].filter((name) => !validators?.[name]?.address);
if (missing.length) {
  console.error("[smoke] Missing validator addresses:", missing.join(", "));
  process.exit(1);
}
console.log("[smoke] /api/cardano/config validator addresses present");
'

curl -fsS "${FRONTEND_URL}" >/dev/null
echo "[smoke] Frontend reachable"

echo "[smoke] PASS"
