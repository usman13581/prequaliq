# Feature Capability Checklist

Competitor capability → **one** PrequaliQ plan ID. Overlapping TendSign/e-Avrop items are deduped.

| Competitor capability | Source | PrequaliQ plan | Notes |
|----------------------|--------|----------------|-------|
| Login / roles | both | 01 | Live |
| Self-register supplier/buyer | both | 02 | In-app `/register`; website redirects |
| Admin approve accounts | both | 03 | |
| Feature / module control | PrequaliQ | 04, 41 | Differentiator |
| Multi-org / departments | both | 05 | |
| Buyer (entity) profile | both | 06 | Live |
| Supplier profile / completeness | TendSign | 07 | Live |
| CPV / NUTS | both | 08 | Live |
| Documents + expiry / requal | TendSign | 09 | Partial |
| Planera / procedure setup | TendSign | 10 | |
| Underlag / requirements | TendSign | 11 | Partial (questionnaires) |
| Annonsera / publish / inform | TendSign | 12 | |
| Search / watch tenders | TendSign | 13 | |
| Frågor & svar (Q&A) | TendSign | 14 | |
| ESPD / exclusion grounds | both | 15 | |
| Structured bid submit | TendSign | 16 | Partial (questionnaire answers) |
| Sealed until deadline | TendSign | 17 | |
| Komplettering | TendSign | 18 | |
| Evaluation / scoring | TendSign | 19 | |
| Tilldelning + notify | TendSign | 20 | |
| Avtalsspärr / standstill | TendSign | 20 | Same plan as award |
| Efterannonsera / close | TendSign | 21 | |
| Direktupphandling | e-Avrop | 22 | |
| Ramavtal + avrop | e-Avrop | 23 | |
| DIS | e-Avrop | 24 | |
| Contract repository | e-Avrop | 25 | |
| Analytics / reporting | both | 26 | |
| API / export | e-Avrop | 27 | Partial export |
| Notifications / audit | both | 28 | Partial notifications |
| Supplier discovery | both | 29 | |
| AI profile assist | PrequaliQ | 30 | Live |
| AI underlag builder | PrequaliQ | 31 | Live |
| AI anbud suggestions | PrequaliQ | 32 | Live |
| AI completeness check | PrequaliQ | 33 | |
| AI prövning risk flags | PrequaliQ | 34 | |
| AI evaluation copilot | PrequaliQ | 35 | |
| AI Q&A drafts | PrequaliQ | 36 | |
| AI annons draft | PrequaliQ | 37 | |
| AI award memo | PrequaliQ | 38 | |
| AI CPV recommender | PrequaliQ | 39 | |
| AI supplier matching | PrequaliQ | 40 | |

## Deduped (intentionally one module)

| Overlap | Single plan |
|---------|-------------|
| Full digital upphandling (e-Avrop) vs TendSign loop | 10–21 |
| Contract award + standstill notify | 20 |
| Publish + after-announce | 12 + 21 |

## Related

- [00-lifecycle-overview.md](00-lifecycle-overview.md)
- [00-competitive-positioning.md](00-competitive-positioning.md)
