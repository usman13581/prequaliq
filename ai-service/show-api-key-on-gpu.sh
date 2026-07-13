#!/usr/bin/env bash
# Print AI_API_KEY from GPU .env (for backend .env setup).
# Usage: ./show-api-key-on-gpu.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -f "${SCRIPT_DIR}/deploy.env" ]]; then
  # shellcheck source=/dev/null
  set -a
  source "${SCRIPT_DIR}/deploy.env"
  set +a
fi

TROOPER_HOST="${TROOPER_HOST:-connect01.trooper.ai}"
TROOPER_USER="${TROOPER_USER:-trooperai}"
TROOPER_SSH_PORT="${TROOPER_SSH_PORT:-22539}"
REMOTE_DIR="${REMOTE_DIR:-prequaliq-ai}"

REMOTE="${TROOPER_USER}@${TROOPER_HOST}"

echo "==> GPU .env on ~/${REMOTE_DIR}/.env"
ssh -p "${TROOPER_SSH_PORT}" "${REMOTE}" "cat ~/${REMOTE_DIR}/.env 2>/dev/null || echo 'No .env yet — run ./deploy-from-mac.sh first'"

echo ""
echo "==> Add to backend/.env:"
echo "AI_SERVICE_URL=http://${TROOPER_HOST}:${AI_API_PORT:-22528}"
echo "AI_API_KEY=<same AI_API_KEY as above>"
