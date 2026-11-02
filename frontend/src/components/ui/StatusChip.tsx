type StatusFamily = 'done' | 'open' | 'draft' | 'danger' | 'warn';

const FAMILY_BY_STATUS: Record<string, StatusFamily> = {
  approved: 'done',
  active: 'done',
  awarded: 'done',
  completed: 'done',
  published: 'open',
  bidding: 'open',
  qa_open: 'open',
  evaluation: 'open',
  open: 'open',
  issued: 'open',
  pending: 'warn',
  draft: 'draft',
  planned: 'draft',
  inactive: 'draft',
  rejected: 'danger',
  cancelled: 'danger',
  canceled: 'danger',
  closed: 'draft',
  requalification_required: 'warn',
};

type StatusChipProps = {
  status?: string | null;
  label: string;
  family?: StatusFamily;
  className?: string;
};

export function StatusChip({ status, label, family, className = '' }: StatusChipProps) {
  const resolved =
    family ||
    (status ? FAMILY_BY_STATUS[String(status).toLowerCase()] : undefined) ||
    'draft';

  return (
    <span className={`status-chip status-chip--${resolved} ${className}`.trim()}>{label}</span>
  );
}
