import { TFunction } from 'i18next';

type Section = { id: string; label?: string; complete: boolean };
type Blocker = string | { key: string; question?: string };

export function translateCompletenessSection(t: TFunction, section: Section): string {
  const key = `supplierPortal.completenessSections.${section.id}`;
  const translated = t(key);
  return translated !== key ? translated : (section.label || section.id);
}

export function translateCompletenessBlocker(t: TFunction, blocker: Blocker): string {
  if (typeof blocker === 'string') {
    if (blocker.startsWith('answer_q')) {
      return t('supplierPortal.blockers.answer_question', { n: blocker.replace('answer_q', '') });
    }
    if (blocker.startsWith('document_q')) {
      return t('supplierPortal.blockers.upload_document', { n: blocker.replace('document_q', '') });
    }
    if (blocker.startsWith('expired_document_q')) {
      return t('supplierPortal.blockers.renew_document', { n: blocker.replace('expired_document_q', '') });
    }
    const key = `supplierPortal.blockers.${blocker}`;
    const translated = t(key);
    return translated !== key ? translated : blocker;
  }
  const key = `supplierPortal.blockers.${blocker.key}`;
  if (blocker.question) {
    return t(key, { n: blocker.question });
  }
  const translated = t(key);
  return translated !== key ? translated : blocker.key;
}

export function translateNextActionLabel(t: TFunction, labelKey?: string, fallback?: string): string {
  if (!labelKey) return fallback || '';
  const key = `supplierPortal.nextActions.${labelKey}`;
  const translated = t(key);
  return translated !== key ? translated : (fallback || labelKey);
}
