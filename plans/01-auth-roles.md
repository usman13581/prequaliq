# Auth & Roles

- **Module name (EN):** Auth & Roles
- **Feature key:** `platform.auth_roles`
- **i18n:** `modules.platform.auth_roles.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `platform`
- **Covers competitor:** both
- **Who:** admin (P), buyer (S), supplier (S)
- **Access:** All roles authenticate; role gates portal routes.
- **Lifecycle step:** 0

## What it does

Login, session, JWT/auth context, role-based route protection for admin, procuring entity (buyer), and supplier portals.

## User journey

User opens `/login` → credentials → redirected to role dashboard. Unauthorized roles blocked by ProtectedRoute.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, TextField, PrimaryButton, Toast, AlertBanner**.

## Admin controls

Feature key(s): `platform.auth_roles`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

Standard portal login (TendSign/e-Avrop class).

## AI enhancement (extra)

None

## Vibe build notes

Keep existing Login + AuthContext; ensure buyer=procuringEntity naming in docs only.

## Depends on

None
