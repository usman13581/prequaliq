# Frameworks & Call-offs

- **Module name (EN):** Frameworks & Call-offs
- **Feature key:** `contracts.call_offs`
- **i18n:** `modules.contracts.call_offs.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** e-Avrop
- **Who:** buyer (P), supplier (S respond to call-off), admin (Cfg)
- **Access:** Buyer manages ramavtal and creates avrop; suppliers on framework respond.
- **Lifecycle step:** 11

## What it does

Framework agreements and call-offs inside the same lifecycle (not a second product).

## User journey

Buyer award framework → Contract repo → New call-off → suppliers respond → mini evaluation/award.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ContentCard, SlimListRow, StatusBadge, ProfileTabs, PrimaryButton, Modal, DateField**.

## Admin controls

Feature key(s): `contracts.call_offs`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

e-Avrop ramavtal + avrop.

## AI enhancement (extra)

Optional call-off text assist

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

20, 25, 16
