# AI Requirements Builder

- **Module name (EN):** AI Requirements Builder
- **Feature key:** `ai.requirements_builder`
- **i18n:** `modules.ai.requirements_builder.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer drafts underlag/questions from need text.
- **Lifecycle step:** 2

## What it does

Need description → suggested questions/CPV/structure for requirements builder.

## User journey

Underlag screen → AiAssistBar → describe need → review in AiDrawer → apply into questionnaire.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiAssistBar, AiDrawer, ContentCard, PrimaryButton, Toast**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.requirements_builder`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 11, 08.

## Vibe build notes

Keep ProcuringEntityQuestionnaireAiAssist; loosen validation already applied.

## Depends on

11
