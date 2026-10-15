# Sealed Bid & Deadline Lock

- **Module name (EN):** Sealed Bid & Deadline Lock
- **Feature key:** `tender.sealed_deadline`
- **i18n:** `modules.tender.sealed_deadline.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** supplier (P submit sealed), buyer (P open after deadline), admin (Cfg)
- **Access:** Bids sealed until deadline; buyer cannot view content early; post-deadline unlock.
- **Lifecycle step:** 5–6

## What it does

Sekretess: encrypt/hide bid content until deadline; hard lock on submit window.

## User journey

Supplier submits → StatusBadge sealed → clock hits deadline → buyer unlock/open → prövning starts.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **StatusBadge, DateField, Modal, AlertBanner, PrimaryButton, Toast**.

## Admin controls

Feature key(s): `tender.sealed_deadline`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign sekretess / anbudssekretess.

## AI enhancement (extra)

None

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

16, 10
