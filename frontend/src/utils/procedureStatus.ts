/** Friendly procedure lifecycle labels — never show raw API enums in the UI. */
export const PROCEDURE_STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'procedures.status.draft',
  planned: 'procedures.status.planned',
  underlag_ready: 'procedures.status.underlagReady',
  published: 'procedures.status.published',
  qa_open: 'procedures.status.qaOpen',
  bidding: 'procedures.status.bidding',
  evaluation: 'procedures.status.evaluation',
  awarded: 'procedures.status.awarded',
  standstill: 'procedures.status.standstill',
  closed: 'procedures.status.closed',
  cancelled: 'procedures.status.cancelled'
};

export function procedureStatusLabelKey(status?: string | null): string {
  if (!status) return 'procedures.status.unknown';
  return PROCEDURE_STATUS_LABEL_KEY[status] || 'procedures.status.unknown';
}
