# Evaluation Scoring

- **Module name (EN):** Evaluation Scoring
- **Feature key:** `evaluation.scoring`
- **i18n:** `modules.evaluation.scoring.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer scores bids per criteria; suppliers do not see others' scores.
- **Lifecycle step:** 7

## What it does

Weighted criteria scoring, notes, comparative view for compliant bids.

## User journey

Buyer → Evaluation → score each bid → save → ranking → proceed to award.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ContentCard, SlimListRow, TextField, PrimaryButton, StatusBadge, AiDrawer**.

## Admin controls

Feature key(s): `evaluation.scoring`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign utvärdering.

## AI enhancement (extra)

35 AI Evaluation Copilot

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

16, 17, 15
