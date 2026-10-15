# Direct Procurement

- **Module name (EN):** Direct Procurement
- **Feature key:** `tender.direct_procurement`
- **i18n:** `modules.tender.direct_procurement.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** e-Avrop
- **Who:** buyer (P), supplier (S if invited), admin (Cfg)
- **Access:** Buyer runs simplified direct procurement; invited suppliers respond.
- **Lifecycle step:** 1–10 (simplified)

## What it does

Direktupphandling path using same lifecycle objects with fewer mandatory steps.

## User journey

Buyer choose Direct → shortened Planera/Underlag → invite → receive → award (rules-aware).

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ProfileTabs, ContentCard, SlimListRow, PrimaryButton, StatusBadge, Modal**.

## Admin controls

Feature key(s): `tender.direct_procurement`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

e-Avrop direktupphandling.

## AI enhancement (extra)

31, 37 optional

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

10, 11, 16, 20
