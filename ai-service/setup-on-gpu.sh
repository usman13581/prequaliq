#!/bin/bash
# Run on Trooper GPU server (after SSH login)
set -e
cd "$(dirname "$0")"

echo "=== PrequaliQ AI service setup ==="

if ! command -v python3 &>/dev/null; then
  sudo apt-get update -qq && sudo apt-get install -y python3 python3-pip python3-venv
fi

python3 -m venv .venv
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt

if [ ! -f .env ]; then
  KEY=$(openssl rand -hex 24)
  PORT="${API_PORT:-22528}"
  cat > .env <<EOF
AI_API_KEY=${KEY}
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
API_PORT=${PORT}
EOF
  echo ""
  echo "Created .env — SAVE THIS API KEY for Railway / backend:"
  echo "  AI_API_KEY=${KEY}"
  echo "  API_PORT=${PORT}"
  echo ""
fi

set -a
source .env
set +a
echo "Starting API on 0.0.0.0:${API_PORT} ..."
echo "Public URL (from your Mac): http://connect01.trooper.ai:${API_PORT}/health"
echo "Press Ctrl+C to stop. Use screen/tmux to keep running."
exec .venv/bin/uvicorn main:app --host 0.0.0.0 --port "${API_PORT:-22528}"
