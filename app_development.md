# App Development Guide

Single reference for **tech stack**, **project structure**, **UI standards**, **API patterns**, **setup**, and **deployment**. Use this when starting a **new full-stack app** or extending an existing one built with this stack.

---

## 1. Application pattern

Typical shape: **multi-role web app** with authenticated portals and public auth pages.

| Layer | Pattern |
|-------|---------|
| **Public** | `/login`, `/register` — marketing-style UI |
| **Portals** | One route prefix per role (e.g. `/admin`, `/app`, `/client`) |
| **API** | REST under `/api/*`, JWT auth, role-based guards |

Define your own roles, routes, and domain models — keep the **shell** (layout, auth, API client, i18n) consistent.

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
| **exceljs / pdfkit** | Optional exports |

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI |
| **TypeScript** | Type safety |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Styling |
| **React Router v6** | Routing |
| **react-i18next** | Translations (e.g. EN / SV) |
| **axios** | API client |
| **react-query** | Server state (light usage) |
| **lucide-react** | Icons |
| **date-fns** | Dates |
| **react-datepicker** | Branded date picker |

### Infrastructure (production)
| Service | Use |
|---------|-----|
| **Railway** (or similar) | API + frontend + PostgreSQL |
| **GitHub** | Source control |

---

## 3. Project structure

```
your-app/
├── app_development.md     # This file
├── README.md
├── package.json           # Root: npm run dev (concurrent backend + frontend)
├── backend/
│   ├── server.js          # Express entry, route mounting
│   ├── routes/            # auth, admin, domain routes
│   ├── controllers/
│   ├── models/            # Sequelize models
│   ├── middleware/        # auth.js (JWT + authorize roles)
│   ├── migrations/        # Sequelize migrations
│   ├── services/          # email, exports, schedulers
│   ├── scripts/           # migrate, seed, bootstrap users
│   ├── uploads/           # Uploaded files (gitignored)
│   └── .env
└── frontend/
    ├── src/
    │   ├── App.tsx        # Routes + providers
    │   ├── index.css      # Design tokens, portal styles, buttons
    │   ├── contexts/      # AuthContext, ToastContext
    │   ├── services/api.ts
    │   ├── pages/         # Per-role dashboards, Login, Register
    │   ├── components/
    │   │   ├── ui/        # PortalLayout, PortalSidebar, Logo, ListPagination
    │   │   └── [domain]/  # Feature-specific components
    │   ├── hooks/         # useListPagination, etc.
    │   ├── lib/           # Shared helpers
    │   └── locales/       # en.json, sv.json (or your locales)
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
  { id: 'home', label: t('portal.navHome'), icon: LayoutDashboard },
  { id: 'profile', label: t('nav.profile'), icon: User },
  { id: 'items', label: t('portal.navItems'), icon: FileText },
];

<PortalLayout
  logoTo="/app"
  logoSubtitle={t('portal.title')}
  roleLabel={t('portal.roleLabel')}
  sidebarItems={sidebarItems}
  activeTab={activeTab}
  onTabSelect={setActiveTab}
  sidebarVariant="compact"  // or "wide"
>
  {activeTab === 'home' && <HomeTab />}
</PortalLayout>
```

**Patterns:**
- Wrapper: `font-app min-h-screen app-page-bg`
- Header: `portal-top-header` (light gradient)
- Sidebar: `portal-sidebar` (navy vertical rail, icon + label)
- Main content: reduced padding (`p-3 sm:p-4 lg:p-5`), tab content only scrolls where needed
- Default tab: **Home** with dashboard insights (stat cards)

### 4.4 Buttons

Use CSS classes from `index.css` (not ad-hoc colors):

| Class | Use |
|-------|-----|
| `btn-save` / `btn-update` | Primary action (blue) |
| `btn-approve` | Positive confirm (green) |
| `btn-reject` | Caution action (orange) |
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

**Stat cards (home insights):** reusable grid of metric cards — title, value, optional trend/icon

**Slim list rows:** title + meta on the left, status badge + actions on the right

**Pagination:** `ListPagination` + `useListPagination` hook — **10 items per page** default

```tsx
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../../components/ui/ListPagination';

const { page, setPage, paginatedItems, total, pageSize } = useListPagination(items);
```

**Empty states:** dashed border, icon, title + hint

### 4.7 Auth pages

- `font-website` on page wrapper
- `login-page-bg` full-screen background
- `auth-card` for form container
- `LanguageSwitcher` in corner

### 4.8 i18n

- All user-visible strings via `useTranslation()` → `t('key')`
- Files: `frontend/src/locales/en.json`, `sv.json` (add locales as needed)
- Add keys to **every** locale file
- Namespace examples: `common.*`, `nav.*`, `buttons.*`, `portal.*`, `adminPortal.*`

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

Define roles in your User model (e.g. `admin`, `user`, `manager`) and match them in `ProtectedRoute`.

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

Each portal dashboard is one component with tab state:

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
createdb your_app_db

# 4. Migrate
cd backend && npm run migrate

# 5. (Optional) seed data
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
| `DATABASE_URL` | Alternative (hosted DB in production) |
| `JWT_SECRET` | Required — strong random string |
| `JWT_EXPIRE` | Default `7d` |
| `FRONTEND_URL` | CORS origin (default `http://localhost:5173`) |
| `UPLOAD_PATH` | `./uploads` |
| `MAX_FILE_SIZE` | Bytes (default 10MB) |
| `EMAIL_*` / SMTP | Transactional email |

**Frontend (`frontend/.env`):**

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Prod: `https://your-api.example.com/api` |
| `VITE_UPLOADS_URL` | Prod: `https://your-api.example.com/uploads` |

### Bootstrap admin user

```bash
cd backend && npm run create-admin
```

Or `POST /api/auth/register` with `"role": "admin"` (if your registration flow allows it).

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

Mount domain routes under `/api`:

```
/api/auth          # register, login, profile
/api/admin         # admin-only resources
/api/[resource]    # your domain routes
```

Static uploads: `/uploads`

### 7.2 Auth middleware

```js
const { authenticate, authorize } = require('../middleware/auth');
router.use(authenticate);
router.use(authorize('admin')); // role guard — use your role names
```

### 7.3 Migrations

```bash
cd backend
npm run migrate                    # dev
NODE_ENV=production npx sequelize-cli db:migrate   # prod manual
```

Production `npm start` can run `scripts/runMigrations.js` automatically on boot.

### 7.4 API conventions

| Pattern | Example |
|---------|---------|
| Health | `GET /api/health` |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/profile` |
| List | `GET /api/[resource]` |
| Detail | `GET /api/[resource]/:id` |
| Create | `POST /api/[resource]` |
| Update | `PUT` or `PATCH /api/[resource]/:id` |
| Delete | `DELETE /api/[resource]/:id` |
| Dashboard stats | `GET /api/[role]/dashboard/stats` |
| Uploads | `POST /api/documents` + `GET /api/documents`, serve from `/uploads` |

Use consistent JSON shapes, HTTP status codes, and error messages. Protect routes with `authenticate` + `authorize(role)`.

---

## 8. Production deployment

### Pre-deployment
1. Backup production database
2. Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, email vars on host
3. Frontend build vars: `VITE_API_URL`, `VITE_UPLOADS_URL`

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

Serve `frontend/dist` via static hosting (same platform, CDN, or Nginx reverse proxy to API).

### Rollback migration

```bash
cd backend
NODE_ENV=production npx sequelize-cli db:migrate:undo
```

---

## 9. Starting a new app with this stack

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
6. Add `yourRolePortal.*` keys in locale files
7. Optional: `GET /api/your-role/dashboard/stats` + Home tab with stat cards

### 9.3 New list page (template)

1. Fetch data in `useEffect` when tab is active
2. Use `useListPagination(items, 10)`
3. Map items to a slim row component (title/meta left, status + actions right)
4. Add `ListPagination` at bottom
5. Place status badges before action buttons on the right

### 9.4 Code style

- **TypeScript** on frontend; **JavaScript** on backend (CommonJS)
- Prefer functional React components + hooks
- No inline user-facing strings in JSX — use `t()`
- Keep dashboard files tab-isolated; extract components when reused 2+ times
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
- Home tabs use stat card grid for insights
- Lists: slim rows + ListPagination (10/page)
- All strings in locale JSON files (every language)

Read app_development.md in repo root for full details.
```

---

## 11. Key files (quick index)

| Topic | File |
|-------|------|
| Design tokens | `frontend/src/index.css` |
| Tailwind theme | `frontend/tailwind.config.js` |
| Portal shell | `frontend/src/components/ui/PortalLayout.tsx` |
| Sidebar | `frontend/src/components/ui/PortalSidebar.tsx` |
| Pagination hook | `frontend/src/hooks/useListPagination.ts` |
| Pagination UI | `frontend/src/components/ui/ListPagination.tsx` |
| API client | `frontend/src/services/api.ts` |
| Auth | `frontend/src/contexts/AuthContext.tsx` |
| Routes | `frontend/src/App.tsx` |
| Migrations | `backend/migrations/` |
| Auth middleware | `backend/middleware/auth.js` |

---

*Reusable guide for full-stack apps on this stack — copy `app_development.md` into any new project repo.*
