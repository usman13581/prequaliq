# PrequaliQ AI Service

FastAPI wrapper around **local Ollama** on your Trooper GPU instance. PDF text is extracted on Railway/backend; only plain text is sent to this service. The LLM never leaves the GPU machine.

**Model:** `qwen2.5:7b` (via Ollama on `127.0.0.1:11434`)

## Architecture

```
Supplier PDF(s) → Backend (pdf-parse) → GPU FastAPI → Ollama → JSON fields → merge + human confirm → profile save
```

## Endpoint URLs

| URL | Auth | Description |
|-----|------|-------------|
| http://connect01.trooper.ai:22528/docs | none | Swagger UI |
| http://connect01.trooper.ai:22528/endpoints | none | GPU endpoint catalog |
| http://connect01.trooper.ai:22528/health | none | Ollama reachability |
| http://localhost:5001/api/supplier/ai/status | supplier JWT | Backend + GPU health |
| http://localhost:5001/api/supplier/ai/endpoints | supplier JWT | Backend + GPU catalogs |

## GPU endpoints (`X-API-Key` required except health/docs)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Ollama status + model name |
| `GET` | `/endpoints` | This catalog |
| `GET` | `/docs` | Swagger UI |
| `POST` | `/extract/classify` | Classify document type and profile section |
| `POST` | `/extract/insurance` | Insurance fields |
| `POST` | `/extract/company` | Company registration fields |
| `POST` | `/extract/certificate` | ISO / management certificate |
| `POST` | `/extract/financial` | Financial statement summary |
| `POST` | `/extract/auto` | Classify then extract in one call |
| `POST` | `/generate/questionnaire` | Generate questionnaire draft from procurement description |

## Backend supplier endpoints (JWT)

| Method | Path | Body |
|--------|------|------|
| `GET` | `/api/supplier/ai/status` | — |
| `GET` | `/api/supplier/ai/endpoints` | — |
| `POST` | `/api/supplier/insurance/ai-suggest` | `multipart document` (single PDF) |
| `POST` | `/api/supplier/profile/ai-suggest` | `multipart documents[]` (up to 10 PDFs) |

Profile assist merges multi-document extractions, flags conflicts, and returns suggestions for **human review only** — nothing is saved until the supplier applies fields and saves the profile.

## Deploy on Trooper GPU

### 1. Copy files from your Mac

Replace `SSH_PORT` with your Trooper SSH port (e.g. `22539`).

```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq
scp -P SSH_PORT -r ai-service/ trooperai@connect01.trooper.ai:~/prequaliq-ai/
```

### 2. SSH into the GPU server

```bash
ssh -p SSH_PORT trooperai@connect01.trooper.ai
```

### 3. Confirm Ollama is running

```bash
ollama list
curl -s http://127.0.0.1:11434/api/tags | head
```

You should see `qwen2.5:7b`. If not:

```bash
ollama pull qwen2.5:7b
```

### 4. Run the setup script

Trooper exposes a **public HTTP port** for your instance (e.g. `22528` — check your Trooper dashboard; do not use Jupyter's port `22527`).

```bash
cd ~/prequaliq-ai
chmod +x setup-on-gpu.sh
API_PORT=22528 ./setup-on-gpu.sh
```

On first run the script:

- Creates a Python venv and installs dependencies
- Generates `.env` with a random `AI_API_KEY`
- Starts uvicorn on `0.0.0.0:22528`

**Save the printed `AI_API_KEY`** — you need it for Railway `backend` env vars.

### 5. Keep it running (screen)

The setup script runs in the foreground. Detach with **Ctrl+A, D**:

```bash
screen -S prequaliq-ai
cd ~/prequaliq-ai
API_PORT=22528 ./setup-on-gpu.sh
# Ctrl+A, D to detach
# screen -r prequaliq-ai   # reattach later
```

If `.env` already exists, restart manually:

```bash
cd ~/prequaliq-ai
source .venv/bin/activate
set -a && source .env && set +a
uvicorn main:app --host 0.0.0.0 --port "${API_PORT:-22528}"
```

## Test from your Mac

Health (no API key):

```bash
curl -s http://connect01.trooper.ai:22528/health | python3 -m json.tool
```

GPU catalog:

```bash
curl -s http://connect01.trooper.ai:22528/endpoints | python3 -m json.tool
```

Extract (replace `YOUR_API_KEY`):

```bash
curl -s -X POST http://connect01.trooper.ai:22528/extract/auto \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "text": "ISO 9001:2015 certificate issued by Bureau Veritas. Valid until 2027-06-30.",
    "language": "en"
  }' | python3 -m json.tool
```

## Configure Railway backend

In your Railway backend service variables:

```env
AI_SERVICE_URL=http://connect01.trooper.ai:22528
AI_API_KEY=<same key as GPU .env>
```

Redeploy backend after setting vars.

## Environment variables (GPU `.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_API_KEY` | (required) | Shared secret with Railway backend |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Local Ollama |
| `OLLAMA_MODEL` | `qwen2.5:7b` | Model tag |
| `API_PORT` | `22528` | Public Trooper port for uvicorn |

Copy from `.env.example` if you create `.env` manually.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `health` shows `"ollama": false` | Start Ollama: `ollama serve` or check Trooper Ollama service |
| `401 Invalid API key` | Match `AI_API_KEY` on GPU and Railway |
| `502 Ollama unreachable` | Ollama not running or wrong `OLLAMA_BASE_URL` |
| Connection refused from Mac | GPU instance stopped, wrong public port, or uvicorn not running |
| Slow first request | Normal — model loads into VRAM (~30–60s) |

## Security notes

- Only document **text** is sent to the GPU (not the PDF file).
- Protect `AI_API_KEY`; rotate if leaked.
- Trooper instances are ephemeral — restart uvicorn after each GPU session.
- AI suggestions are never auto-saved; suppliers must confirm every field.
