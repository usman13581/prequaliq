# AI Supplier Matching

- **Module name (EN):** AI Supplier Matching
- **Feature key:** `ai.supplier_matching`
- **i18n:** `modules.ai.supplier_matching.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `ai-extra`
- **Covers competitor:** none
- **Who:** buyer (P), admin (Cfg)
- **Access:** Buyer gets ranked supplier suggestions for inform/DIS/direct.
- **Lifecycle step:** 3, 11

## What it does

Match approved suppliers to procedure CPV/NUTS/need text.

## User journey

Publish/direct inform → AiDrawer matches → select suppliers → invite.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **AiAssistBar, AiDrawer, SlimListRow, StatusBadge, PrimaryButton**. AI chrome stays **violet** (AiAssistBar / AiDrawer / AiInlinePanel).

## Admin controls

Feature key(s): `ai.supplier_matching`. Toggle per account via 04 / 41.

## Parity notes

PrequaliQ differentiator.

## AI enhancement (extra)

This **is** the AI extra. Enhances: 29, 12, 24.

## Vibe build notes

Only approved/visible suppliers; explain match reasons.

## Depends on

29, 08, 07
