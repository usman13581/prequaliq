# AI test kit — copy-paste data per use case

Aligned with [E2E-SCENARIO-TO-CONTRACT.md](../E2E-SCENARIO-TO-CONTRACT.md).  
Sample PDFs live in `docs/ai-test-kit/pdfs/`.

## Accounts (use these)

Loaded by `cd backend && npm run seed-demo` (or `SEED_DEMO_DATA=1` on start).

| Role | Email | Password |
|------|--------|----------|
| Admin | `admin@prequaliq.com` | `Admin123!` |
| Buyer (E2E) | `maria.lindqvist@uppsalastad.e2e` | `Password123!` |
| Buyer (AI award pack) | `buyer1@prequaliq.demo` | `Password123!` |
| Supplier A | `jonas.berg@nordicfacility.e2e` | `Password123!` |
| Supplier B | `anna.holm@malardalenclean.e2e` | `Password123!` |

Maria has an evaluation-ready Uppsala cleaning procedure. Buyer1 has `[AI TEST]` award procedures (unique underlags each).

**Shared CPV:** `90920000` — Facility related sanitation services

**Before testing:** Admin → **AI Controls** — master ON, and the feature under test ON.  
After toggling admin flags, **refresh** the supplier/buyer browser tab.

---

## 1) AI profile assist (`ai.profile_assist`)

### Supplier
1. Login as **Jonas** → **Profile** → **Edit**.
2. Clear or leave a few company/insurance fields empty (so you can see AI fill them).
3. Click **Upload business docs to fill profile** (or current button label).
4. Select these PDFs together (multi-select):
   - `pdfs/01-nordic-facility-liability-insurance.pdf`
   - `pdfs/02-nordic-facility-company-registration.pdf`
   - `pdfs/03-nordic-facility-iso9001.pdf`
   - `pdfs/04-nordic-facility-iso14001.pdf`
5. Review suggestions drawer → apply selected → **Save profile**.

**Expect fields like:** company name, org nr `556812-3344`, address Uppsala, insurer `If Skadeförsäkring`, policy `IF-UPP-2026-7781`, coverage `15000000`, valid to `2027-12-31`, QMS/ISO notes.

### Procuring entity
1. Login as **Maria** → **Profile** → **Edit**.
2. Upload: `pdfs/05-uppsala-entity-profile-letter.pdf`
3. Apply suggestions → save.

---

## 2) AI underlag / questionnaire builder (`ai.requirements_builder`)

1. Login as **Maria** → **Questionnaires**.
2. Paste into the AI description box (≤300 chars):

```text
Municipal facility cleaning for schools and offices in Uppsala. Need ISO 9001, liability insurance min 10 MSEK, 3 public references, and start within 30 days.
```

3. Confirm AI understanding → generate draft → pick CPV **90920000** if suggested → apply into create form → set deadline → create.

**Alt short prompt (SV):**

```text
Ramavtal lokalvård kommunala lokaler Uppsala: ISO 9001, ansvarsförsäkring, referenser, start inom 30 dagar.
```

**Negative (should reject / ask rewrite):**

```text
What is the weather in Stockholm tomorrow?
```

---

## 3) AI answer suggestions (`ai.bid_suggestions`)

**Prep (if not already done from E2E):**
- Supplier A profile approved + CPV `90920000` + insurance filled (use case 1).
- Buyer has a questionnaire with CPV `90920000` linked to a published procedure (or open questionnaire from Tenders).

**Suggested questionnaire questions** (buyer creates if missing):

| # | Question | Type |
|---|----------|------|
| 1 | Describe your quality management system for cleaning services. | Text |
| 2 | Confirm valid liability insurance (insurer, amount, expiry). | Text + optional insurance doc |
| 3 | List two public-sector reference assignments. | Text |
| 4 | Can you start within 30 days after award? | Text |

**Test:**
1. Login as **Jonas** → **Tenders** → open the questionnaire.
2. Click AI answer suggestions → generate → review → apply selected.
3. Expect drafts grounded in Nordic Facility profile/insurance/ISO docs.

---

## 4) AI completeness check (`ai.completeness_conflict`)

Uses the **same rules as the profile completeness rail** (company, Q2–Q12, CPV, NUTS, references, insurance, docs) plus optional GPU summary/conflicts.

### After case 1 only (typical Jonas)
Expect **not** complete — e.g. ~7% with gaps (turnover, CPV, NUTS, Q answers/docs) and a warning if insurance fields lack an uploaded insurance PDF.

1. Jonas → **Profile** → **AI completeness check**
2. Toast shows percent + gap summary (AI narrative when GPU is up)
3. Completeness rail refreshes to match

### Ready path
Fill all rail sections until 100%, then re-check → ready / complete.

---

## 5) AI Q&A draft replies (`ai.qa_draft_replies`)

**Prep:** Published procedure with Q&A open. Supplier posts a question first (or buyer drafts against last supplier message).

**Supplier question to post (as Anna or Jonas on the tender Q&A):**

```text
Is night cleaning required for schools, or is daytime service sufficient? Also confirm if eco-labelled chemicals are mandatory.
```

**Buyer test:**
1. Maria → **Procedures** → open procedure → **Q&A** tab → select supplier thread.
2. Use **AI draft** → review → edit → send.

---

## 6) AI evaluation summary (`ai.evaluation_copilot`)

**Prep:** Procedure past bid deadline / unsealed; at least one evaluation score saved.

**Sample scores to enter (Eval tab):**

| Supplier | Score | Notes |
|----------|-------|--------|
| Nordic Facility Services AB | 88 | Strong QMS + insurance; night shift capacity |
| Mälardalen Clean Partner AB | 72 | Good daytime coverage; limited nights |

Then click **AI evaluation summary** → expect short overview toast/draft referencing scores.

---

## 7) AI award memo (`ai.award_memo`)

1. Same procedure → **Award** tab.
2. Select winner **Nordic Facility Services AB**.
3. Click **AI award memo** → memo fills decision field.
4. Set standstill date → save award (when ready).

---

## 8) AI announcement draft (`ai.announcement_draft`)

1. Same procedure → **Award** tab (before or after award save).
2. Click **AI announcement draft**.
3. Expect draft using procedure title / reference / description.

**Procedure fields that feed the draft** (set on Plan if empty):

| Field | Value |
|-------|--------|
| Title | `Ramavtal lokalvård — kommunala lokaler Uppsala 2026` |
| Reference | `UPP-FS-2026-LV-01` |
| Description | `Upphandling av lokalvård för skolor, kontor och vårdlokaler inom Uppsala Stad.` |

---

## 9–11) API-only (no button in UI yet)

Use only if you want to hit the API with a JWT from login:

| Key | Method | Path | Body / notes |
|-----|--------|------|----------------|
| `ai.qualification_risk` | GET | `/api/ai-extras/qualification-risk/:supplierId` | Buyer/admin JWT |
| `ai.cpv_recommender` | POST | `/api/ai-extras/cpv-recommend` | `{ "text": "facility cleaning sanitation schools" }` |
| `ai.supplier_matching` | GET | `/api/ai-extras/supplier-matching/:procedureId` | Needs procedure with questionnaire CPV |

---

## Entitlement smoke (after functional tests)

For each feature key in Admin → **AI Controls**: turn **OFF** → refresh role portal → confirm button/bar **hidden** → turn **ON** → refresh → visible again.

---

## PDF file list

| File | Use |
|------|-----|
| `01-nordic-facility-liability-insurance.pdf` | Profile assist — insurance fields |
| `02-nordic-facility-company-registration.pdf` | Profile assist — company fields |
| `03-nordic-facility-iso9001.pdf` | Profile assist — QMS / quality |
| `04-nordic-facility-iso14001.pdf` | Profile assist — environment |
| `05-uppsala-entity-profile-letter.pdf` | PE profile assist |
| `06-minimal-company-only.pdf` | Completeness / thin extract |

Regenerate PDFs:

```bash
# from repo root — re-run the generator if needed (see chat history / recreate script)
ls docs/ai-test-kit/pdfs/
```
