# Publish & Direct Inform (Annons)

- **Module name (EN):** Publish & Direct Inform (Annons)
- **Feature key:** `tender.publish`
- **i18n:** `modules.tender.publish.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** buyer (P), supplier (S receives/sees), admin (Cfg)
- **Access:** Buyer publishes or directly informs suppliers; suppliers see/receive notice.
- **Lifecycle step:** 3

## What it does

Publish tender announcement and/or directly inform selected suppliers. Status → published.

## User journey

Buyer reviews underlag → Publish modal → confirm → StatusBadge published → notifications to suppliers.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **ContentCard, Modal, PrimaryButton, CancelButton, StatusBadge, Toast, SlimListRow, AiAssistBar**.

## Admin controls

Feature key(s): `tender.publish`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign Annonsera / direktinformera.

## AI enhancement (extra)

37 AI Announcement Text Draft

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

11, 28
