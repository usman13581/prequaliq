# AI Q&A Draft Replies

- **Module name (EN):** AI Q&A Draft Replies
- **Feature key:** `ai.qa_draft_replies`
- **i18n:** `modules.ai.qa_draft_replies.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer drafts answers to supplier questions.
- **Lifecycle step:** 4

## What it does

Draft reply from underlag + question context; buyer edits before publish.

## User journey

Q&A thread → AiInlinePanel Draft → edit → Post answer.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiInlinePanel, TextField, PrimaryButton, Toast**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.qa_draft_replies`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 14.

## Vibe build notes

Cite underlag sections when possible.

## Depends on

14, 11
