# Requirements Builder (Underlag)

- **Module name (EN):** Requirements Builder (Underlag)
- **Feature key:** `tender.requirements`
- **i18n:** `modules.tender.requirements.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `partial`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** buyer (P); supplier sees published pack later
- **Access:** Buyer builds structured requirements/questionnaire/documents; supplier read-only after publish.
- **Lifecycle step:** 2

## What it does

Build underlag: questions, documents, CPV, criteria. Extends existing questionnaire builder toward full underlag.

## User journey

Buyer opens procedure → Requirements → add questions/docs → AI assist optional → mark ready for publish.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ProfileTabs, ContentCard, TextField, SearchSelect, SlimListRow, PrimaryButton, AiAssistBar, AiDrawer**.

## Admin controls

Feature key(s): `tender.requirements`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign Underlag.

## AI enhancement (extra)

31 AI Requirements Builder

## Vibe build notes

Evolve existing procuring entity questionnaire UI; do not fork a second builder.

## Depends on

10, 08
