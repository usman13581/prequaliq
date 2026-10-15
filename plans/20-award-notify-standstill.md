# Award, Notify & Standstill

- **Module name (EN):** Award, Notify & Standstill
- **Feature key:** `tender.award`
- **i18n:** `modules.tender.award.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `parity`
- **Covers competitor:** TendSign
- **Who:** buyer (P), supplier (S receive decision), admin (Cfg)
- **Access:** Buyer awards and notifies; standstill clock; suppliers receive decision.
- **Lifecycle step:** 8–9

## What it does

Tilldelningsbeslut, notify all tenderers, avtalsspärr / standstill period before contract.

## User journey

Buyer confirm award Modal → notify → StatusBadge awarded + standstill DateField → after standstill unlock contract step.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **ContentCard, Modal, DateField, PrimaryButton, StatusBadge, Toast, AlertBanner, AiAssistBar**.

## Admin controls

Feature key(s): `tender.award`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

TendSign tilldelning + avtalsspärr.

## AI enhancement (extra)

38 AI Award Decision Memo

## Vibe build notes

Reuse PortalShell and catalog objects; EN keys + i18n SV; gate by entitlements when 04/41 live.

## Depends on

19, 28
