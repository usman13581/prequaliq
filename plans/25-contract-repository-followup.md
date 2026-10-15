# Contract Repository & Follow-up

- **Module name (EN):** Contract Repository & Follow-up
- **Feature key:** `contracts.repository`
- **i18n:** `modules.contracts.repository.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** e-Avrop
- **Who:** buyer (P), supplier (S own contracts), admin (Cfg)
- **Access:** Buyer stores/follows contracts; suppliers see own; searchable for verksamhetsbeställare-style use.
- **Lifecycle step:** 10–11

## What it does

Avtalsdatabas: contract records, dates, parties, documents, follow-up reminders.

## User journey

After award → create contract → list/search → DateField renewals → AlertBanner before expiry.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, SlimListRow, ContentCard, SearchSelect, DateField, StatusBadge, AlertBanner, Pagination**.

## Admin controls

Feature key(s): `contracts.repository`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

e-Avrop avtalsdatabas.

## AI enhancement (extra)

Optional expiry risk

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

20, 21
