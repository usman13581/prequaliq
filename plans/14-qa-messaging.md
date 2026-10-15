# Q&A Messaging

- **Module name (EN):** Q&A Messaging
- **Feature key:** `tender.qa`
- **i18n:** `modules.tender.qa.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** supplier (P ask), buyer (P answer), admin (Cfg)
- **Access:** Suppliers ask; buyers answer (public or restricted per rules); both see thread.
- **Lifecycle step:** 4

## What it does

Structured frågor & svar tied to a procedure before bid deadline.

## User journey

Supplier asks → buyer notified → buyer answers (optional AI draft) → supplier sees answer; audit retained.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, ContentCard, SlimListRow, TextField, PrimaryButton, AlertBanner, AiInlinePanel, Toast**.

## Admin controls

Feature key(s): `tender.qa`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign Frågor & svar.

## AI enhancement (extra)

36 AI Q&A Draft Replies

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

12, 28
