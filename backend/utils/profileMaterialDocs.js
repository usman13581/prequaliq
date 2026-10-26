/**
 * Profile qualification docs that require admin re-review when replaced.
 * Bid / questionnaire answer attachments must NOT demote an approved supplier.
 */
const PROFILE_DOC_TYPES_REQUIRING_REAPPROVAL = new Set([
  'q2-financial',
  'q5-quality',
  'q6-environment',
  'q7-social',
  'q8-ohs',
  'insurance',
  'liability-insurance',
  'company_registration',
  'general',
]);

function isProfileMaterialDocumentType(documentType) {
  const t = String(documentType || '').trim().toLowerCase();
  if (!t) return false;
  if (t === 'questionnaire_answer' || t.startsWith('questionnaire_answer')) return false;
  if (t.startsWith('bid:') || t.startsWith('qa-')) return false;
  return PROFILE_DOC_TYPES_REQUIRING_REAPPROVAL.has(t);
}

module.exports = {
  PROFILE_DOC_TYPES_REQUIRING_REAPPROVAL,
  isProfileMaterialDocumentType,
};
