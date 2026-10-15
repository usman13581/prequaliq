# Self-Registration & Eligibility

- **Module name (EN):** Self-Registration & Eligibility
- **Feature key:** `platform.self_registration`
- **i18n:** `modules.platform.self_registration.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `platform`
- **Covers competitor:** both
- **Who:** buyer (P register), supplier (P register), admin (Cfg)
- **Access:** Buyer/supplier create account in-app; admin configures eligibility rules later.
- **Lifecycle step:** 0

## What it does

In-app registration forms for supplier and buyer (procuring entity). Marketing website Register CTA redirects to app `/register`. No signup form on the website. After register: profile completeness and eligibility checks before admin review.

## User journey

Website Register click → redirect to app `/register` → choose supplier or buyer → fill form → account created (pending) → complete profile/docs → submit for eligibility/admin approval.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **TextField, PrimaryButton, SearchSelect, AlertBanner, Toast, ContentCard**.

## Admin controls

Feature key(s): `platform.self_registration`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

Leverantörskonto / köpare onboarding; form ownership is PrequaliQ app.

## AI enhancement (extra)

Optional later: AI Profile Assist (30) after register.

## Vibe build notes

Extend `frontend/src/pages/Register.tsx` + `/auth/register`. Document website deep-link URL. Pending state until 03 approves.

## Depends on

01
