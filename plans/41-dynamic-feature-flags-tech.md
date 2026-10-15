# Dynamic Feature Flags (tech)

- **Module name (EN):** Dynamic Feature Flags (tech)
- **Feature key:** `platform.feature_flags_tech`
- **i18n:** `modules.platform.feature_flags_tech.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `platform`
- **Covers competitor:** none
- **Who:** admin (P)
- **Access:** Tech backbone for entitlement checks API + frontend gate.
- **Lifecycle step:** 0

## What it does

Feature flag/entitlement service: store keys per account, middleware enforcement, frontend hook `useEntitlement(key)`.

## User journey

Admin toggles in 04 → API persists → portals fetch entitlements → hide/disable modules.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **ContentCard, SlimListRow, PrimaryButton, Toast**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `platform.feature_flags_tech`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ platform differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 04 and all module keys.

## Vibe build notes

English feature keys; default-deny for planned modules; live modules default-on for existing approved users during migration.

## Depends on

01, 03
