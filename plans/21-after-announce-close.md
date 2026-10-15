# After-Announce & Close

- **Module name (EN):** After-Announce & Close
- **Feature key:** `tender.after_announce_close`
- **i18n:** `modules.tender.after_announce_close.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** buyer (P), supplier (S see outcome), admin (Cfg)
- **Access:** Buyer closes procedure / after-announces; suppliers see closed outcome.
- **Lifecycle step:** 10

## What it does

Close procurement, optional efterannonsering, archive status.

## User journey

Buyer Close procedure → optional after-announce text → StatusBadge closed → appears in archive lists.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **ContentCard, Modal, TextField, PrimaryButton, StatusBadge, Toast**.

## Admin controls

Feature key(s): `tender.after_announce_close`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign avsluta / efterannonsera.

## AI enhancement (extra)

37 patterns for text

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

20, 12
