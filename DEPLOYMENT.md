# PrequaliQ Production Deployment Guide

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

The start script runs migrations, seed scripts, then starts the server.

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
