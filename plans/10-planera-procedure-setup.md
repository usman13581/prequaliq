# Procedure Setup (Planera)

- **Module name (EN):** Procedure Setup (Planera)
- **Feature key:** `tender.procedure_setup`
- **i18n:** `modules.tender.procedure_setup.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer creates/edits procedure: type, timeline, reference, team.
- **Lifecycle step:** 1

## What it does

Plan a procurement: procedure type, reference number, timeline milestones, internal notes/activity plan.

## User journey

Buyer → New procedure → ProfileTabs sections (basics, timeline, team) → save draft → continue to Underlag.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ProfileTabs, ContentCard, TextField, DateField, SearchSelect, PrimaryButton, StatusBadge**.

## Admin controls

Feature key(s): `tender.procedure_setup`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign Planera.

## AI enhancement (extra)

Optional timeline suggestions later

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

06, 01
