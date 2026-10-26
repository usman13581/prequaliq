# Golden-path QA results — product lock

**Date:** 2026-10-26  
**Environment:** Local (`frontend :5173` → `backend :5001`) + Trooper GPU (`connect01.trooper.ai:31180`)  
**Verdict:** **PASS** for maturity lock of existing features (with notes below)

---

## A) Infrastructure & AI

| # | Check | Result | Notes |
|---|--------|--------|-------|
| A1 | Backend `GET /api/health` | **PASS** | OK |
| A2 | Frontend loads | **PASS** | Login + portals render |
| A3 | GPU `/health` | **PASS** | `ollama: true`, `qwen2.5:7b` |
| A4 | GPU `/generate/profile/cpv` registered | **PASS** | Redeployed; in `/endpoints` |
| A5 | CPV ranking smoke (IT doc vs cleaning candidate) | **PASS** | Selected `72000000`, `72200000`; not cleaning |
| A6 | Backend AI status (`profileAssistReady`) | **PASS** | `online`, `gpuV2`, `profileAssistReady` |

---

## B) Auth & portals (UI)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| B1 | Admin login → `/admin` | **PASS** | Overview, suppliers, entities, notifications bell |
| B2 | Buyer login → `/procuring-entity` | **PASS** | Maria Lindqvist; questionnaires + procedures nav |
| B3 | Supplier login → `/supplier` | **PASS** | Jonas Berg / Aurora IT; Approved dashboard |
| B4 | Unified notifications chrome (all roles) | **PASS** | Bell in header + Notifications nav |

---

## C) Golden-path procurement state (seeded E2E)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| C1 | Buyer has underlag questionnaire | **PASS** | `AI kit — Ramavtal lokalvård Uppsala 2026` (CPV `90920000`) |
| C2 | Buyer procedure live | **PASS** | `Ramavtal lokalvård — kommunala lokaler Uppsala 2026` · **evaluation** |
| C3 | Supplier sees published tenders | **PASS** | Includes the Uppsala ramavtal + other seeded procedures |
| C4 | Award → contract for winner | **PASS** | Active contract `CTR-2026-54355-2026` (Aurora ↔ Lunds Kommun) |

---

## D) Critical regressions (API + UI)

| # | Check | Result | Notes |
|---|--------|--------|-------|
| D1 | `questionnaire_answer` upload does **not** demote approved supplier | **PASS** | Status stayed `approved` v6 |
| D2 | Material `insurance` upload **does** re-submit for approval | **PASS** | Status → `pending` v7 |
| D3 | Supplier contract message `POST` → 201 | **PASS** | `"Message posted"` |
| D4 | Buyer contract message `POST` → 201 | **PASS** | Lunds Kommun buyer ack |
| D5 | UI contract send (no false error toast) | **PASS** | Entry 5 appeared; no error toast |
| D6 | Profile AI upload label | **PASS** | “Upload business PDF documents to extract info with AI” |
| D7 | CPV/NUTS edit visible while profile editing | **PASS** | Business scope: Edit CPV / Edit NUTS |
| D8 | Notifications mark-all | **PASS** | `PUT /api/notifications/read-all` → 200 |

---

## E) Automated unit tests

| # | Check | Result | Notes |
|---|--------|--------|-------|
| E1 | `cd backend && npm test` | **PASS** | **15/15** (`node:test`) — CPV/NUTS helpers, reapproval gate, material diff, contract writable, AI merge |

Run: `cd backend && npm test`

---

## F) Known gaps / not blocking lock

| Item | Status |
|------|--------|
| History tab readonly (block send/edit from history) | **PASS** — implemented (view-only actions + Q&A composer hidden) |
| Maria’s Uppsala procedure has no buyer-side contract yet | Expected — award contract in seed is under Lunds Kommun / Aurora |
| Full fresh create→award from empty DB | Not re-run; seeded golden path + critical gates verified |
| EU AI Act / GDPR compliance packaging | Deferred (structure OK) |

---

## Product lock statement

Existing features verified today are mature enough to **lock**: portals, notifications chrome, GPU CPV ranking endpoint, reapproval rules, contract messaging, profile AI upload UX, and unit coverage for the critical pure logic.

Existing feature set is locked; treat further work as explicit backlog only.
