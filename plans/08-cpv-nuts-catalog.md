# CPV / NUTS Catalog

- **Module name (EN):** CPV / NUTS Catalog
- **Feature key:** `catalog.cpv_nuts`
- **i18n:** `modules.catalog.cpv_nuts.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** both
- **Who:** buyer (P select), supplier (P select), admin (Cfg)
- **Access:** Select codes on profiles and procedures; admin maintains catalog if needed.
- **Lifecycle step:** 0–2

## What it does

Searchable CPV and NUTS selectors shared across profile and tender setup.

## User journey

User opens SearchSelect → search → multi-select codes → save on form.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **SearchSelect, ContentCard, TextField**.

## Admin controls

Feature key(s): `catalog.cpv_nuts`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

CPV/NUTS everywhere in SE market tools.

## AI enhancement (extra)

39 AI CPV Recommender

## Vibe build notes

Reuse CpvSearchSelect + NUTS twin pattern.

## Depends on

None
