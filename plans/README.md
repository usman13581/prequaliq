# PrequaliQ Feature Plans

Documentation library for one unified procurement lifecycle. Implementation tracked plan-by-plan; core waves are now in code.

## Product rule

```text
PrequaliQ = One complete procurement lifecycle
           (capability coverage of TendSign + e-Avrop)
           + AI extras
           + Admin control
```

**Not** duplicate processes. Competitors are a capability checklist. One flow, better UX.

**Buyer** in these plans = **Procuring Entity** (same role; app code keeps `procuringEntity`).

## UI unify rule

New screens reuse the current app theme and objects only. See [00-ui-objects.md](00-ui-objects.md).

## Registration

Signup forms live **in the app** (`/register`). Website Register CTA **redirects** here. No website-hosted signup form.

## User types

| Type | Portal | Job |
|------|--------|-----|
| Admin | Admin Dashboard | Approve accounts, entitlements |
| Buyer (Procuring Entity) | Procuring Entity Dashboard | Run procurements |
| Supplier | Supplier Dashboard | Profile, search, bid, Q&A |

## Index

### Foundation

| File | Purpose |
|------|---------|
| [00-lifecycle-overview.md](00-lifecycle-overview.md) | End-to-end lifecycle |
| [00-competitive-positioning.md](00-competitive-positioning.md) | Market positioning |
| [00-feature-parity-checklist.md](00-feature-parity-checklist.md) | Competitor capability → one plan ID |
| [00-ui-objects.md](00-ui-objects.md) | Design tokens + UI object catalog |

### Platform

| ID | Plan | Status |
|----|------|--------|
| 01 | [Auth & Roles](01-auth-roles.md) | live |
| 02 | [Self-Registration & Eligibility](02-self-registration-eligibility.md) | live |
| 03 | [Admin Oversight & Approval](03-admin-oversight-approval.md) | live |
| 04 | [Admin Feature Account Control](04-admin-feature-account-control.md) | live |
| 05 | [Multi-Org & Departments](05-multi-org-departments.md) | live |
| 41 | [Dynamic Feature Flags (tech)](41-dynamic-feature-flags-tech.md) | live |

### Profiles & catalogs

| ID | Plan | Status |
|----|------|--------|
| 06 | [Entity Profile](06-entity-profile.md) | live |
| 07 | [Supplier Profile Completeness](07-supplier-profile-completeness.md) | live |
| 08 | [CPV / NUTS Catalog](08-cpv-nuts-catalog.md) | live |
| 09 | [Documents, Expiry & Requalification](09-documents-expiry-requalification.md) | live |
| 15 | [ESPD / Exclusion Grounds](15-espd-exclusion-grounds.md) | live |

### Core procurement lifecycle

| ID | Plan | Status |
|----|------|--------|
| 10 | [Procedure Setup (Planera)](10-planera-procedure-setup.md) | live |
| 11 | [Requirements Builder (Underlag)](11-underlag-requirements-builder.md) | live |
| 12 | [Publish & Direct Inform (Annons)](12-annons-publish-direct-inform.md) | live |
| 13 | [Tender Search & Watch](13-supplier-tender-search-watch.md) | live |
| 14 | [Q&A Messaging](14-qa-messaging.md) | live |
| 16 | [Structured Bid Submit (Anbud)](16-anbud-structured-bid-submit.md) | live |
| 17 | [Sealed Bid & Deadline Lock](17-sealed-bid-deadline-lock.md) | live |
| 18 | [Complement Requests](18-complement-requests.md) | live |
| 19 | [Evaluation Scoring](19-evaluation-scoring.md) | live |
| 20 | [Award, Notify & Standstill](20-award-notify-standstill.md) | live |
| 21 | [After-Announce & Close](21-after-announce-close.md) | live |

### Frameworks, contracts, market

| ID | Plan | Status |
|----|------|--------|
| 22 | [Direct Procurement](22-direktupphandling.md) | live |
| 23 | [Frameworks & Call-offs](23-ramavtal-avrop.md) | live |
| 24 | [Dynamic Purchasing System (DIS)](24-dis-dynamic-purchasing.md) | live |
| 25 | [Contract Repository & Follow-up](25-contract-repository-followup.md) | live |
| 26 | [Analytics & Reporting](26-analytics-reporting.md) | partial |
| 27 | [Integrations / API / Export](27-integrations-api-export.md) | partial |
| 28 | [Notifications & Audit Trail](28-notifications-audit-trail.md) | live |
| 29 | [Supplier Discovery Marketplace](29-supplier-discovery-marketplace.md) | live |

### AI extras

| ID | Plan | Status |
|----|------|--------|
| 30 | [AI Profile Assist](30-ai-profile-assist.md) | live |
| 31 | [AI Requirements Builder](31-ai-underlag-builder.md) | live |
| 32 | [AI Bid Suggestions](32-ai-anbud-suggestions.md) | live |
| 33 | [AI Completeness / Conflict Check](33-ai-completeness-conflict-check.md) | live |
| 34 | [AI Qualification Risk Flags](34-ai-provning-risk-flags.md) | partial |
| 35 | [AI Evaluation Copilot](35-ai-evaluation-copilot.md) | live |
| 36 | [AI Q&A Draft Replies](36-ai-qa-draft-replies.md) | live |
| 37 | [AI Announcement Text Draft](37-ai-annons-text-draft.md) | live |
| 38 | [AI Award Decision Memo](38-ai-award-decision-memo.md) | live |
| 39 | [AI CPV Recommender](39-ai-cpv-recommender.md) | partial |
| 40 | [AI Supplier Matching](40-ai-supplier-matching.md) | partial |

## Feature × user type (summary)

| Area | Admin | Buyer | Supplier |
|------|-------|-------|----------|
| Platform / entitlements | Primary | Register / await | Register / await |
| Profiles & catalogs | Configure | Entity profile | Supplier profile |
| Lifecycle 10–21 | Configure | Own procedure → award | Search → bid → receive |
| Frameworks / contracts | Configure | Own call-offs / contracts | Respond / own contracts |
| AI extras | Configure | Buyer-step AI | Supplier-step AI |

Full matrix: see each plan’s **Who** / **Access**, and the Cursor master plan.

## Delivery waves (code later)

| Wave | Focus | Plans |
|------|--------|-------|
| W0 | Platform | 01–05, 41 |
| W1 | Core lifecycle | 06–11, 14–20 |
| W2 | Publish + process depth | 12–13, 15, 17–18, 21–22, 28 |
| W3 | Frameworks, DIS, contracts | 23–27, 29 |
| W4 | AI extras | 30–40 |

## Template

Every feature plan includes: Module name (EN), Feature key, i18n, Status, Layer, Who, Access, Lifecycle step, What it does, User journey, UI objects, Admin controls, Parity notes, AI enhancement, Vibe build notes, Depends on.
