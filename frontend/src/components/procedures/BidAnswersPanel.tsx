import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Download, Eye, FileText, Lock, Paperclip } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { SlideOver } from '../ui/SlideOver';
import { openDocumentFile } from '../../utils/documentFile';

type AnswerDocument = { id: string; fileName: string; fileSize?: number | null; mimeType?: string | null };
type BidAnswer = {
  id: string;
  questionId: string;
  answerText?: string | null;
  answerValue?: unknown;
  document?: AnswerDocument | null;
  question?: {
    id: string;
    questionText: string;
    questionType?: string;
    order?: number | null;
    requiresDocument?: boolean;
    documentType?: string | null;
  } | null;
};
type BidResponse = {
  id: string;
  supplierId: string;
  submittedAt?: string | null;
  supplier?: { id: string; companyName?: string } | null;
  answers?: BidAnswer[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  procedureId: string;
  questionnaireId: string | null | undefined;
  procedureTitle?: string;
  /** Bids listed on the evaluation tab (a bid saved before procedures existed has no procedure id). */
  bidIds: string[];
  /** Open with this supplier expanded; without it every bid is expanded. */
  focusSupplierId?: string | null;
};

function formatSize(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function answerDisplay(answer: BidAnswer, yes: string, no: string): string {
  const raw = answer.answerText ?? answer.answerValue ?? '';
  if (Array.isArray(raw)) return raw.map(String).join(', ');
  if (raw === true || raw === 'true' || raw === 'yes') return yes;
  if (raw === false || raw === 'false' || raw === 'no') return no;
  const text = String(raw ?? '').trim();
  if (answer.question?.questionType === 'date' && /^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [y, m, d] = text.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString();
  }
  return text;
}

/**
 * Every submitted answer for one procedure, per supplier, with the file attached to an
 * answer shown on that answer. Only available once the bids are unsealed.
 */
export function BidAnswersPanel({
  open,
  onClose,
  procedureId,
  questionnaireId,
  procedureTitle,
  bidIds,
  focusSupplierId
}: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [responses, setResponses] = useState<BidResponse[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const bidKey = bidIds.join(',');

  useEffect(() => {
    if (!open || !questionnaireId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setSealed(false);
      try {
        const wanted = new Set(bidKey ? bidKey.split(',') : []);
        const first = await api.get(`/questionnaires/${questionnaireId}/responses`, { params: { procedureId } });
        let rows: BidResponse[] = first.data.responses || [];
        const missing = [...wanted].some((id) => !rows.some((r) => r.id === id));
        if (missing) {
          const all = await api.get(`/questionnaires/${questionnaireId}/responses`);
          const extra = ((all.data.responses || []) as BidResponse[]).filter(
            (r) => wanted.has(r.id) && !rows.some((x) => x.id === r.id)
          );
          rows = [...rows, ...extra];
        }
        if (cancelled) return;
        rows.sort((a, b) =>
          String(a.supplier?.companyName || '').localeCompare(String(b.supplier?.companyName || ''))
        );
        setResponses(rows);
        const next: Record<string, boolean> = {};
        for (const r of rows) next[r.id] = focusSupplierId ? r.supplierId === focusSupplierId : true;
        setExpanded(next);
      } catch (error: any) {
        if (cancelled) return;
        setResponses([]);
        if (error.response?.data?.sealed) setSealed(true);
        else showToast(error.response?.data?.message || t('procedures.answers.loadFailed'), 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, questionnaireId, procedureId, bidKey, focusSupplierId]);

  const sortedAnswers = useMemo(() => {
    const map: Record<string, BidAnswer[]> = {};
    for (const r of responses) {
      map[r.id] = [...(r.answers || [])].sort(
        (a, b) => Number(a.question?.order ?? 0) - Number(b.question?.order ?? 0)
      );
    }
    return map;
  }, [responses]);

  const openFile = async (doc: AnswerDocument, mode: 'view' | 'download') => {
    try {
      await openDocumentFile(doc.id, doc.fileName, mode);
    } catch {
      showToast(t('procedures.answers.fileFailed'), 'error');
    }
  };

  const allOpen = responses.length > 0 && responses.every((r) => expanded[r.id]);

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={t('procedures.answers.title')}
      subtitle={procedureTitle}
      widthClass="max-w-full lg:max-w-[62%]"
    >
      {!questionnaireId ? (
        <p className="text-sm text-muted">{t('procedures.answers.noQuestionnaire')}</p>
      ) : loading ? (
        <p className="text-sm text-muted">{t('common.loading')}</p>
      ) : sealed ? (
        <p className="flex items-start gap-2 text-sm text-amber-900 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
          <Lock size={16} className="shrink-0 mt-0.5" />
          {t('procedures.answers.sealed')}
        </p>
      ) : responses.length === 0 ? (
        <p className="text-sm text-muted">{t('procedures.evalEmpty')}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted">
              {t('procedures.answers.bidCount', { count: responses.length })}
            </p>
            {responses.length > 1 ? (
              <button
                type="button"
                className="text-xs font-semibold text-accent hover:underline"
                onClick={() => {
                  const next: Record<string, boolean> = {};
                  for (const r of responses) next[r.id] = !allOpen;
                  setExpanded(next);
                }}
              >
                {allOpen ? t('procedures.answers.collapseAll') : t('procedures.answers.expandAll')}
              </button>
            ) : null}
          </div>

          {responses.map((r) => {
            const answers = sortedAnswers[r.id] || [];
            const fileCount = answers.filter((a) => a.document).length;
            const isOpen = Boolean(expanded[r.id]);
            return (
              <section key={r.id} className="rounded-2xl border border-border bg-white overflow-hidden">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setExpanded((prev) => ({ ...prev, [r.id]: !isOpen }))}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">
                      {r.supplier?.companyName || '—'}
                    </p>
                    <p className="text-xs text-muted">
                      {t('procedures.evalAnswersCount', { count: answers.length })}
                      {fileCount ? ` · ${t('procedures.answers.fileCount', { count: fileCount })}` : ''}
                      {r.submittedAt
                        ? ` · ${t('procedures.answers.submitted')} ${new Date(r.submittedAt).toLocaleString()}`
                        : ''}
                    </p>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen ? (
                  <ol className="border-t border-border divide-y divide-border">
                    {answers.length === 0 ? (
                      <li className="px-4 py-3 text-sm text-muted">{t('common.noAnswerProvided')}</li>
                    ) : (
                      answers.map((a, idx) => {
                        const text = answerDisplay(a, t('common.yes'), t('common.no'));
                        return (
                          <li key={a.id} className="px-4 py-3">
                            <p className="text-xs font-semibold text-muted">
                              {idx + 1}. {a.question?.questionText || '—'}
                            </p>
                            {text ? (
                              <p className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">{text}</p>
                            ) : !a.document ? (
                              <p className="mt-1 text-sm text-muted italic">{t('common.noAnswerProvided')}</p>
                            ) : null}
                            {a.document ? (
                              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                                <FileText size={16} className="shrink-0 text-accent" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-foreground truncate">{a.document.fileName}</p>
                                  <p className="text-xs text-muted">
                                    {[a.question?.documentType, formatSize(a.document.fileSize)]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => openFile(a.document as AnswerDocument, 'view')}
                                  className="btn-cancel inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                >
                                  <Eye size={14} /> {t('buttons.view')}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openFile(a.document as AnswerDocument, 'download')}
                                  className="btn-save inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                                >
                                  <Download size={14} /> {t('procedures.answers.download')}
                                </button>
                              </div>
                            ) : a.question?.requiresDocument ? (
                              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-800">
                                <Paperclip size={12} /> {t('procedures.answers.missingFile')}
                              </p>
                            ) : null}
                          </li>
                        );
                      })
                    )}
                  </ol>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </SlideOver>
  );
}
