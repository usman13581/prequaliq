# PrequaliQ Supplier Qualification & Procurement Platform

A centralized procurement and supplier qualification platform connecting Admin, Procuring Entities, and Suppliers.

> **Full development guide (tech stack, UI standards, setup, deployment):** see **[app_development.md](./app_development.md)**

## Features

- **Multi-role Access Control**: Admin, Procuring Entity, and Supplier roles
- **Supplier Onboarding**: Complete workflow from registration to approval
- **CPV-based Classification**: Common Procurement Vocabulary code system
- **Dynamic Questionnaires**: Create questionnaires linked to CPV codes
- **Document Management**: Upload and manage company documents
- **Supplier Search & Filtering**: Advanced search by multiple parameters

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Sequelize ORM
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Authentication**: JWT-based authentication
- **File Uploads**: Multer

## Installation

See [SETUP.md](./SETUP.md) for detailed setup instructions.

Quick start:
1. Install dependencies:
```bash
npm run install-all
```

2. Set up database:
- Create PostgreSQL database
- Copy `backend/.env.example` to `backend/.env` and update credentials
- Run migrations: `cd backend && npm run migrate`
- Seed CPV codes: `cd backend && npm run seed`

3. Start development servers:
```bash
npm run dev
```

## Project Structure

```
prequaliq-platform/
├── backend/          # Node.js/Express API
├── frontend/         # React application
└── database/         # Database schemas and migrations
```

## User Roles

### Admin
- Create and manage procuring entities and suppliers
- Review and approve supplier profiles
- Full system control

### Procuring Entity
- View approved suppliers
- Create dynamic questionnaires
- Search and filter suppliers

### Supplier
- Complete profile and upload documents
- Select CPV categories
- Respond to questionnaires
- **AI profile assist**: upload qualification PDFs; GPU extracts fields for human review (insurance, company, certificates, financials)

## AI document extraction (optional)

Self-hosted on a Trooper GPU with Ollama. PDF text is extracted on the backend; only plain text is sent to the GPU.

| Layer | URL |
|-------|-----|
| GPU Swagger docs | http://connect01.trooper.ai:22528/docs |
| GPU endpoint catalog | http://connect01.trooper.ai:22528/endpoints |
| Backend AI status (supplier JWT) | http://localhost:5001/api/supplier/ai/status |
| Backend AI catalog (supplier JWT) | http://localhost:5001/api/supplier/ai/endpoints |

Configure `AI_SERVICE_URL` and `AI_API_KEY` in `backend/.env`. See [ai-service/README.md](./ai-service/README.md) for GPU deploy.

**Supplier UI:** Profile tab → **AI profile assist** (multi-PDF) or insurance section → **AI suggest from PDF** (single insurance PDF). All suggestions require manual confirmation before save.

## Local Deployment (Production-style)

To run PrequaliQ on your own server (backend + built frontend):

1. **Backend**
   - `cd backend`
   - Install deps: `npm install`
   - Copy `.env.example` → `.env` and set DB + `PORT` (e.g. 5001)
   - Create DB and run migrations: `npx sequelize-cli db:migrate`
   - (Optional) seed data: `npx sequelize-cli db:seed:all`
   - Start API (or via PM2): `npm start`

2. **Frontend**
   - `cd frontend`
   - Install deps: `npm install`
   - Copy `.env.example` → `.env` and set:
     - `VITE_API_URL=http://<server-ip>:5001/api`
     - `VITE_UPLOADS_URL=http://<server-ip>:5001/uploads`
   - Build static files: `npm run build`
   - Serve `frontend/dist` with any static server or reverse proxy (e.g. Nginx) pointed at your backend API.
