# UI Objects Catalog

**Unify rule:** New feature UI = existing PrequaliQ shell + objects + tokens. No second design system. No TendSign/e-Avrop skins.

## Sources of truth

- Tokens: `frontend/tailwind.config.js`, `frontend/src/index.css`
- Shell: `frontend/src/components/ui/PortalLayout.tsx`, `PortalSidebar.tsx`
- Lists: `frontend/src/components/questionnaires/QuestionnaireSlimRow.tsx`
- Stats: `frontend/src/components/admin/AdminStatCards.tsx`
- Forms: `.input-brand`, `DateOnlyPicker.tsx`, `CpvSearchSelect.tsx`
- Feedback: `Toast.tsx`, modal overlay pattern
- AI: violet `*AiAssist` components

## Tokens (frozen)

| Role | Value |
|------|--------|
| App bg | `#fafbfc` + `.app-page-bg` |
| Foreground | `#0b1220` |
| Card | white, `rounded-2xl`, `border-border`, `shadow-sm` |
| Accent | `#2563eb` (`.btn-save`) |
| Navy / primary | `#0f2744` / `#1a3a5c` |
| Muted | `#5c6b7a` |
| AI | violet-50 / violet-600 only |
| Font portal | Inter (`.font-app`) |
| Font auth | Plus Jakarta Sans (`.font-website`) |

## Object catalog

| Object | Looks like | Use for |
|--------|------------|---------|
| **PortalShell** | Light header + navy icon rail + `app-page-bg` | All portal screens |
| **SidebarItem** | Lucide icon + tiny label; active blue inset | Top-level tabs |
| **ContentCard** | White `rounded-2xl` border card | Sections, detail panels |
| **StatCard** | Metric + gradient icon tile | Home KPIs |
| **SlimListRow** | `rounded-xl` row title/meta/trailing | Lists (tenders, bids, contracts) |
| **StatusBadge** | Pill uppercase tones | Draft / published / sealed / awarded |
| **RowActionButton** | Compact primary/secondary/danger | List actions |
| **PrimaryButton** | `.btn-save` blue | Save, Publish, Submit |
| **ApproveButton** | `.btn-approve` green | Approve |
| **RejectButton** | `.btn-reject` orange | Reject / send back |
| **CancelButton** | `.btn-cancel` | Modal dismiss |
| **DeleteButton** | `.btn-delete` red | Destructive |
| **TextField** | `.input-brand` `rounded-xl` | Text inputs |
| **DateField** | DateOnlyPicker navy calendar | Deadlines, validity |
| **SearchSelect** | CpvSearchSelect-style | CPV, NUTS, filters |
| **ProfileTabs** | White bar + primary active | Multi-section wizards |
| **CompletenessRail** | Progress + checklist | Bid/profile readiness |
| **Modal** | `bg-black/50–60` + white `rounded-2xl` | Confirms, detail dialogs |
| **Toast** | Centered gradient | Short success/error |
| **Pagination** | ListPagination | Long lists |
| **EmptyState** | Dashed `rounded-xl` + CTA | Empty lists |
| **AlertBanner** | Tinted `rounded-xl` border | Rejection, conflicts |
| **AiAssistBar** | Violet bar + Sparkles | AI entry |
| **AiDrawer** | Right violet slide-over | Heavy AI review |
| **AiInlinePanel** | Violet gradient on form | Light suggestions |

## Composition examples

| Screen | Objects |
|--------|---------|
| Buyer home | PortalShell, StatCard, SlimListRow, StatusBadge |
| Planera / Underlag | ProfileTabs, ContentCard, TextField, DateField, SearchSelect, AiDrawer |
| Tender search | SearchSelect, SlimListRow, RowActionButton, Pagination |
| Bid submit | CompletenessRail, TextField, AiInlinePanel, PrimaryButton |
| Admin approval | SlimListRow, ApproveButton, RejectButton, Modal, Toast |
| Award | ContentCard, StatusBadge, Modal, DateField |

## Anti-patterns

- New palette, fonts, or radii
- Competitor-clone layouts
- Second nav outside PortalShell
- Non-violet AI chrome
- Raw inputs beside `.input-brand`
- One-off modal styles

## Auth pages

Login/Register use `.login-page-bg` + `.auth-card` + website font. Portal features never reuse auth chrome for in-app workflows.
