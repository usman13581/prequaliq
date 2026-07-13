#!/usr/bin/env bash
# Verify GPU ai-service from your Mac.
# Usage: ./verify-from-mac.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -f "${SCRIPT_DIR}/deploy.env" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "${SCRIPT_DIR}/deploy.env"
  set +a
fi

TROOPER_HOST="${TROOPER_HOST:-connect01.trooper.ai}"
AI_API_PORT="${AI_API_PORT:-22528}"
BASE="http://${TROOPER_HOST}:${AI_API_PORT}"

echo "==> Health: ${BASE}/health"
if command -v python3 &>/dev/null; then
  curl -sf "${BASE}/health" | python3 -m json.tool
else
  curl -sf "${BASE}/health"
fi
echo ""

echo "==> Endpoints (checking questionnaire generation)"
ENDPOINTS="$(curl -sf "${BASE}/endpoints")"
if echo "${ENDPOINTS}" | grep -q '/generate/questionnaire'; then
  echo "    OK: /generate/questionnaire is available"
else
  echo "    MISSING: /generate/questionnaire — run ./deploy-from-mac.sh"
  exit 1
fi

if [[ -n "${AI_API_KEY:-}" ]]; then
  echo ""
  echo "==> Test questionnaire generation (short sample)"
  if command -v python3 &>/dev/null; then
    curl -sf -X POST "${BASE}/generate/questionnaire" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: ${AI_API_KEY}" \
      -d '{"description":"Procurement of office cleaning services for a municipal building. Suppliers must have liability insurance and environmental certification.","language":"en"}' \
      | python3 -m json.tool | head -40
  else
    curl -sf -X POST "${BASE}/generate/questionnaire" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: ${AI_API_KEY}" \
      -d '{"description":"Procurement of office cleaning services for a municipal building. Suppliers must have liability insurance and environmental certification.","language":"en"}'
  fi
  echo ""
  echo "    OK: GPU returned a questionnaire draft"
else
  echo ""
  echo "    Tip: set AI_API_KEY in deploy.env to run a live generation test"
fi

echo ""
echo "==> All checks passed"
