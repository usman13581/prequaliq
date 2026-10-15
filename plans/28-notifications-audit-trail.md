# Notifications & Audit Trail

- **Module name (EN):** Notifications & Audit Trail
- **Feature key:** `platform.notifications_audit`
- **i18n:** `modules.platform.notifications_audit.name` / `.description` (`en.json` + `sv.json`)
- **Status:** `partial`
- **Layer:** `parity`
- **Covers competitor:** both
- **Who:** buyer (P), supplier (P), admin (Cfg)
- **Access:** In-app notifications for lifecycle events; audit log for sensitive actions.
- **Lifecycle step:** 0–11

## What it does

Bell notifications (live supplier pattern) + immutable audit events for publish, bid, award, approval.

## User journey

Event occurs → bell/Toast → user opens list → audit available to admin/buyer as scoped.

## UI objects

Compose only from [00-ui-objects.md](00-ui-objects.md): **PortalShell, SlimListRow, StatusBadge, Toast, ContentCard**.

## Admin controls

Feature key(s): `platform.notifications_audit`. Admin toggles per account via plans 04 / 41 when live.

## Parity notes

Activity / meddelanden.

## AI enhancement (extra)

None

## Vibe build notes

Extend SupplierNotificationsBell pattern to buyer/admin; add audit store.

## Depends on

01
