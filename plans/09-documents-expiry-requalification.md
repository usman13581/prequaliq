# Documents, Expiry & Requalification

- **Module name (EN):** Documents, Expiry & Requalification
- **Feature key:** `profile.documents`
- **i18n:** `modules.profile.documents.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `partial`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** supplier (P), buyer (S view in prövning), admin (Cfg)
- **Access:** Supplier uploads/manages docs and expiry; buyer views during qualification; admin may force requal.
- **Lifecycle step:** 0, 6

## What it does

Document vault with expiry dates, alerts, and requalification_required status.

## User journey

Supplier uploads doc + DateField expiry → AlertBanner when near expiry → requal flow → admin/buyer sees status.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **ContentCard, SlimListRow, DateField, PrimaryButton, AlertBanner, StatusBadge, Toast**.

## Admin controls

Feature key(s): `profile.documents`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

Document validity / omprövning patterns.

## AI enhancement (extra)

34 can flag expired docs

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

07, 03
