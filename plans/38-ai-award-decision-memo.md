# AI Award Decision Memo

- **Module name (EN):** AI Award Decision Memo
- **Feature key:** `ai.award_memo`
- **i18n:** `modules.ai.award_memo.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer drafts tilldelningsbeslut memo from evaluation results.
- **Lifecycle step:** 8

## What it does

Draft award decision rationale memo; buyer must edit/approve.

## User journey

Award step → AiAssistBar → memo draft → edit → attach to notify package.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiAssistBar, AiDrawer, TextField, Modal, PrimaryButton**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.award_memo`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 20, 19.

## Vibe build notes

Legal disclaimer: AI draft only; buyer accountable.

## Depends on

20, 19
