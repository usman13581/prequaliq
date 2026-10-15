# Dynamic Purchasing System (DIS)

- **Module name (EN):** Dynamic Purchasing System (DIS)
- **Feature key:** `tender.dis`
- **i18n:** `modules.tender.dis.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** e-Avrop
- **Who:** buyer (P), supplier (P apply/bid), admin (Cfg)
- **Access:** Buyer runs DIS; suppliers apply to join and bid on specific calls.
- **Lifecycle step:** 11

## What it does

Dynamiskt inköpssystem: admission + recurring calls using shared bid/eval objects.

## User journey

Buyer create DIS → suppliers apply → admit → publish call → bid → award.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ContentCard, SlimListRow, StatusBadge, PrimaryButton, SearchSelect, Modal**.

## Admin controls

Feature key(s): `tender.dis`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

e-Avrop DIS.

## AI enhancement (extra)

40 matching optional

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

10, 16, 19, 20
