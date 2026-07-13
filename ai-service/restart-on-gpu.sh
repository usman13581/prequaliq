#!/bin/bash
# Run ON the Trooper GPU server after copying updated ai-service files.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found — creating first-time config..."
  KEY=$(openssl rand -hex 24 2>/dev/null || python3 -c "import secrets; print(secrets.token_hex(24))")
  PORT="${API_PORT:-22528}"
  cat > .env <<EOF
AI_API_KEY=${KEY}
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
API_PORT=${PORT}
EOF
  echo ""
  echo "SAVE THIS for backend/.env:"
  echo "  AI_API_KEY=${KEY}"
  echo ""
fi

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

set -a
source .env
set +a

PORT="${API_PORT:-22528}"
pkill -f "uvicorn main:app" 2>/dev/null || true
sleep 1

nohup .venv/bin/uvicorn main:app --host 0.0.0.0 --port "$PORT" > uvicorn.log 2>&1 &
sleep 2

echo "Restarted on port $PORT"
curl -s "http://127.0.0.1:${PORT}/health" || true
echo ""
if curl -s "http://127.0.0.1:${PORT}/endpoints" | grep -q questionnaire; then
  echo "OK: /generate/questionnaire registered"
else
  echo "WARN: /generate/questionnaire not found in catalog"
fi
