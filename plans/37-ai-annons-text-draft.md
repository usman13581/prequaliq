# AI Announcement Text Draft

- **Module name (EN):** AI Announcement Text Draft
- **Feature key:** `ai.announcement_draft`
- **i18n:** `modules.ai.announcement_draft.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer drafts annons text from procedure/underlag.
- **Lifecycle step:** 3

## What it does

Generate announcement copy for publish / after-announce.

## User journey

Publish screen → AiAssistBar → draft → edit in TextField → publish.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiAssistBar, AiDrawer, TextField, PrimaryButton, Modal**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.announcement_draft`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 12, 21.

## Vibe build notes

Swedish/English via i18n locale of user.

## Depends on

12, 11
