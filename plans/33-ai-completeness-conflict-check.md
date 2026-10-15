# AI Completeness / Conflict Check

- **Module name (EN):** AI Completeness / Conflict Check
- **Feature key:** `ai.completeness_conflict`
- **i18n:** `modules.ai.completeness_conflict.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** supplier (P), admin (Cfg)
- **Access:** Supplier runs pre-submit check; blocks or warns on gaps/conflicts.
- **Lifecycle step:** 5

## What it does

Before submit, AI/rules check missing answers, expired docs, contradictions.

## User journey

Supplier click Check → AlertBanner issues list → fix → CompletenessRail green → submit.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiInlinePanel, AlertBanner, CompletenessRail, SlimListRow, PrimaryButton**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.completeness_conflict`. Toggle per account via 04 / 41.

## Parity notes

Stronger than typical completeness-only checks.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 16, 09.

## Vibe build notes

Combine rules engine + optional LLM summary; never auto-submit.

## Depends on

16, 09, 32
