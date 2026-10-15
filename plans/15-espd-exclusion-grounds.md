# ESPD / Exclusion Grounds

- **Module name (EN):** ESPD / Exclusion Grounds
- **Feature key:** `tender.espd_exclusion`
- **i18n:** `modules.tender.espd_exclusion.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** both
- **Who:** buyer (P require/check), supplier (P declare), admin (Cfg)
- **Access:** Buyer enables exclusion grounds; supplier declares; buyer verifies in prövning.
- **Lifecycle step:** 2, 6

## What it does

ESPD-style exclusion/qualification declarations attached to underlag and bid.

## User journey

Buyer adds grounds in underlag → supplier completes declarations in bid → buyer checks in qualification.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **ProfileTabs, ContentCard, TextField, StatusBadge, AlertBanner, PrimaryButton**.

## Admin controls

Feature key(s): `tender.espd_exclusion`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

ESPD / uteslutningsgrunder.

## AI enhancement (extra)

34 risk flags

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

11, 16
