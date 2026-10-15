# Supplier Profile Completeness

- **Module name (EN):** Supplier Profile Completeness
- **Feature key:** `profile.supplier`
- **i18n:** `modules.profile.supplier.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** supplier (P), admin (Cfg)
- **Access:** Supplier maintains profile; admin reviews for approval/requal.
- **Lifecycle step:** 0

## What it does

Supplier company profile, references, completeness scoring, submission history.

## User journey

Supplier Profile tabs → fill sections → completeness % → submit for review when required.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ProfileTabs, ContentCard, CompletenessRail, TextField, SlimListRow, StatusBadge, AiDrawer**.

## Admin controls

Feature key(s): `profile.supplier`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

Leverantörskonto / profil.

## AI enhancement (extra)

30 AI Profile Assist

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

01, 08, 09
