# Tender Search & Watch

- **Module name (EN):** Tender Search & Watch
- **Feature key:** `tender.search_watch`
- **i18n:** `modules.tender.search_watch.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** supplier (P), admin (Cfg)
- **Access:** Supplier searches published tenders, filters, watches/favorites.
- **Lifecycle step:** 5

## What it does

Supplier marketplace search over published procedures with watch/subscribe.

## User journey

Supplier → Tenders tab → filters (CPV/NUTS/text) → SlimListRow results → Watch → open detail → start bid.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, SearchSelect, TextField, SlimListRow, StatusBadge, RowActionButton, Pagination, EmptyState**.

## Admin controls

Feature key(s): `tender.search_watch`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign sök/bevaka upphandling.

## AI enhancement (extra)

40 may rank matches for buyers; suppliers use search here

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

12, 08
