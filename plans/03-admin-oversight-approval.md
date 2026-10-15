# Admin Oversight & Approval

- **Module name (EN):** Admin Oversight & Approval
- **Feature key:** `platform.admin_approval`
- **i18n:** `modules.platform.admin_approval.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `live`
- **Layer:** `platform`
- **Covers competitor:** both
- **Who:** admin (P), buyer (S await/fix), supplier (S await/fix)
- **Access:** Admin approve/reject accounts; users see status and fix/resubmit.
- **Lifecycle step:** 0

## What it does

Admin reviews registered buyer and supplier accounts for eligibility; approve activates entitlements; reject returns to fix flow.

## User journey

Admin opens pending list → review profile/docs → Approve or Reject → Toast. User sees AlertBanner status on overview.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, SlimListRow, StatusBadge, ApproveButton, RejectButton, Modal, Toast, AlertBanner**.

## Admin controls

Feature key(s): `platform.admin_approval`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

Admin handläggare approval gate.

## AI enhancement (extra)

None required; later risk flags optional.

## Vibe build notes

Extend admin Dashboard approval UX; unify StatusBadge tones pending/approved/rejected.

## Depends on

01, 02
