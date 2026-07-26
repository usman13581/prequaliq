import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export type AnswerSuggestion = {
  questionId: string;
  questionText: string;
  questionType: string;
  answerText: string;
  answerValue: string;
  confidence: number;
  rationale: string;
  skipped: boolean;
  skipReason: string;
  suggestedDocumentId?: string | null;
  suggestedDocumentName?: string | null;
  requiresDocument?: boolean;
};

type Props = {
  questionnaireId: string;
  disabled?: boolean;
  onApply: (suggestions: AnswerSuggestion[]) => void;
};

export function SupplierQuestionnaireAnswerAiAssist({
  questionnaireId,
  disabled = false,
  onApply,
}: Props) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [disclaimer, setDisclaimer] = useState('');
  const [items, setItems] = useState<Array<AnswerSuggestion & { selected: boolean }>>([]);

  const selectedCount = useMemo(
    () => items.filter((i) => i.selected && !i.skipped).length,
    [items]
  );

  const generate = async () => {
    try {
      setLoading(true);
      const res = await api.post<{
        suggestions: AnswerSuggestion[];
        disclaimer?: string;
        suggestedCount?: number;
      }>(`/supplier/questionnaires/${questionnaireId}/ai-suggest-answers`, {
        language: (i18n.language || 'en').slice(0, 2),
      });
      const suggestions = res.data.suggestions || [];
      setDisclaimer(res.data.disclaimer || '');
      setItems(
        suggestions.map((s) => ({
          ...s,
          selected: !s.skipped && Boolean(String(s.answerText || s.answerValue || '').trim()),
        }))
      );
      setOpen(true);
      if (!suggestions.some((s) => !s.skipped)) {
        showToast(t('supplierPortal.aiAnswersNone'), 'warning');
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message || t('supplierPortal.aiAnswersFailed');
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (questionId: string, checked: boolean) => {
    setItems((prev) =>
      prev.map((i) => (i.questionId === questionId ? { ...i, selected: checked } : i))
    );
  };

  const handleApply = () => {
    const selected = items.filter((i) => i.selected && !i.skipped);
    if (!selected.length) {
      showToast(t('supplierPortal.aiAnswersNothingSelected'), 'error');
      return;
    }
    onApply(selected);
    showToast(t('supplierPortal.aiAnswersApplied', { count: selected.length }), 'success');
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/70 to-white p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 inline-flex items-center gap-1.5">
            <Sparkles size={16} className="text-violet-600" />
            {t('supplierPortal.aiAnswersTitle')}
          </p>
          <p className="text-xs text-muted mt-0.5">{t('supplierPortal.aiAnswersSubtitle')}</p>
        </div>
        <button
          type="button"
          disabled={disabled || loading}
          onClick={generate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {t('supplierPortal.aiAnswersLoading')}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {t('supplierPortal.aiAnswersGenerate')}
            </>
          )}
        </button>
      </div>

      {items.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:text-violet-900"
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {open
            ? t('supplierPortal.aiAnswersHide')
            : t('supplierPortal.aiAnswersShow', { count: items.filter((i) => !i.skipped).length })}
        </button>
      )}

      {open && items.length > 0 && (
        <div className="space-y-3 border-t border-violet-100 pt-3">
          {disclaimer && <p className="text-[11px] text-amber-800">{disclaimer}</p>}
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {items.map((item, idx) => (
              <li
                key={item.questionId}
                className={`rounded-lg border p-2.5 ${
                  item.skipped ? 'border-gray-200 bg-gray-50' : 'border-violet-100 bg-white'
                }`}
              >
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={item.skipped}
                    checked={item.selected && !item.skipped}
                    onChange={(e) => toggle(item.questionId, e.target.checked)}
                    className="mt-1"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold text-gray-500">
                      {t('sections.questionNumber', { n: idx + 1 })} · {item.questionType}
                      {!item.skipped && typeof item.confidence === 'number' && (
                        <span className="ml-1 text-violet-700">
                          · {Math.round(item.confidence * 100)}%
                        </span>
                      )}
                    </span>
                    <span className="block text-xs text-gray-800 mt-0.5 line-clamp-2">
                      {item.questionText}
                    </span>
                    {item.skipped ? (
                      <span className="block text-xs text-amber-800 mt-1">
                        {item.skipReason || t('supplierPortal.aiAnswersSkipped')}
                      </span>
                    ) : (
                      <>
                        <span className="block text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                          {item.answerText || item.answerValue}
                        </span>
                        {item.rationale && (
                          <span className="block text-[11px] text-muted mt-1">{item.rationale}</span>
                        )}
                        {item.suggestedDocumentName && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-violet-700">
                            <FileText size={12} />
                            {t('supplierPortal.aiAnswersSuggestedDoc', {
                              name: item.suggestedDocumentName,
                            })}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={selectedCount === 0}
            onClick={handleApply}
            className="w-full px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {t('supplierPortal.aiAnswersApplyCount', { count: selectedCount })}
          </button>
        </div>
      )}
    </div>
  );
}
