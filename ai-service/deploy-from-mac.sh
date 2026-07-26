#!/usr/bin/env bash
# Deploy ai-service to Trooper GPU from your Mac.
# Usage:
#   cp deploy.env.example deploy.env   # edit TROOPER_SSH_PORT
#   chmod +x deploy-from-mac.sh verify-from-mac.sh
#   ./deploy-from-mac.sh
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
AI_API_PORT="${AI_API_PORT:-22528}"
REMOTE_DIR="${REMOTE_DIR:-prequaliq-ai}"

REMOTE="${TROOPER_USER}@${TROOPER_HOST}"
SSH_OPTS=(-p "${TROOPER_SSH_PORT}" -o ConnectTimeout=15)

echo "==> PrequaliQ GPU deploy"
echo "    Host: ${REMOTE}:${TROOPER_SSH_PORT}"
echo "    Remote dir: ~/${REMOTE_DIR}"
echo "    API port: ${AI_API_PORT}"
echo ""

echo "==> 1/3 Ensure remote directory exists"
ssh "${SSH_OPTS[@]}" "${REMOTE}" "mkdir -p ~/${REMOTE_DIR}"

echo "==> 2/3 Upload ai-service files"
if command -v rsync &>/dev/null; then
  rsync -avz --delete \
    -e "ssh -p ${TROOPER_SSH_PORT} -o ConnectTimeout=15" \
    --exclude '.venv/' \
    --exclude '__pycache__/' \
    --exclude '*.pyc' \
    --exclude '.env' \
    --exclude 'deploy.env' \
    --exclude 'uvicorn.log' \
    --exclude 'nohup.out' \
    "${SCRIPT_DIR}/" "${REMOTE}:~/${REMOTE_DIR}/"
else
  echo "    (rsync not found — using scp)"
  ssh "${SSH_OPTS[@]}" "${REMOTE}" "rm -rf ~/${REMOTE_DIR} && mkdir -p ~/${REMOTE_DIR}"
  scp -P "${TROOPER_SSH_PORT}" -r \
    "${SCRIPT_DIR}/main.py" \
    "${SCRIPT_DIR}/prompts.py" \
    "${SCRIPT_DIR}/requirements.txt" \
    "${SCRIPT_DIR}/setup-on-gpu.sh" \
    "${SCRIPT_DIR}/restart-on-gpu.sh" \
    "${SCRIPT_DIR}/.env.example" \
    "${SCRIPT_DIR}/README.md" \
    "${REMOTE}:~/${REMOTE_DIR}/"
fi

echo "==> 3/3 Sync API_PORT=${AI_API_PORT} on GPU .env and restart"
ssh "${SSH_OPTS[@]}" "${REMOTE}" "cd ~/${REMOTE_DIR} && \
  if [ -f .env ]; then \
    grep -q '^API_PORT=' .env && sed -i \"s/^API_PORT=.*/API_PORT=${AI_API_PORT}/\" .env || echo \"API_PORT=${AI_API_PORT}\" >> .env; \
  else \
    KEY=\$(openssl rand -hex 24); \
    printf 'AI_API_KEY=%s\nOLLAMA_BASE_URL=http://127.0.0.1:11434\nOLLAMA_MODEL=qwen2.5:7b\nAPI_PORT=%s\n' \"\$KEY\" '${AI_API_PORT}' > .env; \
    echo 'CREATED .env — save AI_API_KEY from GPU .env into backend/Railway'; \
  fi && \
  chmod +x restart-on-gpu.sh setup-on-gpu.sh && ./restart-on-gpu.sh"

echo ""
echo "==> Done. Run ./verify-from-mac.sh to test."
echo "    Health: http://${TROOPER_HOST}:${AI_API_PORT}/health"
echo "    Docs:   http://${TROOPER_HOST}:${AI_API_PORT}/docs"
