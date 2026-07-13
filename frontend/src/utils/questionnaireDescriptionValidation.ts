export const QUESTIONNAIRE_DESC_MIN = 10;
export const QUESTIONNAIRE_DESC_MAX = 300;

export type QuestionnaireDescValidationCode =
  | 'DESCRIPTION_TOO_SHORT'
  | 'DESCRIPTION_TOO_LONG';

export function validateQuestionnaireDescription(
  text: string
): { valid: true } | { valid: false; code: QuestionnaireDescValidationCode } {
  const trimmed = String(text || '').trim();

  if (trimmed.length < QUESTIONNAIRE_DESC_MIN) {
    return { valid: false, code: 'DESCRIPTION_TOO_SHORT' };
  }
  if (trimmed.length > QUESTIONNAIRE_DESC_MAX) {
    return { valid: false, code: 'DESCRIPTION_TOO_LONG' };
  }

  return { valid: true };
}
