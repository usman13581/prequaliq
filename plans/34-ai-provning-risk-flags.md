# AI Qualification Risk Flags

- **Module name (EN):** AI Qualification Risk Flags
- **Feature key:** `ai.qualification_risk`
- **i18n:** `modules.ai.qualification_risk.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer sees risk flags during prövning.
- **Lifecycle step:** 6

## What it does

Flag expired docs, exclusion risks, inconsistencies across bid vs profile.

## User journey

Buyer opens bid in prövning → violet risk panel → investigate → pass/fail with notes.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiInlinePanel, AlertBanner, StatusBadge, ContentCard, SlimListRow**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.qualification_risk`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 09, 15, 18.

## Vibe build notes

Explainable flags; human decision remains.

## Depends on

16, 09, 15
