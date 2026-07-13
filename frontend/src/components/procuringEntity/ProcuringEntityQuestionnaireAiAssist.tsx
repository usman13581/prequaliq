import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Sparkles,
  XCircle,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import {
  QUESTIONNAIRE_DESC_MAX,
  QUESTIONNAIRE_DESC_MIN,
  validateQuestionnaireDescription,
  type QuestionnaireDescValidationCode,
} from '../../utils/questionnaireDescriptionValidation';

export type CpvSuggestion = {
  cpvCodeId: string;
  code: string;
  description: string;
  reason: string;
  confidence: number;
  supplierCount?: number;
};

export type AiQuestionSuggestion = {
  questionText: string;
  questionType: string;
  isRequired: boolean;
  requiresDocument: boolean;
  documentType?: string | null;
  options?: string[] | null;
};

export type QuestionnaireUnderstandResponse = {
  isValid: boolean;
  understanding: string;
  category: string;
  rejectionReason: string;
  userDescription: string;
};

export type QuestionnaireAiResponse = {
  title: string;
  description: string;
  procurementDescription: string;
  cpvSuggestions: CpvSuggestion[];
  recommendedCpvCodeId: string | null;
  questions: AiQuestionSuggestion[];
  questionCount: number;
  disclaimer: string;
};

export type AppliedQuestionnaireDraft = {
  title: string;
  description: string;
  cpvCodeId: string;
  questions: Array<{
    questionText: string;
    questionType: string;
    isRequired: boolean;
    requiresDocument: boolean;
    documentType?: string;
    options?: string[];
    order: number;
  }>;
};

type LocalQuestion = AiQuestionSuggestion & {
  key: string;
  selected: boolean;
  requiresDocumentEnabled: boolean;
};

type ContextValue = {
  loading: boolean;
  loadingPhase: 'understand' | 'generate' | null;
  hasResult: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  description: string;
  setDescription: (v: string) => void;
  validationError: string | null;
  descriptionCharCount: number;
  descriptionMaxChars: number;
  generate: () => void;
  understandModalOpen: boolean;
  understanding: QuestionnaireUnderstandResponse | null;
  confirmGenerate: () => void;
  dismissUnderstand: () => void;
  handleApply: () => void;
  result: QuestionnaireAiResponse | null;
  selectedCpvCodeId: string;
  setSelectedCpvCodeId: (id: string) => void;
  questions: LocalQuestion[];
  toggleQuestion: (key: string, checked: boolean) => void;
  toggleQuestionDocument: (key: string, checked: boolean) => void;
  selectedQuestionCount: number;
  canApply: boolean;
};

const QuestionnaireAiContext = createContext<ContextValue | null>(null);

function useQuestionnaireAi() {
  const ctx = useContext(QuestionnaireAiContext);
  if (!ctx) throw new Error('ProcuringEntityQuestionnaireAiAssist must be used within Root');
  return ctx;
}

type RootProps = {
  onApply: (draft: AppliedQuestionnaireDraft) => void;
  children: ReactNode;
};

function Root({ onApply, children }: RootProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [loadingPhase, setLoadingPhase] = useState<'understand' | 'generate' | null>(null);
  const [understandModalOpen, setUnderstandModalOpen] = useState(false);
  const [understanding, setUnderstanding] = useState<QuestionnaireUnderstandResponse | null>(null);
  const [result, setResult] = useState<QuestionnaireAiResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedCpvCodeId, setSelectedCpvCodeId] = useState('');
  const [questions, setQuestions] = useState<LocalQuestion[]>([]);

  const validationMessage = (code: QuestionnaireDescValidationCode) => {
    const keys: Record<QuestionnaireDescValidationCode, string> = {
      DESCRIPTION_TOO_SHORT: 'entityPortal.aiQuestionnaireDescTooShort',
      DESCRIPTION_TOO_LONG: 'entityPortal.aiQuestionnaireDescTooLong',
    };
    return t(keys[code]);
  };

  const runClientValidation = (text: string) => {
    const result = validateQuestionnaireDescription(text);
    if (!result.valid) {
      const msg = validationMessage(result.code);
      setValidationError(msg);
      return { ok: false as const, message: msg };
    }
    setValidationError(null);
    return { ok: true as const };
  };

  const handleSetDescription = (v: string) => {
    const next = v.slice(0, QUESTIONNAIRE_DESC_MAX);
    setDescription(next);
    if (validationError) {
      const result = validateQuestionnaireDescription(next.trim());
      setValidationError(result.valid ? null : validationMessage(result.code));
    }
  };

  const runFullGeneration = async (trimmed: string) => {
    setResult(null);
    setDrawerOpen(false);
    const res = await api.post<QuestionnaireAiResponse>('/procuring-entity/questionnaires/ai-suggest', {
      description: trimmed,
      language: (i18n.language || 'en').slice(0, 2),
    });
    const data = res.data;
    setResult(data);
    setSelectedCpvCodeId(data.recommendedCpvCodeId || data.cpvSuggestions[0]?.cpvCodeId || '');
    setQuestions(
      (data.questions || []).map((q, i) => ({
        ...q,
        key: `q-${i}`,
        selected: true,
        requiresDocumentEnabled: Boolean(q.requiresDocument),
      }))
    );
    setDrawerOpen(true);
    if (!data.questions?.length) {
      showToast(t('entityPortal.aiQuestionnaireNoQuestions'), 'warning');
    }
  };

  const generate = async () => {
    const trimmed = description.trim();
    const check = runClientValidation(trimmed);
    if (!check.ok) {
      showToast(check.message, 'error');
      return;
    }
    try {
      setLoadingPhase('understand');
      setUnderstandModalOpen(false);
      setUnderstanding(null);
      const res = await api.post<QuestionnaireUnderstandResponse>(
        '/procuring-entity/questionnaires/ai-understand',
        {
          description: trimmed,
          language: (i18n.language || 'en').slice(0, 2),
        }
      );
      const data = res.data;
      if (!data.isValid) {
        const msg =
          data.rejectionReason || t('entityPortal.aiQuestionnaireDescNotProcurement');
        setValidationError(msg);
        showToast(msg, 'error');
        return;
      }
      setValidationError(null);
      setUnderstanding(data);
      setUnderstandModalOpen(true);
    } catch (error: any) {
      const code = error.response?.data?.code as QuestionnaireDescValidationCode | undefined;
      const msg =
        error.response?.data?.message ||
        (code ? validationMessage(code) : t('entityPortal.aiQuestionnaireFailed'));
      setValidationError(msg);
      showToast(msg, 'error');
    } finally {
      setLoadingPhase(null);
    }
  };

  const confirmGenerate = async () => {
    const trimmed = (understanding?.userDescription || description).trim();
    if (!trimmed) return;
    try {
      setLoadingPhase('generate');
      setUnderstandModalOpen(false);
      await runFullGeneration(trimmed);
    } catch (error: any) {
      const msg = error.response?.data?.message || t('entityPortal.aiQuestionnaireFailed');
      showToast(msg, 'error');
    } finally {
      setLoadingPhase(null);
      setUnderstanding(null);
    }
  };

  const dismissUnderstand = () => {
    setUnderstandModalOpen(false);
    setUnderstanding(null);
    showToast(t('entityPortal.aiQuestionnaireRewriteHint'), 'info');
  };

  const loading = loadingPhase !== null;

  const toggleQuestion = (key: string, checked: boolean) => {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, selected: checked } : q)));
  };

  const toggleQuestionDocument = (key: string, checked: boolean) => {
    setQuestions((prev) =>
      prev.map((q) => (q.key === key ? { ...q, requiresDocumentEnabled: checked } : q))
    );
  };

  const selectedQuestionCount = questions.filter((q) => q.selected).length;

  const handleApply = () => {
    if (!result) return;
    if (!selectedCpvCodeId) {
      showToast(t('entityPortal.aiQuestionnaireSelectCpv'), 'error');
      return;
    }
    const selected = questions.filter((q) => q.selected);
    if (!selected.length) {
      showToast(t('entityPortal.aiQuestionnaireSelectQuestions'), 'error');
      return;
    }
    onApply({
      title: result.title,
      description: result.description,
      cpvCodeId: selectedCpvCodeId,
      questions: selected.map((q, index) => ({
        questionText: q.questionText,
        questionType: q.questionType,
        isRequired: q.isRequired,
        requiresDocument: q.requiresDocumentEnabled,
        documentType: q.requiresDocumentEnabled ? q.documentType || undefined : undefined,
        options: q.options || undefined,
        order: index,
      })),
    });
    setResult(null);
    setDrawerOpen(false);
    setQuestions([]);
    setDescription('');
    setValidationError(null);
    showToast(t('entityPortal.aiQuestionnaireApplied'), 'success');
  };

  const canApply = Boolean(result && selectedCpvCodeId && selectedQuestionCount > 0);

  const value: ContextValue = {
    loading,
    loadingPhase,
    hasResult: Boolean(result),
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    description,
    setDescription: handleSetDescription,
    validationError,
    descriptionCharCount: description.length,
    descriptionMaxChars: QUESTIONNAIRE_DESC_MAX,
    generate,
    understandModalOpen,
    understanding,
    confirmGenerate,
    dismissUnderstand,
    handleApply,
    result,
    selectedCpvCodeId,
    setSelectedCpvCodeId,
    questions,
    toggleQuestion,
    toggleQuestionDocument,
    selectedQuestionCount,
    canApply,
  };

  return (
    <QuestionnaireAiContext.Provider value={value}>
      {children}
      <UnderstandConfirmModal />
    </QuestionnaireAiContext.Provider>
  );
}

function UnderstandConfirmModal() {
  const { t } = useTranslation();
  const {
    understandModalOpen,
    understanding,
    confirmGenerate,
    dismissUnderstand,
    loadingPhase,
  } = useQuestionnaireAi();

  if (!understandModalOpen || !understanding) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-violet-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-understand-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-start gap-2 min-w-0">
            <Sparkles className="text-violet-600 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 id="ai-understand-title" className="text-lg font-bold text-gray-900">
                {t('entityPortal.aiQuestionnaireUnderstandTitle')}
              </h3>
              <p className="text-xs text-muted mt-0.5">{t('entityPortal.aiQuestionnaireUnderstandSubtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissUnderstand}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"
            aria-label={t('common.cancel')}
          >
            <XCircle size={22} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              {t('entityPortal.aiQuestionnaireYourInput')}
            </p>
            <p className="text-sm text-gray-800 mt-1">{understanding.userDescription}</p>
          </div>
          {understanding.category && (
            <p className="text-xs text-violet-800">
              <span className="font-semibold">{t('entityPortal.aiQuestionnaireCategory')}:</span>{' '}
              {understanding.category}
            </p>
          )}
          <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-3">
            <p className="text-[11px] font-semibold text-violet-800 uppercase tracking-wide">
              {t('entityPortal.aiQuestionnaireAiUnderstanding')}
            </p>
            <p className="text-sm text-gray-800 mt-1 leading-relaxed">{understanding.understanding}</p>
          </div>
          <p className="text-xs text-muted">{t('entityPortal.aiQuestionnaireUnderstandConfirm')}</p>
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 px-5 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={dismissUnderstand}
            disabled={loadingPhase === 'generate'}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {t('entityPortal.aiQuestionnaireRewrite')}
          </button>
          <button
            type="button"
            onClick={confirmGenerate}
            disabled={loadingPhase === 'generate'}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm disabled:opacity-50"
          >
            {loadingPhase === 'generate' ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('entityPortal.aiQuestionnaireLoading')}
              </>
            ) : (
              t('entityPortal.aiQuestionnaireConfirmGenerate')
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function InputBar() {
  const { t } = useTranslation();
  const {
    loading,
    loadingPhase,
    hasResult,
    drawerOpen,
    openDrawer,
    closeDrawer,
    description,
    setDescription,
    validationError,
    descriptionCharCount,
    descriptionMaxChars,
    generate,
    result,
    selectedQuestionCount,
  } = useQuestionnaireAi();

  const canGenerate =
    description.trim().length >= QUESTIONNAIRE_DESC_MIN &&
    description.length <= QUESTIONNAIRE_DESC_MAX &&
    !loading;

  return (
    <div className="rounded-xl border border-violet-200/70 bg-gradient-to-br from-violet-50/50 to-white p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Sparkles size={18} className="text-violet-600 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{t('entityPortal.aiQuestionnaireTitle')}</p>
          <p className="text-xs text-muted mt-0.5">{t('entityPortal.aiQuestionnaireSubtitle')}</p>
        </div>
        {hasResult && (
          <button
            type="button"
            onClick={drawerOpen ? closeDrawer : openDrawer}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-300 bg-white text-violet-700 text-xs font-semibold hover:bg-violet-50 shrink-0"
          >
            {drawerOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            {drawerOpen ? t('entityPortal.aiQuestionnaireHide') : t('entityPortal.aiQuestionnaireShow')}
          </button>
        )}
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        maxLength={descriptionMaxChars}
        placeholder={t('entityPortal.aiQuestionnairePlaceholder')}
        className={`w-full px-3 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-violet-500 resize-y min-h-[4.5rem] ${
          validationError
            ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
            : 'border-gray-300 focus:border-violet-500'
        }`}
        aria-invalid={Boolean(validationError)}
        aria-describedby="ai-questionnaire-desc-hint ai-questionnaire-desc-error"
      />
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <p id="ai-questionnaire-desc-hint" className="text-muted">
          {t('entityPortal.aiQuestionnaireCharLimit', { max: descriptionMaxChars })}
        </p>
        <p
          className={`tabular-nums ${
            descriptionCharCount > descriptionMaxChars * 0.9 ? 'text-amber-700' : 'text-muted'
          }`}
        >
          {descriptionCharCount}/{descriptionMaxChars}
        </p>
      </div>
      {validationError && (
        <p id="ai-questionnaire-desc-error" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {validationError}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted">{t('entityPortal.aiQuestionnaireHint')}</p>
        <button
          type="button"
          disabled={!canGenerate}
          onClick={generate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {loadingPhase === 'understand'
                ? t('entityPortal.aiQuestionnaireUnderstanding')
                : t('entityPortal.aiQuestionnaireLoading')}
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {t('entityPortal.aiQuestionnaireGenerate')}
            </>
          )}
        </button>
      </div>
      {hasResult && result && (
        <p className="text-xs text-violet-800">
          {t('entityPortal.aiQuestionnaireReady', {
            questions: result.questionCount,
            selected: selectedQuestionCount,
          })}
        </p>
      )}
    </div>
  );
}

function questionTypeLabel(t: (k: string) => string, type: string) {
  const key = `questionTypes.${type}`;
  const translated = t(key);
  return translated !== key ? translated : type;
}

function Drawer() {
  const { t } = useTranslation();
  const {
    result,
    drawerOpen,
    hasResult,
    openDrawer,
    closeDrawer,
    handleApply,
    selectedCpvCodeId,
    setSelectedCpvCodeId,
    questions,
    toggleQuestion,
    toggleQuestionDocument,
    selectedQuestionCount,
    canApply,
  } = useQuestionnaireAi();

  if (!hasResult || !result) return null;

  const panel = (
    <>
      {!drawerOpen && (
        <button
          type="button"
          onClick={openDrawer}
          className="fixed right-0 top-[var(--portal-header-height)] bottom-0 z-40 hidden sm:flex w-9 flex-col items-center justify-center gap-1 rounded-l-xl bg-violet-600 text-white text-[10px] font-bold shadow-lg hover:bg-violet-700"
          aria-label={t('entityPortal.aiQuestionnaireShow')}
        >
          <ChevronLeft size={16} />
          <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">AI</span>
        </button>
      )}

      <aside
        className={`fixed right-0 top-[var(--portal-header-height)] z-40 flex flex-col h-[calc(100vh-var(--portal-header-height))] w-[30vw] min-w-[17.5rem] max-w-[28rem] bg-gradient-to-b from-violet-50/95 to-white border-l border-violet-200/80 shadow-2xl transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-violet-100 bg-white/90">
            <p className="text-sm font-semibold text-violet-900 leading-tight">
              {t('entityPortal.aiQuestionnaireReviewTitle')}
            </p>
            <button
              type="button"
              onClick={closeDrawer}
              className="p-1 rounded-lg text-gray-500 hover:bg-violet-100"
              aria-label={t('entityPortal.aiQuestionnaireHide')}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
            <div className="rounded-lg bg-white border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">{t('sections.basicInformation')}</p>
              <p className="text-[11px] text-muted mb-2">{t('entityPortal.aiQuestionnaireSupplierPreviewHint')}</p>
              <p className="text-xs font-medium text-gray-500 mb-0.5">{t('forms.questionnaireTitle')}</p>
              <p className="text-sm font-medium text-gray-900">{result.title}</p>
              <p className="text-xs font-medium text-gray-500 mt-2 mb-0.5">
                {t('entityPortal.aiQuestionnaireSupplierDescriptionLabel')}
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">{result.description}</p>
            </div>

            <div className="rounded-lg bg-white border border-gray-200 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={15} className="text-violet-600" />
                <p className="text-xs font-semibold text-gray-700">{t('entityPortal.aiQuestionnaireCpvTitle')}</p>
              </div>
              {result.cpvSuggestions.length === 0 ? (
                <p className="text-xs text-amber-800">{t('entityPortal.aiQuestionnaireNoCpv')}</p>
              ) : (
                <ul className="space-y-2">
                  {result.cpvSuggestions.map((cpv) => (
                    <li key={cpv.cpvCodeId}>
                      <label className="flex items-start gap-2 text-sm cursor-pointer">
                        <input
                          type="radio"
                          name="ai-cpv"
                          checked={selectedCpvCodeId === cpv.cpvCodeId}
                          onChange={() => setSelectedCpvCodeId(cpv.cpvCodeId)}
                          className="mt-1"
                        />
                        <span className="min-w-0">
                          <span className="font-medium text-gray-900">{cpv.code}</span>
                          <span className="block text-xs text-gray-700">{cpv.description}</span>
                          <span className="block text-[11px] text-muted mt-0.5">{cpv.reason}</span>
                          {typeof cpv.supplierCount === 'number' && cpv.supplierCount > 0 && (
                            <span className="block text-[10px] text-violet-700 mt-0.5">
                              {t('entityPortal.aiQuestionnaireCpvSuppliers', { count: cpv.supplierCount })}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-lg bg-white border border-gray-200 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">{t('entityPortal.aiQuestionnaireQuestionsTitle')}</p>
              <p className="text-[11px] text-muted mb-2">{t('entityPortal.aiQuestionnaireQuestionsHint')}</p>
              {questions.length === 0 ? (
                <p className="text-xs text-gray-600">{t('entityPortal.aiQuestionnaireNoQuestions')}</p>
              ) : (
                <ul className="space-y-3">
                  {questions.map((q, idx) => (
                    <li key={q.key} className="border border-gray-100 rounded-lg p-2.5 bg-gray-50/50">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={q.selected}
                          onChange={(e) => toggleQuestion(q.key, e.target.checked)}
                          className="mt-1"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="text-xs font-semibold text-gray-500">
                            {t('sections.questionNumber', { n: idx + 1 })} · {questionTypeLabel(t, q.questionType)}
                          </span>
                          <span className="block text-sm text-gray-900 mt-0.5">{q.questionText}</span>
                        </span>
                      </label>
                      {q.selected && (
                        <div className="mt-2 ml-6 space-y-1.5">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.requiresDocumentEnabled}
                              onChange={(e) => toggleQuestionDocument(q.key, e.target.checked)}
                              className="rounded"
                            />
                            <FileText size={12} className="text-violet-600" />
                            <span className="font-medium text-gray-700">{t('forms.requiresDocument')}</span>
                          </label>
                          {q.requiresDocumentEnabled && q.documentType && (
                            <p className="text-[11px] text-muted pl-6">{q.documentType}</p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-amber-800">{result.disclaimer}</p>
          </div>

          <div className="shrink-0 px-3 py-2.5 border-t border-violet-100 bg-white/95">
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="w-full px-3 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              {canApply
                ? t('entityPortal.aiQuestionnaireApplyCount', { count: selectedQuestionCount })
                : t('entityPortal.aiQuestionnaireApply')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );

  return createPortal(panel, document.body);
}

export const ProcuringEntityQuestionnaireAiAssist = {
  Root,
  InputBar,
  Drawer,
};
