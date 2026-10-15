# Structured Bid Submit (Anbud)

- **Module name (EN):** Structured Bid Submit (Anbud)
- **Feature key:** `tender.bid_submit`
- **i18n:** `modules.tender.bid_submit.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `partial`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** supplier (P), buyer (S receive), admin (Cfg)
- **Access:** Supplier answers structured bid; buyer receives after unseal/deadline rules.
- **Lifecycle step:** 5

## What it does

Structured anbud from requirements/questionnaire with attachments and completeness gate before submit. Extends live supplier questionnaire answers.

## User journey

Supplier opens tender → answer form → CompletenessRail → AI suggestions optional → Submit (respect sealed rules).

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ContentCard, TextField, CompletenessRail, PrimaryButton, StatusBadge, AiInlinePanel, Toast**.

## Admin controls

Feature key(s): `tender.bid_submit`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign skapa/skicka anbud.

## AI enhancement (extra)

32, 33

## Vibe build notes

Extend existing supplier answer flow; add completeness block + sealed integration.

## Depends on

11, 13, 17
