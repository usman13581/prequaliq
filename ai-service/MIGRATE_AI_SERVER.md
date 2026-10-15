# Migrate PrequaliQ AI off Trooper (to a monthly GPU server)

This guide lets you **shut down Trooper** and move the same AI stack to any always-on / monthly GPU host without rewriting the app.

Your Railway frontend/backend stay the same. Only the **AI machine** and two env vars change.

---

## 1. What you are migrating

| Piece | Location | Portable? |
|-------|----------|-----------|
| AI API code | `ai-service/` in GitHub (`main.py`, `prompts.py`, scripts) | Yes — already in git |
| Python deps | `ai-service/requirements.txt` | Yes |
| Model | Ollama + `qwen2.5:7b` | Re-pull on new server (~5 GB) |
| Shared secret | `AI_API_KEY` in GPU `.env` | Copy or regenerate |
| Public URL | Trooper host + port | **Changes** on new provider |
| App code (Railway) | Frontend + backend | No change needed except env URL |

**Nothing AI-related is stored only on Trooper.** If `ai-service/` is on `main` and you know `AI_API_KEY`, you can rebuild on a new box in under an hour.

---

## 2. Architecture (stays the same)

```
Browser → Railway Frontend
              ↓
         Railway Backend  ──X-API-Key──→  NEW GPU SERVER
              ↓                              ├─ FastAPI (ai-service)
         PostgreSQL                          └─ Ollama (qwen2.5:7b)
```

Backend uses only:

```env
AI_SERVICE_URL=https://YOUR_NEW_HOST:PORT   # or http://...
AI_API_KEY=<same secret as GPU .env>
```

---

## 3. Before you terminate Trooper (checklist)

Do this **while Trooper is still running** (or from git + your password manager).

### A. Confirm code is in git

```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq
git status
# ai-service/ should be committed on main
```

### B. Save credentials (write them down securely)

From Trooper (or local files):

```bash
# On GPU
ssh -p <SSH_PORT> trooperai@connect01.trooper.ai
cat ~/prequaliq-ai/.env
```

Save:

| Secret | Example / note |
|--------|----------------|
| `AI_API_KEY` | Long hex string — **keep this** if you want zero Railway key change |
| Current `AI_SERVICE_URL` | e.g. `http://connect01.trooper.ai:17121` (old; will replace) |
| Model name | `qwen2.5:7b` |

Local copies (gitignored — do not commit):

- `ai-service/deploy.env`
- `backend/.env` (`AI_SERVICE_URL`, `AI_API_KEY`)
- Railway backend Variables (screenshot or export)

### C. Optional: verify health once more

```bash
curl -s http://connect01.trooper.ai:17121/health
```

### D. Then you may freeze/terminate Trooper

After termination, AI features stop until the new server is wired. The main app (login, questionnaires without AI) keeps working on Railway.

---

## 4. What the new monthly server needs

Minimum for `qwen2.5:7b` (quantized via Ollama):

| Resource | Minimum | Comfortable |
|----------|---------|-------------|
| GPU VRAM | 8 GB | 12–24 GB |
| RAM | 16 GB | 32 GB |
| Disk | 40 GB | 80 GB+ |
| OS | Ubuntu 22.04+ | same |
| Access | SSH + **one public TCP port** for FastAPI | reverse proxy + HTTPS optional |
| Billing | **Monthly** flat (not hourly freeze) | — |

Software to install on the new box:

1. NVIDIA drivers + CUDA (provider image often has this)
2. [Ollama](https://ollama.com)
3. Python 3.10+
4. (Optional) `nginx` + TLS if you want HTTPS

---

## 5. Migrate step-by-step (new provider)

Replace placeholders:

- `NEW_HOST` — IP or hostname  
- `NEW_SSH_PORT` — often `22`  
- `NEW_USER` — e.g. `ubuntu` / `root`  
- `NEW_API_PORT` — public port you open in firewall (e.g. `8000` or provider’s mapped port)

### Step 1 — Update Mac deploy config

Edit `ai-service/deploy.env` (gitignored):

```env
TROOPER_HOST=NEW_HOST
TROOPER_USER=NEW_USER
TROOPER_SSH_PORT=NEW_SSH_PORT
AI_API_PORT=NEW_API_PORT
REMOTE_DIR=prequaliq-ai
```

> Variable names still say `TROOPER_*` for compatibility with existing scripts — they work for **any** SSH host.

Ensure SSH key access:

```bash
ssh-copy-id -p NEW_SSH_PORT NEW_USER@NEW_HOST
ssh -p NEW_SSH_PORT NEW_USER@NEW_HOST
```

### Step 2 — Install Ollama + model on new server

```bash
# On new server
curl -fsSL https://ollama.com/install.sh | sh
ollama pull qwen2.5:7b
ollama list
curl -s http://127.0.0.1:11434/api/tags | head
```

Keep Ollama running (systemd is usually installed by the script).

### Step 3 — Open firewall for API port

Allow inbound TCP `NEW_API_PORT` from the internet (or at least from Railway egress).  
Do **not** expose Ollama `11434` publicly — only FastAPI.

### Step 4 — Deploy ai-service from Mac

```bash
cd /Users/muhammadusmanfarooqmuhammadusman/Projects/Prequaliq/ai-service
./deploy-from-mac.sh
```

This uploads code, sets `API_PORT`, and runs `restart-on-gpu.sh`.

If `.env` is created fresh, copy the new `AI_API_KEY`.  
If you prefer to keep the old key:

```bash
ssh -p NEW_SSH_PORT NEW_USER@NEW_HOST
nano ~/prequaliq-ai/.env
# set:
# AI_API_KEY=<your previous key>
# API_PORT=NEW_API_PORT
# OLLAMA_BASE_URL=http://127.0.0.1:11434
# OLLAMA_MODEL=qwen2.5:7b
cd ~/prequaliq-ai && ./restart-on-gpu.sh
```

### Step 5 — Verify from Mac

```bash
curl -s http://NEW_HOST:NEW_API_PORT/health
# expect: {"status":"ok","ollama":true,"model":"qwen2.5:7b",...}

curl -s http://NEW_HOST:NEW_API_PORT/endpoints | grep answers
```

Or:

```bash
# in ai-service/deploy.env set AI_API_KEY=...
./verify-from-mac.sh
```

### Step 6 — Point the app at the new server

**Local** `backend/.env`:

```env
AI_SERVICE_URL=http://NEW_HOST:NEW_API_PORT
AI_API_KEY=<same as GPU .env>
```

Restart local backend.

**Railway** (backend service → Variables):

```env
AI_SERVICE_URL=http://NEW_HOST:NEW_API_PORT
AI_API_KEY=<same as GPU .env>
```

Redeploy/restart backend.

### Step 7 — Smoke-test product features

1. Entity: AI questionnaire understand + generate  
2. Supplier: profile PDF AI assist  
3. Supplier: questionnaire “Suggest answers with AI”

### Step 8 — Terminate Trooper

Only after Step 6–7 pass. Cancel/terminate the Trooper order so hourly billing stops.

---

## 6. Env vars map (quick reference)

| Where | Variable | Purpose |
|-------|----------|---------|
| GPU `~/prequaliq-ai/.env` | `AI_API_KEY` | Shared secret |
| GPU `.env` | `API_PORT` | Uvicorn listen port (= public port) |
| GPU `.env` | `OLLAMA_MODEL` | `qwen2.5:7b` |
| Mac `ai-service/deploy.env` | `TROOPER_HOST` / `SSH_PORT` / `AI_API_PORT` | Deploy scripts |
| Railway + local backend | `AI_SERVICE_URL` | Public base URL of FastAPI |
| Railway + local backend | `AI_API_KEY` | Must match GPU |

---

## 7. Choosing a monthly provider (criteria)

Use this when shopping — no lock-in to Trooper:

1. **Monthly flat price** (or reserved), not “freeze at 10%”  
2. **Stable public IP/hostname + fixed ports** (no migrate-on-unfreeze)  
3. GPU ≥ **8–12 GB VRAM** for 7B  
4. EU region if you care about data residency (GDPR)  
5. Root/SSH access (you run Ollama yourself)  
6. Enough bandwidth for occasional API calls (light traffic)

Rough budget band for this app: **~€80–€150 / month** for a small always-on GPU (cheaper CPU-only is possible but slower).

---

## 8. Optional improvements when you move

- Put **nginx + Let’s Encrypt** in front → `https://ai.yourdomain.com`  
- Run uvicorn under **systemd** (auto-start on reboot)  
- Restrict firewall to Railway IPs if provider supports it  
- Keep `AI_API_KEY` long and rotate if ever leaked  

Example systemd unit sketch (on new server):

```ini
# /etc/systemd/system/prequaliq-ai.service
[Unit]
Description=PrequaliQ AI
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/prequaliq-ai
EnvironmentFile=/home/ubuntu/prequaliq-ai/.env
ExecStart=/home/ubuntu/prequaliq-ai/.venv/bin/uvicorn main:app --host 0.0.0.0 --port ${API_PORT}
Restart=always

[Install]
WantedBy=multi-user.target
```

---

## 9. Rollback

If the new server fails:

1. Keep Trooper until new health checks pass, **or**  
2. Re-order Trooper / unfreeze → redeploy with old `deploy.env` → restore Railway `AI_SERVICE_URL`

App without AI still works anytime `AI_SERVICE_URL` is unreachable (features return 503).

---

## 10. One-page “day of move” script

```bash
# 1) Mac: point deploy.env at NEW_HOST / ports
# 2) New server: install ollama + pull qwen2.5:7b + open API port
cd ~/Projects/Prequaliq/ai-service
./deploy-from-mac.sh
curl -s http://NEW_HOST:NEW_API_PORT/health

# 3) Update local + Railway AI_SERVICE_URL (+ key if new)
# 4) Test entity + supplier AI in UI
# 5) Cancel Trooper
```

---

## Related files

| File | Role |
|------|------|
| `ai-service/deploy-from-mac.sh` | Upload + restart |
| `ai-service/restart-on-gpu.sh` | venv + uvicorn |
| `ai-service/verify-from-mac.sh` | Health + sample generate |
| `ai-service/deploy.env.example` | Template for host/ports |
| `ai-service/README.md` | Full AI service docs |
| `backend/.env` / Railway | `AI_SERVICE_URL`, `AI_API_KEY` |

When you pick a monthly provider, share host + SSH + public port and we can run this migration for you end-to-end.
