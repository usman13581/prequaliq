# E2E scenario (through Contract for winner)

Realistic municipal cleaning procurement — from account creation through contract for the winner.

**Shared CPV (this run):** `90920000` — Facility related sanitation services  
Use this on **both supplier profiles** and on the **questionnaire**.

## Accounts

| Role | Name | Email | Password |
|------|------|--------|----------|
| Admin | — | `admin@prequaliq.com` | `Admin123!` |
| Buyer | Maria Lindqvist | `maria.lindqvist@uppsalastad.e2e` | `Password123!` |
| Supplier A (winner) | Jonas Berg | `jonas.berg@nordicfacility.e2e` | `Password123!` |
| Supplier B | Anna Holm | `anna.holm@malardalenclean.e2e` | `Password123!` |

**Admin create**
- Entity name for buyer: `Uppsala Stad — Fastighet & Service`
- After create: **Approve** both suppliers (admin-created suppliers start as **pending**). Buyer entity is created **approved**.
- Activate users if inactive.

---

## Progress checkpoint (before §4)

```text
[x] Admin created buyer + 2 suppliers
[x] Suppliers approved
[x] Profiles filled (same CPV 90920000)
[ ] Questionnaire created  ← you are here
[ ] Procedure published
[ ] Both suppliers submitted ESPD + answers
[ ] Unseal + evaluation
[ ] Award to Nordic Facility
[ ] Contract visible (buyer + winner supplier)
```

---

## 1) Buyer profile (`maria.lindqvist@uppsalastad.e2e`)

| Field | Sample |
|-------|--------|
| Entity name | Uppsala Stad — Fastighet & Service |
| Address | Stationsgatan 12 |
| City | Uppsala |
| Country | Sweden |
| Phone | +46 18 727 00 00 |

---

## 2) Supplier A profile — Nordic Facility Services AB (`jonas.berg@…`)

| Field | Sample |
|-------|--------|
| Company | Nordic Facility Services AB |
| Registration no. | 556812-3344 |
| Tax ID | SE556812334401 |
| Address | Kungsgatan 45 |
| City | Uppsala |
| Country | Sweden |
| Employees | 62 |
| Year established | 2004 |
| Turnover | 18500000 |
| CPV | **90920000** |
| Insurer | If Skadeförsäkring |
| Policy | IF-UPP-2026-7781 |
| Coverage | 15000000 |
| Valid to | 2027-12-31 |
| Quality / capacity notes | “ISO 9001-aligned QMS. Night and weekend cleaning for municipal buildings. 14 active public-sector contracts in Mälardalen.” |

---

## 3) Supplier B profile — Mälardalen Clean Partner AB (`anna.holm@…`)

| Field | Sample |
|-------|--------|
| Company | Mälardalen Clean Partner AB |
| Registration no. | 559041-8821 |
| Tax ID | SE559041882101 |
| Address | Stora Torget 3 |
| City | Enköping |
| Country | Sweden |
| Employees | 24 |
| Year established | 2016 |
| Turnover | 6400000 |
| CPV | **90920000** (same as A) |
| Insurer | Trygg-Hansa |
| Policy | TH-ENK-2026-2209 |
| Coverage | 8000000 |
| Valid to | 2027-06-30 |
| Capacity notes | “Regional day-time cleaning. Strong school and office portfolio; limited night shift.” |

---

## 4) Buyer — questionnaire (underlag)

**Who:** Maria (buyer) — `maria.lindqvist@uppsalastad.e2e`  
**Goal:** Create the underlag questionnaire that suppliers will answer as their bid form.

### 4.1 Open create form

1. Log in as buyer.
2. In the **left sidebar**, click **Questionnaires**.
3. Click **Create Questionnaire** (top right).
4. A modal opens: **Create Questionnaire**.

### 4.2 Basic information

Fill these fields:

| UI label | Enter |
|----------|--------|
| Title * | `Underlag — Lokalvård kommunala lokaler 2026` |
| Description | `Kvalificeringsfrågor för ramavtal lokalvård, Uppsala Stad Fastighet & Service.` |
| Select CPV code * | Search `90920000` → pick **Facility related sanitation services** |
| Deadline (date only) * | Today **+14 days** (date picker) |

### 4.3 Add questions

Click **Add question** four times. For each row set **Required** = on.

| # | Question text | Question type | Requires document? |
|---|---------------|---------------|--------------------|
| 1 | Beskriv ert kvalitetsledningssystem för lokalvård. | Text (or Textarea if available) | No |
| 2 | Ange två referensuppdrag hos offentlig beställare (namn, omfattning, period). | Text / Textarea | No |
| 3 | Kan ni påbörja uppdrag inom 30 dagar efter tilldelning? Motivera. | Text / Textarea | No |
| 4 | Bekräfta giltig ansvarsförsäkring (belopp och giltighet). | Text | Optional: tick **Requires document**, Document type = `Insurance certificate` |

Sort numbers: leave 1–4 (or set Order = 1, 2, 3, 4).

### 4.4 Save

1. Scroll to the bottom of the modal.
2. Click **Create Questionnaire** / Save.
3. Expect success toast (questionnaire created).
4. Confirm the new row appears in the Questionnaires list with CPV `90920000` and your deadline.

**Checkpoint:** Questionnaire exists and is ready to link as underlag.

---

## 5) Buyer — procedure + publish

**Who:** Maria (buyer)  
**Goal:** Create a procedure, link the questionnaire, invite both CPV-matched suppliers, publish.

### 5.1 Create procedure (draft)

1. Sidebar → **Procedures** (or **Procurement procedures**).
2. Click **Create procedure**.
3. In the create modal fill:

| Field | Value |
|-------|--------|
| Title | `Ramavtal lokalvård — kommunala lokaler Uppsala 2026` |
| Reference number | `UPP-FS-2026-LV-01` |
| Type | **Open** |
| Bid deadline | Today **+10 days** |
| Description | `Upphandling av lokalvård för skolor, kontor och vårdlokaler inom Uppsala Stad. E2E-testscenario.` |

4. Click **Create procedure**.
5. A new row appears — click **Edit** / open it (slide-over opens).

### 5.2 Plan tab — finish planning

Still on tab **Plan**:

1. Set **Q&A deadline** = Today **+7 days** (if empty).
2. Confirm type = **Open**, title/reference/description as above.
3. Click **Save** (plan save).

### 5.3 Underlag tab — link questionnaire

1. Click tab **Underlag**.
2. In the dropdown, select:  
   `Underlag — Lokalvård kommunala lokaler 2026`
3. Expect toast that underlag is linked.
4. Confirm “Linked underlag” shows that title.

### 5.4 Plan tab — select suppliers to notify

1. Go back to tab **Plan**.
2. Find **Notify suppliers via email (optional)** / direct inform block.
3. Because underlag has CPV `90920000`, you should see **Nordic Facility** and **Mälardalen Clean** (often with a “matched” badge).
4. Click **Select all CPV-matched** (or tick both companies manually).
5. Click **Save** again if you changed invites.

### 5.5 Publish

1. Still in the slide-over footer (or Plan tab), click **Publish**.
2. Expect success toast — possibly “Published and invited 2 supplier(s)”.
3. Status should move to something like **Published — open for bids** / `qa_open` / published (not draft).
4. Close the slide-over.

**Checkpoint:** Procedure is live; both suppliers can see it under Tenders (same CPV / invite).

---

## 6) Both suppliers bid

Do **Supplier A** fully, then repeat for **Supplier B**.

### 6.1 Open the tender (each supplier)

1. Log in as supplier (`jonas.berg@…` or `anna.holm@…`).
2. Sidebar → **Tenders**.
3. Find: `Ramavtal lokalvård — kommunala lokaler Uppsala 2026`.
4. Click **Open** / View → slide-over opens.

### 6.2 Follow (optional)

1. Click **Follow** (bell) if you want watch status.
2. Badge **Watching** may appear on the list row.

### 6.3 Submit ESPD

1. In the tender slide-over, click **Submit ESPD declaration**.
2. Expect success toast and a green **ESPD submitted** badge (with date).
3. You can leave the slide-over open or close it.

### 6.4 Open bid / answer questionnaire

1. Click **Open bid** (opens the linked questionnaire for **this procedure**).
2. Answer all required questions, then **Submit** (not only draft).

**Sample answers — Nordic Facility (A)**

| # | Answer |
|---|--------|
| 1 | We run an ISO-aligned QMS with monthly audits and digital cleaning schedules. |
| 2 | 1) Uppsala kommun schools 2022–2025, 18 sites. 2) Region Uppsala offices 2021–2024. |
| 3 | Yes — dedicated mobilisation team can start within 14 days. |
| 4 | If policy IF-UPP-2026-7781, SEK 15m, valid to 2027-12-31. (+ upload insurance PDF if question requires document) |

**Sample answers — Mälardalen Clean (B)**

| # | Answer |
|---|--------|
| 1 | Documented routines and supervisor spot-checks weekly. |
| 2 | 1) Enköping kommun offices 2023–2025. 2) Håbo kommun schools 2024–2025. |
| 3 | Yes within 30 days; night coverage by subcontract only. |
| 4 | Trygg-Hansa TH-ENK-2026-2209, SEK 8m, valid to 2027-06-30. |

3. Expect toast: questionnaire submitted.
4. Confirm answers are **read-only** after submit for this procedure.

### 6.5 Optional Q&A (Supplier A)

1. On the tender slide-over, use the **Q&A** section.
2. Send: `Ingår fönsterputs i basåtagandet?`
3. Log in as **buyer** → Procedures → open procedure → tab **Q&A** → select that supplier thread → reply, e.g.  
   `Fönsterputs ingår inte i basåtagandet; kan avropas separat.`

**Checkpoint:** Both suppliers have ESPD + submitted answers for this procedure.

---

## 7) Buyer — unseal, evaluate, complement, award

**Who:** Maria (buyer)  
**Open:** Procedures → row for this procedure → **Edit**.

### 7.1 Unseal

1. In the slide-over footer, click **Unseal** (shown when bids are sealed).
2. Expect success toast; bids become visible for evaluation.

### 7.2 Evaluation tab

1. Open tab **Eval**.
2. For each supplier, select supplier → enter score → notes → **Save evaluation**.

| Supplier | Score | Notes |
|----------|-------|--------|
| Nordic Facility Services AB | `88` | Strong capacity, insurance, references. |
| Mälardalen Clean Partner AB | `74` | Solid but thinner night coverage. |

### 7.3 Complements (optional)

1. Tab **Complements**.
2. Create request to **Nordic Facility**:  
   Message: `Confirm night-shift staffing plan for schools.`  
   Deadline: +3 days. Attach a PDF if you want to test files.
3. As **Jonas**, open Tenders → complements / reply with text (+ optional file) → submit response.
4. As buyer, confirm status **Responded**.

### 7.4 Award tab

1. Tab **Award**.
2. Winner: **Nordic Facility Services AB**.
3. Decision memo:  
   `Tilldelas Nordic Facility Services AB baserat på kapacitet, försäkring och referenser.`
4. Standstill ends: Today **+10 days** (optional).
5. Click **Save award** / save award decision.
6. Expect toast that a **contract was created for the winner**.

### 7.5 Verify contract (buyer)

1. Sidebar → **Contracts**.
2. Find an **Active** contract for Nordic Facility, linked to this procedure / title.
3. Open detail — confirm winner supplier and procedure link.

### 7.6 Verify contract (winner supplier)

1. Log in as `jonas.berg@nordicfacility.e2e`.
2. Sidebar → **Contracts** (supplier).
3. Confirm the same contract appears.

**Optional:** Buyer can also **Create contract** manually and pick supplier + procedure to test the form.

---

## Checklist (success = all done)

```text
[ ] Admin created buyer + 2 suppliers
[ ] Suppliers approved
[ ] Profiles filled (same CPV 90920000)
[ ] Questionnaire created (underlag)
[ ] Procedure published + both suppliers invited/notified
[ ] Both suppliers: ESPD + submitted answers
[ ] Unseal + evaluation scores saved
[ ] Award to Nordic Facility
[ ] Contract visible under buyer Contracts
[ ] Winner sees contract under supplier Contracts
```

Anything after this (supplier marks work done / buyer accepts delivery) is still limited in the app — report as improvement if needed.

---

## Deferred (implemented after E2E)

| # | Topic | Status |
|---|--------|--------|
| 1 | **Re-approval after profile change** | Done — material supplier/buyer profile changes → `pending` + admin re-approval |
| 2 | **Private Q&A chat auto-refresh** | Done — poll while QA open (buyer + supplier) |
| 3 / 3b | **Forms vs procedure bids** | Done — resolved by removing supplier Forms tab (#4) |
| 4 | **Remove supplier Forms tab** | Done |
| 5 | **Lock questionnaire edit when sealed** | Done |
| 6 | **Publish: lock underlag + Unpublish + notify** | Done — inactive procedure responses; republish supported |
| 7 | **Award / Complements locked until unsealed** | Done |
| 8 | **Procedure slide-over labels + i18n** | Done |
| 9 | **Bid deadline updates sealedUntil** | Done |
| 10 | **Eval save: partial refresh** | Done — stays on Eval tab |
| 11 | **Accordion for submitted responses** | Done |
| 12 | **Block deactivate if questionnaire used** | Done |
| 13 | **Complement reply attachments for buyer** | Done — attachments + refresh while complements tab open |
| 14 | **Award notify; no winner line on tender** | Done — winner banner removed (notify already existed) |
| 15 | **Complements: blinking CTA + slide-over** | Done — notification deep-link via `meta` |
| 16 | **Remove Supplier discovery from Contracts** | Done |
| 17 | **Contract edit field labels** | Done |
| 18 | **Contract changes notify + inactive RO** | Done |
| 19 | **Contract thread + delivery** | Done — messages/attachments, mark-done / accept / changes / reopen; no delete |
| 20 | **Admin: search/filters for suppliers & buyers** | Done — Search + status + active filters on Admin Suppliers and Entities lists. |
| 21 | **Lock award fields after award** | Done — UI read-only after award; API rejects changes once award exists or status is awarded/standstill/closed. |
| 22 | **AI feature controls (admin + user)** | Done — Global AI flags (admin tab), per-user AI entitlements (Features modal), user prefs on Profile (supplier + buyer). Effective AI = global ∧ admin entitlement ∧ user preference; `/entitlements/me` returns effective map. |
| 23 | **Supplier tenders: split, categories, Mercell-like rows** | Done — Open tenders = active statuses + category chips + richer Mercell-like cards; History = awarded/standstill/closed + questionnaire history. |
