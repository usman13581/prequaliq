# Admin Feature Account Control

- **Module name (EN):** Admin Feature Account Control
- **Feature key:** `platform.feature_entitlements`
- **i18n:** `modules.platform.feature_entitlements.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `platform`
- **Covers competitor:** none
- **Who:** admin (P)
- **Access:** Admin toggles modules per account/org. Buyers/suppliers only see enabled modules.
- **Lifecycle step:** 0

## What it does

Per-account (or per-org) entitlement matrix for lifecycle and AI modules. Lean start → unlock full suite.

## User journey

Admin opens account → Feature control panel → toggle keys → save → user sidebar/actions update on next load.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ContentCard, SlimListRow, PrimaryButton, Toast, StatusBadge**.

## Admin controls

Feature key(s): `platform.feature_entitlements`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

PrequaliQ differentiator (competitors typically sell fixed packages).

## AI enhancement (extra)

AI module keys included in same matrix.

## Vibe build notes

UI switches bound to feature keys from 41; hide SidebarItems when off.

## Depends on

01, 03, 41
