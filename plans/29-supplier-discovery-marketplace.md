# Supplier Discovery Marketplace

- **Module name (EN):** Supplier Discovery Marketplace
- **Feature key:** `marketplace.supplier_discovery`
- **i18n:** `modules.marketplace.supplier_discovery.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** both
- **Who:** buyer (P search), supplier (P be found), admin (Cfg)
- **Access:** Buyers search approved suppliers by CPV/NUTS/profile; suppliers control visibility.
- **Lifecycle step:** 0, 3, 11

## What it does

Buyer-facing supplier discovery for direct inform, DIS, or soft market research.

## User journey

Buyer Search suppliers → filters → SlimListRow → view profile → invite/direct inform.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, SearchSelect, SlimListRow, ContentCard, StatusBadge, RowActionButton, Pagination, EmptyState**.

## Admin controls

Feature key(s): `marketplace.supplier_discovery`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

Supplier findability / marketplace.

## AI enhancement (extra)

40 AI Supplier Matching

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

07, 08, 03
