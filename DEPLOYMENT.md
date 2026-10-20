# PrequaliQ Production Deployment Guide

> **Consolidated guide:** see **[app_development.md](../app_development.md)** (§8 Production deployment).

## Pre-deployment checklist

1. **Database backup** – Take a backup of production database before deployment
2. **Environment variables** – Ensure `DATABASE_URL`, `JWT_SECRET`, `VITE_API_URL` (or API proxy), email config are set

## Deployment steps

### 1. Pull latest code
```bash
git pull origin main
```

### 2. Install dependencies
```bash
npm run install-all
```

### 3. Run migrations (runs automatically on backend start, or manually):
```bash
cd backend
NODE_ENV=production npx sequelize-cli db:migrate
```

**New migrations in this release:**
- `20240218000001-add-supplier-profile-questions.js` – Adds Q2–Q11 text columns to `suppliers`
- `20260215000001-add-attached-document-to-questions.js` – Adds `attachedDocumentId` to `questions`

### 4. Build frontend
```bash
cd frontend
npm run build
```

### 5. Start backend (production)
```bash
cd backend
NODE_ENV=production npm start
```

The start script runs migrations, CPV/NUTS/prod questionnaire seeds, then starts the server.

### 5b. Reset demo / E2E test data (optional, destructive)

Wipes prior `@prequaliq.demo` / `*.e2e` buyers & suppliers and reloads the rich demo + AI test kit (unique underlag per procedure, Maria/Jonas/Anna, `[AI TEST]` award procedures).

```bash
cd backend
# One-shot after deploy:
npm run seed-demo

# Or enable on every start (Railway / env):
SEED_DEMO_DATA=1 NODE_ENV=production npm start
```

Keeps `admin@prequaliq.com` and CPV/NUTS catalogs. **Do not** set `SEED_DEMO_DATA=1` if you have real customer data in the same database.

### 6. Serve frontend
Serve the `frontend/dist` folder with your web server (Nginx, Vercel, Railway static, etc.)

## Rollback (if needed)

```bash
cd backend
NODE_ENV=production npx sequelize-cli db:migrate:undo
# Repeat for each migration to undo
```

## Changes in this release

- Admin: Full supplier edit modal (all profile fields + Q2–Q11)
- Entity: Attach document to questionnaire questions; suppliers can view/download
- Entity: Remove Profile documents section from supplier detail modal
- Entity: Questionnaire fetch robustness (auth guard, fallback on Document include failure)
- Supplier: View attached documents on questionnaire questions
- Translations: New validation keys (en/sv)
- Profile changes: Sets supplier status to pending, sends email notifications
