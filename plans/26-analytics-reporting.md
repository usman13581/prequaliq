# Analytics & Reporting

- **Module name (EN):** Analytics & Reporting
- **Feature key:** `platform.analytics`
- **i18n:** `modules.platform.analytics.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** both
- **Who:** buyer (P), supplier (S own stats), admin (Cfg)
- **Access:** Dashboards and exports scoped to role.
- **Lifecycle step:** 0–11

## What it does

KPIs and reports: volumes, cycle times, win rates (supplier), spend (buyer).

## User journey

User opens Reports → StatCards + charts/lists → export.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, StatCard, ContentCard, SlimListRow, PrimaryButton, DateField**.

## Admin controls

Feature key(s): `platform.analytics`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

Reporting modules in market tools.

## AI enhancement (extra)

Summaries optional

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

16, 20, 25
