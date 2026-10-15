# Multi-Org & Departments

- **Module name (EN):** Multi-Org & Departments
- **Feature key:** `platform.multi_org`
- **i18n:** `modules.platform.multi_org.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `partial`
- **Layer:** `platform`
- **Covers competitor:** both
- **Who:** admin (Cfg), buyer (P), supplier (P org users)
- **Access:** Orgs have departments/users; admins of org manage members.
- **Lifecycle step:** 0

## What it does

Organization structure for buyers and suppliers: multiple users, departments, optional handläggare assignment.

## User journey

Org admin invites user → assign department/role → user sees shared org tenders/profile scope.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ContentCard, SlimListRow, TextField, PrimaryButton, Modal, Toast**.

## Admin controls

Feature key(s): `platform.multi_org`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign handläggare / multi-user orgs.

## AI enhancement (extra)

None

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

01, 06, 07
