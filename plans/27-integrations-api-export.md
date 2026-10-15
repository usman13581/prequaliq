# Integrations / API / Export

- **Module name (EN):** Integrations / API / Export
- **Feature key:** `platform.integrations`
- **i18n:** `modules.platform.integrations.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `partial`
- **Layer:** `parity`
- **Covers competitor:** e-Avrop
- **Who:** buyer (P), supplier (S export own), admin (Cfg)
- **Access:** API keys/exports for org data; supplier profile export already partial.
- **Lifecycle step:** 0–11

## What it does

Export and API hooks for integrating with other systems; extend live profile export.

## User journey

Org settings → API/export → download or token → external system consumes.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **ContentCard, TextField, PrimaryButton, Modal, Toast**.

## Admin controls

Feature key(s): `platform.integrations`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

e-Avrop API / kopplingar.

## AI enhancement (extra)

None

## Vibe build notes

Keep SupplierExportProfileModal pattern; generalize.

## Depends on

01, 04
