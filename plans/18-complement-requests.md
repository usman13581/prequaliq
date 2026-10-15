# Complement Requests

- **Module name (EN):** Complement Requests
- **Feature key:** `tender.complements`
- **i18n:** `modules.tender.complements.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** buyer (P request), supplier (P respond), admin (Cfg)
- **Access:** Buyer requests komplettering; supplier responds within window.
- **Lifecycle step:** 6

## What it does

Formal complement request/response after bid open, with deadline and audit.

## User journey

Buyer Request complement → supplier notified → supplier uploads/answers → buyer reviews.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **SlimListRow, Modal, TextField, DateField, PrimaryButton, StatusBadge, Toast, AlertBanner**.

## Admin controls

Feature key(s): `tender.complements`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign komplettering.

## AI enhancement (extra)

Optional draft request text

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

16, 17, 28
