# Entity Profile

- **Module name (EN):** Entity Profile
- **Feature key:** `profile.entity`
- **i18n:** `modules.profile.entity.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** both
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer edits procuring entity profile; admin may view for approval.
- **Lifecycle step:** 0

## What it does

Procuring entity organization profile: identity, contacts, CPV/NUTS interests, completeness.

## User journey

Buyer opens Profile tabs → edit sections → save → completeness rail updates.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ProfileTabs, ContentCard, TextField, SearchSelect, CompletenessRail, PrimaryButton, AiDrawer**.

## Admin controls

Feature key(s): `profile.entity`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

Köpare / upphandlande myndighet profile.

## AI enhancement (extra)

30 AI Profile Assist

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

01, 08
