# AI Bid Suggestions

- **Module name (EN):** AI Bid Suggestions
- **Feature key:** `ai.bid_suggestions`
- **i18n:** `modules.ai.bid_suggestions.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** supplier (P), admin (Cfg)
- **Access:** Supplier gets answer suggestions from profile during bid.
- **Lifecycle step:** 5

## What it does

Profile-aware suggested answers for structured bid questions; review before apply.

## User journey

Answer questionnaire → AiInlinePanel → generate → edit → apply per question.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiInlinePanel, ContentCard, PrimaryButton, Toast**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.bid_suggestions`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 16, 07.

## Vibe build notes

Keep SupplierQuestionnaireAnswerAiAssist.

## Depends on

16, 07, 30
