# PrequaliQ — App Development Guide

Single reference for **tech stack**, **project structure**, **UI standards**, **API patterns**, **setup**, and **deployment**. Use this when building new features in PrequaliQ or spinning up a **new app with the same stack and UI**.

---

## 1. Product overview

**PrequaliQ** is a supplier qualification and procurement platform with three roles:

| Role | Route prefix | Purpose |
|------|--------------|---------|
| **Admin** | `/admin` | Manage suppliers & entities, approve profiles, platform insights |
| **Procuring entity** | `/procuring-entity` | Questionnaires, supplier search, profile |
| **Supplier** | `/supplier` | Profile, CPV/NUTS, questionnaires, documents |

**Auth pages:** `/login`, `/register` (public, marketing-style UI).

---

## 2. Tech stack

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** (v18+) | Runtime |
| **Express** | HTTP API |
| **PostgreSQL** | Database |
| **Sequelize** | ORM + migrations |
| **JWT** | Authentication (`jsonwebtoken`) |
| **Multer** | File uploads |
| **bcryptjs** | Password hashing |
| **nodemailer / resend** | Email |
| **exceljs / pdfkit** | Supplier profile export |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **React Router v6** | Routing |
| **react-i18next** | EN / SV translations |
| **axios** | API client |
| **react-query** | Server state (light usage) |
| **lucide-react** | Icons |
| **date-fns** | Dates |
| **react-datepicker** | Branded date picker |

### Infrastructure (production)
| Service | Use |
|---------|-----|
| **Railway** | API + frontend + PostgreSQL |
| **GitHub** | `usman13581/prequaliq` |

---

## 3. Project structure

```
prequaliq-platform/
├── app_development.md     # This file
├── README.md
├── SETUP.md               # Legacy — see §6 here
├── DEPLOYMENT.md          # Legacy — see §8 here
├── package.json           # Root: npm run dev (concurrent)
├── backend/
│   ├── server.js          # Express entry, route mounting
│   ├── routes/            # auth, admin, supplier, procuringEntity, questionnaires, documents, cpv, nuts
│   ├── controllers/
│   ├── models/            # Sequelize models
│   ├── middleware/        # auth.js (JWT + authorize roles)
│   ├── migrations/        # Sequelize migrations
│   ├── services/          # email, exports, completeness, schedulers
│   ├── scripts/           # migrate, seed, ensureAdmin
│   ├── uploads/           # Uploaded files (gitignored)
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.tsx        # Routes + providers
    │   ├── index.css      # Design tokens, portal styles, buttons
    │   ├── contexts/      # AuthContext, ToastContext
    │   ├── services/api.ts
    │   ├── pages/         # admin/, supplier/, procuringEntity/, Login, Register
    │   ├── components/
    │   │   ├── ui/        # PortalLayout, PortalSidebar, Logo, ListPagination
    │   │   ├── admin/     # AdminHomeTab, AdminStatCards
    │   │   ├── supplier/
    │   │   ├── procuringEntity/
    │   │   └── questionnaires/  # QuestionnaireSlimRow
    │   ├── hooks/         # useListPagination
    │   ├── lib/           # adminStats, helpers
    │   └── locales/       # en.json, sv.json
    ├── tailwind.config.js
    └── .env                 # VITE_API_URL, VITE_UPLOADS_URL
```

---

## 4. UI & design standards

### 4.1 Typography

| Context | Class / token | Font |
|---------|---------------|------|
| **App portals** (dashboards) | `font-app` | **Inter** |
| **Marketing / login / register** | `font-website` | **Plus Jakarta Sans** |

Never use Plus Jakarta on portal dashboards. Always use Inter inside `PortalLayout`.

### 4.2 Color palette

Defined in `frontend/src/index.css` (`:root`) and `frontend/tailwind.config.js`:

| Token | Hex | Usage |
|-------|-----|--------|
| `background` | `#fafbfc` | Page background |
| `foreground` | `#0b1220` | Primary text |
| `primary` / `primary-800` | `#0f2744` | Navy brand, sidebar |
| `primary-700` | `#1a3a5c` | Gradients |
| `accent` | `#2563eb` | Primary actions, links |
| `accent-hover` | `#1d4ed8` | Button hover |
| `accent-subtle` | `#eff6ff` | Light blue surfaces |
| `muted` | `#5c6b7a` | Secondary text |
| `border` | `#e8ecf1` | Card borders |
| `surface` | `#f4f6f9` | Subtle backgrounds |
| `card` | `#ffffff` | Cards |

Use Tailwind classes: `text-foreground`, `text-muted`, `border-border`, `bg-surface`, `bg-primary-600`, etc.

### 4.3 Layout — portal shell

All role dashboards use **`PortalLayout`** + **`PortalSidebar`**:

```tsx
import { PortalLayout } from '../../components/ui/PortalLayout';
import { LayoutDashboard, User, FileText } from 'lucide-react';

const sidebarItems = [
  { id: 'home', label: t('entityPortal.navHome'), icon: LayoutDashboard },
  { id: 'profile', label: t('nav.profile'), icon: User },
];

<PortalLayout
  logoTo="/supplier"
  logoSubtitle={t('nav.supplierPortal')}
  roleLabel={t('nav.supplier')}
  sidebarItems={sidebarItems}
  activeTab={activeTab}
  onTabSelect={setActiveTab}
  sidebarVariant="compact"  // or "wide" for procuring entity
>
  {activeTab === 'home' && <HomeTab />}
</PortalLayout>
```

**Patterns:**
- Wrapper: `font-app min-h-screen app-page-bg`
- Header: `portal-top-header` (light gradient)
- Sidebar: `portal-sidebar` (navy vertical rail, icon + label)
- Main content: reduced padding (`p-3 sm:p-4 lg:p-5`), tab content only scrolls where needed
- Default tab: **Home** with dashboard insights (admin + procuring entity + supplier overview)

**Reference implementations:**
- `frontend/src/pages/admin/Dashboard.tsx`
- `frontend/src/pages/supplier/Dashboard.tsx`
- `frontend/src/pages/procuringEntity/Dashboard.tsx`

### 4.4 Buttons

Use CSS classes from `index.css` (not ad-hoc colors):

| Class | Use |
|-------|-----|
| `btn-save` / `btn-update` | Primary action (blue) |
| `btn-approve` | Approve (green) |
| `btn-reject` | Reject (orange) |
| `btn-cancel` | Secondary cancel |
| `btn-delete` | Destructive |
| `btn-close` | Neutral dismiss |

Logout in header: red gradient button (see `PortalLayout`).

### 4.5 Forms & inputs

- Use `input-brand` for standard fields
- Use `DateOnlyPicker` for date-only fields (branded calendar)
- Labels: `text-sm font-medium text-foreground`
- Validation messages: red subtle panels or toast

### 4.6 Cards & lists

**Stat cards (home insights):** `AdminStatCard`, `AdminStatsGrid` from `components/admin/AdminStatCards.tsx`

**Slim list rows:** `QuestionnaireSlimRow` — title + meta left, status badge + actions right

**Pagination:** `ListPagination` + `useListPagination` hook — **10 items per page** default

```tsx
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../../components/ui/ListPagination';

const { page, setPage, paginatedItems, total, pageSize } = useListPagination(items);
```

**Empty states:** dashed border, icon, title + hint (see questionnaire empty states in dashboards)

### 4.7 Auth pages

- `font-website` on page wrapper
- `login-page-bg` full-screen background
- `auth-card` for form container
- `LanguageSwitcher` in corner

### 4.8 i18n

- All user-visible strings via `useTranslation()` → `t('key')`
- Files: `frontend/src/locales/en.json`, `sv.json`
- Add keys to **both** languages
- Namespace examples: `common.*`, `nav.*`, `buttons.*`, `adminPortal.*`, `entityPortal.*`, `supplierPortal.*`

### 4.9 Icons

Use **lucide-react** only. Size: 14–20px in compact rows, 20–22px in headers.

---

## 5. Frontend architecture patterns

### 5.1 Routing (`App.tsx`)

```tsx
<Route path="/login" element={<Login />} />
<Route path="/admin/*" element={
  <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>
} />
```

Roles: `admin` | `supplier` | `procuring_entity`

### 5.2 Auth (`AuthContext`)

- Token in `localStorage` (`token`)
- `api.defaults.headers.Authorization` set on login
- `ProtectedRoute` waits for `loading`, then checks `user.role`
- Login redirect by role after success

### 5.3 API client (`services/api.ts`)

- Dev: `baseURL = '/api'` (Vite proxy)
- Prod: `VITE_API_URL` (must end with `/api`)
- 401 → clear token, redirect to `/login` (except password reset)

### 5.4 Dashboard tab pattern

Each portal dashboard is one large component with:

```tsx
const [activeTab, setActiveTab] = useState('home');

useEffect(() => {
  if (!user?.id) return;
  if (activeTab === 'home') fetchDashboardStats();
  else if (activeTab === 'profile') fetchProfile();
  // ...
}, [activeTab, user?.id]);
```

Fetch data **per tab** — don't load everything on mount.

### 5.5 Toasts

`useToast()` from `ToastContext` — `showToast(message, 'success' | 'error')`

---

## 6. Local development setup

### Prerequisites
- Node.js **v18+**
- PostgreSQL **v12+**
- npm

### Quick start

```bash
# 1. Install all dependencies
npm run install-all

# 2. Backend env
cp backend/.env.example backend/.env
# Edit DB credentials + JWT_SECRET

# 3. Create database
createdb prequaliq_db

# 4. Migrate
cd backend && npm run migrate

# 5. (Optional) seed CPV
npm run seed

# 6. Run both servers from root
cd .. && npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000 or 5001 (check `PORT` in `.env`) |
| Health | `GET /api/health` |

### Environment variables

**Backend (`backend/.env`):**

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default 5000) |
| `NODE_ENV` | `development` / `production` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL |
| `DATABASE_URL` | Alternative (Railway production) |
| `JWT_SECRET` | Required — strong random string |
| `JWT_EXPIRE` | Default `7d` |
| `FRONTEND_URL` | CORS origin (default `http://localhost:5173`) |
| `UPLOAD_PATH` | `./uploads` |
| `MAX_FILE_SIZE` | Bytes (default 10MB) |
| `EMAIL_*` / SMTP | See `backend/EMAIL_SETUP.md` |

**Frontend (`frontend/.env`):**

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Prod: `https://your-api.railway.app/api` |
| `VITE_UPLOADS_URL` | Prod: `https://your-api.railway.app/uploads` |

### Create admin user

```bash
cd backend && npm run create-admin
```

Or `POST /api/auth/register` with `"role": "admin"` (if registration allows).

### Troubleshooting

| Issue | Fix |
|-------|-----|
| DB connection failed | Check Postgres running + `.env` credentials |
| Migration errors | Run migrations in order; check `SequelizeMeta` table |
| Upload fails | Ensure `backend/uploads/` exists and is writable |
| 401 on API | Check `JWT_SECRET`, token in localStorage, CORS `FRONTEND_URL` |
| CORS in prod | Set `FRONTEND_URL` to exact frontend origin |

---

## 7. Backend architecture

### 7.1 Route mounting (`server.js`)

```
/api/auth
/api/admin
/api/procuring-entity
/api/supplier
/api/questionnaires
/api/documents
/api/cpv
/api/nuts
```

Static uploads: `/uploads`

### 7.2 Auth middleware

```js
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate);
router.use(authorize('procuring_entity')); // role guard
```

### 7.3 Migrations

```bash
cd backend
npm run migrate                    # dev
NODE_ENV=production npx sequelize-cli db:migrate   # prod manual
```

Production `npm start` runs `scripts/runMigrations.js` automatically.

### 7.4 Key API endpoints

**Auth**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`

**Admin**
- `GET /api/admin/dashboard/stats`
- `GET /api/admin/suppliers`
- `PUT /api/admin/suppliers/:id/review`
- `GET /api/admin/procuring-entities`

**Supplier**
- `GET /api/supplier/dashboard` (overview)
- `GET /api/supplier/profile`
- `PUT /api/supplier/profile`
- `GET /api/supplier/questionnaires/active`
- `GET /api/supplier/questionnaires/history`

**Procuring entity**
- `GET /api/procuring-entity/dashboard/stats`
- `GET /api/procuring-entity/profile`
- `GET /api/procuring-entity/suppliers`
- `GET /api/questionnaires` (entity's questionnaires)

**Questionnaires**
- `POST /api/questionnaires` — create
- `GET /api/questionnaires/:id/responses`
- `POST /api/questionnaires/:id/responses` — supplier submit

**Documents**
- `POST /api/documents/supplier`
- `GET /api/documents`
- `DELETE /api/documents/:id`

**CPV / NUTS**
- `GET /api/cpv`
- `GET /api/nuts`

---

## 8. Production deployment

### Pre-deployment
1. Backup production database
2. Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, email vars on Railway
3. Frontend: `VITE_API_URL`, `VITE_UPLOADS_URL`

### Steps

```bash
git pull origin main
npm run install-all

cd backend
NODE_ENV=production npx sequelize-cli db:migrate   # or auto on start

cd ../frontend
npm run build    # outputs frontend/dist

cd ../backend
NODE_ENV=production npm start
```

Serve `frontend/dist` via Railway static service or Nginx.

**Production URLs (current):**
- API: `https://prequaliq-production.up.railway.app`
- Frontend: Railway static deployment

### Rollback migration

```bash
cd backend
NODE_ENV=production npx sequelize-cli db:migrate:undo
```

---

## 9. Building a new app with this stack

### 9.1 Copy checklist

1. **Monorepo layout:** `backend/` + `frontend/` + root `package.json` with `concurrently`
2. **Copy UI foundation:**
   - `frontend/src/index.css`
   - `frontend/tailwind.config.js`
   - `frontend/src/components/ui/PortalLayout.tsx`
   - `frontend/src/components/ui/PortalSidebar.tsx`
   - `frontend/src/components/ui/Logo.tsx`
   - `frontend/src/components/LanguageSwitcher.tsx`
   - `frontend/src/contexts/AuthContext.tsx`
   - `frontend/src/services/api.ts`
   - `frontend/src/components/ProtectedRoute.tsx`
3. **Copy i18n setup** (`i18n.ts` + locale file structure)
4. **Backend:** `server.js` pattern, `middleware/auth.js`, Sequelize config
5. **Replace** domain models, routes, pages — keep shell patterns

### 9.2 New portal role (template)

1. Add role to User model enum
2. Create `routes/yourRole.js` + controller
3. Mount in `server.js`
4. Create `pages/yourRole/Dashboard.tsx` with `PortalLayout`
5. Add route in `App.tsx` with `ProtectedRoute`
6. Add `yourRolePortal.*` keys in `en.json` / `sv.json`
7. Optional: `GET /api/your-role/dashboard/stats` + Home tab

### 9.3 New list page (template)

1. Fetch data in `useEffect` when tab active
2. Use `useListPagination(items, 10)`
3. Map to `QuestionnaireSlimRow` or similar slim row
4. Add `ListPagination` at bottom
5. Status badges before action buttons on the right

### 9.4 Code style

- **TypeScript** on frontend; **JavaScript** on backend (CommonJS)
- Prefer functional React components + hooks
- No inline English strings in JSX — use `t()`
- Keep dashboard files large but tab-isolated; extract components when reused 2+ times
- Use existing button classes — don't invent new primary colors

---

## 10. AI agent handoff prompt

Paste this when starting a new session or new app:

```
Stack: Node/Express/PostgreSQL/Sequelize backend, React/TypeScript/Vite/Tailwind frontend.
Auth: JWT. i18n: react-i18next (en + sv).

UI rules:
- Portals use PortalLayout + PortalSidebar + font-app (Inter)
- Auth/marketing uses font-website (Plus Jakarta Sans)
- Colors: navy primary (#0f2744), blue accent (#2563eb)
- Buttons: btn-save, btn-delete, btn-cancel classes
- Home tabs use AdminStatCard pattern for insights
- Lists: slim rows + ListPagination (10/page)
- All strings in en.json and sv.json

Read app_development.md in repo root for full details.
Reference: frontend/src/pages/supplier/Dashboard.tsx
```

---

## 11. Related files (quick index)

| Topic | File |
|-------|------|
| Design tokens | `frontend/src/index.css` |
| Tailwind theme | `frontend/tailwind.config.js` |
| Portal shell | `frontend/src/components/ui/PortalLayout.tsx` |
| Sidebar | `frontend/src/components/ui/PortalSidebar.tsx` |
| Stat cards | `frontend/src/components/admin/AdminStatCards.tsx` |
| Slim rows | `frontend/src/components/questionnaires/QuestionnaireSlimRow.tsx` |
| Pagination | `frontend/src/hooks/useListPagination.ts` |
| API | `frontend/src/services/api.ts` |
| Auth | `frontend/src/contexts/AuthContext.tsx` |
| Routes | `frontend/src/App.tsx` |
| Email setup | `backend/EMAIL_SETUP.md` |
| Migrations | `backend/migrations/` |

---

*Last updated: merged from README.md, SETUP.md, DEPLOYMENT.md, and current portal UI patterns.*
