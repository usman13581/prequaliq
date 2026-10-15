# AI Profile Assist

- **Module name (EN):** AI Profile Assist
- **Feature key:** `ai.profile_assist`
- **i18n:** `modules.ai.profile_assist.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** buyer (P), supplier (P), admin (Cfg)
- **Access:** Both portals can run doc→field assist on own profile.
- **Lifecycle step:** 0

## What it does

Upload PDF/docs; AI suggests profile field values; user reviews and applies.

## User journey

Open profile → AiAssistBar → upload → AiDrawer suggestions → check/apply → save profile.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiAssistBar, AiDrawer, ContentCard, PrimaryButton, Toast**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.profile_assist`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator (weak/none at competitors).

## AI enhancement (extra)

This **is** the AI extra. Enhances: 06, 07.

## Vibe build notes

Keep existing SupplierAiProfileAssist / ProcuringEntityAiProfileAssist.

## Depends on

06, 07
