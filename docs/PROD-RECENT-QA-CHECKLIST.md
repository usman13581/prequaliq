# Recent fixes to retest on production (+ demo seed)

## How to wipe + reseed production data

**Do not use a schema migration for this** — use the demo seed (keeps admin + CPV/NUTS catalogs).

### Option A — Railway one-shot (easiest)

1. Backend service → **Variables**
2. Set:
   - `CONFIRM_PROD_SEED=YES`
   - `SEED_DEMO_DATA=1`
3. **Redeploy** and watch logs until `Demo seed complete`
4. **Remove** both variables (important — otherwise every restart wipes again)
5. Hard-refresh the frontend

### Option B — from your machine

```bash
cd backend
CONFIRM_PROD_SEED=YES NODE_ENV=production DATABASE_URL='<Railway public Postgres URL>' npm run seed-prod-demo
```

### What you get (quantity)

- ~22 buyers (`buyer1…22@prequaliq.demo`)
- ~12 suppliers (`supplier1…12@prequaliq.demo`) + E2E kit
- Many questionnaires, procedures (open / sealed / evaluation / awarded), bids, complements, contracts, notifications
- Password for all demo/E2E: `Password123!`
- Admin: `admin@prequaliq.com` / `Admin123!`

### Key accounts for recent features

| Account | Use for |
|---------|---------|
| `stina.bofors@aurorait.e2e` | Profile AI → CPV/NUTS from PDF (`08-aurora-stina-bofors-cpv-nuts.pdf`) |
| `jonas.berg@nordicfacility.e2e` | Profile AI docs, contracts, tenders, notifications |
| `maria.lindqvist@uppsalastad.e2e` | Buyer award/eval AI, questionnaires, procedures |
| `supplier1@prequaliq.demo` | SCENARIO A–F tenders + active contract messaging |
| `buyer1@prequaliq.demo` | `[AI TEST]` award procedures |

---

## Checklist — last week’s product work

### 1) Profile AI — CPV + NUTS (Stina)

- [ ] Login `stina.bofors@aurorait.e2e`
- [ ] Profile → Edit → upload `docs/ai-test-kit/pdfs/08-aurora-stina-bofors-cpv-nuts.pdf`
- [ ] Drawer shows company fields **and** CPV `72000000`/`72200000` **and** Stockholm NUTS
- [ ] Apply → Business scope shows codes **without** racing Save
- [ ] Save Changes for text fields

### 2) Questionnaire upload does **not** un-approve

- [ ] Approved supplier uploads a questionnaire/bid attachment
- [ ] Status stays **approved**
- [ ] Replacing **insurance** / company registration **does** move to pending

### 3) Contract messages (no false error toast)

- [ ] `supplier1` → Contracts → open active contract
- [ ] Send message → success toast only (message appears in thread)

### 4) History readonly

- [ ] Supplier → **History** → open awarded/closed tender
- [ ] Banner: closed / view-only
- [ ] No Follow / Open bid / ESPD submit / Q&A send

### 5) Notifications bell

- [ ] Header bell shows seeded items
- [ ] Mark read / Notifications tab works (buyer + supplier)

### 6) AI busy button / GPU

- [ ] Admin AI flags ON; supplier AI status online
- [ ] Busy state on AI buttons (no ghosted text)

### 7) Buyer AI paths (Maria / buyer1)

- [ ] Questionnaire AI draft from description
- [ ] `[AI TEST]` award memo / announcement on buyer1 procedures
