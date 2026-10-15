# AI CPV Recommender

- **Module name (EN):** AI CPV Recommender
- **Feature key:** `ai.cpv_recommender`
- **i18n:** `modules.ai.cpv_recommender.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** buyer (P), supplier (P), admin (Cfg)
- **Access:** Suggest CPV codes from free text on profiles/procedures.
- **Lifecycle step:** 0–2

## What it does

Text → ranked CPV suggestions into SearchSelect.

## User journey

User types need → recommend → pick codes in SearchSelect.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiInlinePanel, SearchSelect, PrimaryButton**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.cpv_recommender`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 08, 10, 11.

## Vibe build notes

Return codes that exist in catalog only.

## Depends on

08
