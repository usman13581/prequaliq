# AI Evaluation Copilot

- **Module name (EN):** AI Evaluation Copilot
- **Feature key:** `ai.evaluation_copilot`
- **i18n:** `modules.ai.evaluation_copilot.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer uses summaries/draft scores; must confirm.
- **Lifecycle step:** 7

## What it does

Summarize bids vs criteria; draft score suggestions for buyer review.

## User journey

Evaluation screen → AiDrawer → per-bid summary → draft scores → buyer edits → save.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiAssistBar, AiDrawer, ContentCard, TextField, PrimaryButton**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.evaluation_copilot`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 19.

## Vibe build notes

Never auto-finalize award scores without buyer confirm.

## Depends on

19
