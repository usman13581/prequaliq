import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

export type ProfileAiSuggestion = {
  value: string;
  sources: string[];
  documentType: string;
  confidence: number;
  conflict: boolean;
  currentValue: string | null;
  differsFromCurrent: boolean;
};

export type ProfileAiResponse = {
  suggestions: Record<string, ProfileAiSuggestion>;
  conflicts: Array<{
    field: string;
    values: Array<{ value: string; fileName: string; documentType: string }>;
  }>;
  documents: Array<{
    fileName: string;
    documentType: string;
    section: string;
    confidence: number;
    fields: Record<string, string>;
    error?: string | null;
    code?: string | null;
  }>;
  disclaimer: string;
  gpuV2?: boolean;
  allFailed?: boolean;
  gpuUpgradeRecommended?: boolean;
};

const FIELD_LABEL_KEYS: Record<string, string> = {
  companyName: 'forms.companyName',
  registrationNumber: 'forms.registrationNumber',
  taxId: 'forms.taxId',
  address: 'forms.address',
  city: 'forms.city',
  country: 'forms.country',
  phone: 'forms.phone',
  website: 'forms.website',
  yearEstablished: 'forms.yearEstablished',
  turnover: 'forms.turnover',
  employeeCount: 'forms.employeeCount',
  financialStability: 'commonQuestions.q2Label',
  qualityManagementSystem: 'commonQuestions.q5Label',
  environmentalManagementSystem: 'commonQuestions.q6Label',
  socialResponsibilityManagementSystem: 'commonQuestions.q7Label',
  ohsManagementSystem: 'commonQuestions.q8Label',
  insurerName: 'supplierPortal.insurerName',
  insurancePolicyNumber: 'supplierPortal.insurancePolicyNumber',
  insuranceCoverageAmount: 'supplierPortal.insuranceCoverageAmount',
  insuranceValidTo: 'supplierPortal.insuranceValidTo',
};

const SECTION_LABEL_KEYS: Record<string, string> = {
  company: 'supplierPortal.completenessSections.company',
  insurance: 'supplierPortal.completenessSections.insurance',
  q2: 'supplierPortal.completenessSections.q2',
  q5: 'supplierPortal.completenessSections.q5',
  q6: 'supplierPortal.completenessSections.q6',
  q7: 'supplierPortal.completenessSections.q7',
  q8: 'supplierPortal.completenessSections.q8',
  unknown: 'supplierPortal.aiProfileUnknownSection',
};

type AiAssistContextValue = {
  loading: boolean;
  hasResult: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  triggerUpload: () => void;
  handleApply: () => void;
  result: ProfileAiResponse | null;
  selectedFields: Record<string, string>;
  conflictChoices: Record<string, string>;
  toggleField: (field: string, value: string, checked: boolean) => void;
  setConflictChoice: (field: string, value: string) => void;
  fieldLabel: (field: string) => string;
  sectionLabel: (section: string) => string;
  suggestionCount: number;
  nonConflictCount: number;
  selectedCount: number;
  canApply: boolean;
  hasNoSuggestions: boolean;
};

const AiAssistContext = createContext<AiAssistContextValue | null>(null);

function useAiAssist() {
  const ctx = useContext(AiAssistContext);
  if (!ctx) throw new Error('SupplierAiProfileAssist components must be used within Root');
  return ctx;
}

type RootProps = {
  enabled?: boolean;
  suggestEndpoint?: string;
  fieldLabelKeys?: Record<string, string>;
  onApply: (fields: Record<string, string>) => void;
  onStartEdit?: () => void;
  children: ReactNode;
};

function Root({
  enabled = true,
  suggestEndpoint = '/supplier/profile/ai-suggest',
  fieldLabelKeys,
  onApply,
  onStartEdit,
  children,
}: RootProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProfileAiResponse | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, string>>({});
  const [conflictChoices, setConflictChoices] = useState<Record<string, string>>({});

  const mergedFieldLabels = { ...FIELD_LABEL_KEYS, ...fieldLabelKeys };

  const fieldLabel = useCallback(
    (field: string) => {
      const key = mergedFieldLabels[field];
      return key ? t(key) : field;
    },
    [t, mergedFieldLabels]
  );

  const sectionLabel = useCallback(
    (section: string) => {
      const key = SECTION_LABEL_KEYS[section] || SECTION_LABEL_KEYS.unknown;
      return t(key);
    },
    [t]
  );

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const invalid = files.find(
      (f) => f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')
    );
    if (invalid) {
      showToast(t('supplierPortal.aiSuggestPdfOnly'), 'error');
      return;
    }
    if (files.length > 10) {
      showToast(t('supplierPortal.aiProfileMaxFiles'), 'error');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      setDrawerOpen(false);
      const formData = new FormData();
      for (const f of files) formData.append('documents', f);
      const res = await api.post<ProfileAiResponse>(suggestEndpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = res.data;
      setResult(data);
      setDrawerOpen(true);

      const initialSelected: Record<string, string> = {};
      const initialConflicts: Record<string, string> = {};
      for (const [field, sug] of Object.entries(data.suggestions || {})) {
        if (sug.conflict) {
          initialConflicts[field] = sug.value;
        } else {
          initialSelected[field] = sug.value;
        }
      }
      setSelectedFields(initialSelected);
      setConflictChoices(initialConflicts);
      onStartEdit?.();

      if (data.allFailed) {
        const firstError = data.documents?.find((doc) => doc.error)?.error;
        showToast(firstError || t('supplierPortal.aiProfileAllFailed'), 'error');
      } else if (data.gpuUpgradeRecommended) {
        showToast(t('supplierPortal.aiProfileGpuUpgrade'), 'warning');
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || t('supplierPortal.aiProfileFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (field: string, value: string, checked: boolean) => {
    setSelectedFields((prev) => {
      const next = { ...prev };
      if (checked) next[field] = value;
      else delete next[field];
      return next;
    });
  };

  const handleApply = () => {
    const toApply: Record<string, string> = { ...selectedFields };
    for (const [field, value] of Object.entries(conflictChoices)) {
      if (value) toApply[field] = value;
    }
    if (!Object.keys(toApply).length) {
      const hasSuggestions = Object.keys(result?.suggestions || {}).length > 0;
      showToast(
        hasSuggestions
          ? t('supplierPortal.aiProfileNothingSelected')
          : t('supplierPortal.aiProfileNoSuggestions'),
        'error'
      );
      return;
    }
    onApply(toApply);
    setResult(null);
    setDrawerOpen(false);
    setSelectedFields({});
    setConflictChoices({});
    showToast(t('supplierPortal.aiProfileApplied'), 'success');
  };

  const suggestionCount = Object.keys(result?.suggestions || {}).length;
  const nonConflictCount = Object.entries(result?.suggestions || {}).filter(([, sug]) => !sug.conflict).length;
  const selectedCount =
    Object.keys(selectedFields).length +
    Object.entries(conflictChoices).filter(([field, value]) => value && !(field in selectedFields)).length;
  const canApply = selectedCount > 0;
  const hasNoSuggestions = Boolean(result && suggestionCount === 0 && !result.allFailed);

  const value: AiAssistContextValue = {
    loading,
    hasResult: Boolean(result),
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    triggerUpload: () => fileRef.current?.click(),
    handleApply,
    result,
    selectedFields,
    conflictChoices,
    toggleField,
    setConflictChoice: (field, value) => setConflictChoices((prev) => ({ ...prev, [field]: value })),
    fieldLabel,
    sectionLabel,
    suggestionCount,
    nonConflictCount,
    selectedCount,
    canApply,
    hasNoSuggestions,
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <AiAssistContext.Provider value={value}>
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      {children}
    </AiAssistContext.Provider>
  );
}

function UploadBar() {
  const { t } = useTranslation();
  const { loading, hasResult, drawerOpen, openDrawer, closeDrawer, triggerUpload, suggestionCount } = useAiAssist();

  return (
    <div className="rounded-lg border border-violet-200/70 bg-violet-50/40">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Sparkles size={15} className="text-violet-600 shrink-0" aria-hidden />
          <span className="text-sm font-semibold text-gray-900">{t('supplierPortal.aiProfileTitle')}</span>
          <span className="text-xs text-muted hidden lg:inline truncate">
            {t('supplierPortal.aiProfileSubtitleShort')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {hasResult && (
            <button
              type="button"
              onClick={drawerOpen ? closeDrawer : openDrawer}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-violet-300 bg-white text-violet-700 text-xs font-semibold hover:bg-violet-50 transition-colors"
            >
              {drawerOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              {drawerOpen
                ? t('supplierPortal.aiProfileHideSuggestions')
                : t('supplierPortal.aiProfileShowSuggestions', { count: suggestionCount })}
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={triggerUpload}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {t('supplierPortal.aiProfileLoading')}
              </>
            ) : (
              <>
                <FileText size={14} />
                {t('supplierPortal.aiProfileUpload')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
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
    fieldLabel,
    sectionLabel,
    selectedFields,
    conflictChoices,
    toggleField,
    setConflictChoice,
    nonConflictCount,
    selectedCount,
    suggestionCount,
    canApply,
    hasNoSuggestions,
  } = useAiAssist();

  if (!hasResult || !result) return null;

  const panel = (
    <>
      {/* Collapsed tab — right edge, below header */}
      {!drawerOpen && (
        <button
          type="button"
          onClick={openDrawer}
          className="fixed right-0 top-[var(--portal-header-height)] bottom-0 z-40 hidden sm:flex w-9 flex-col items-center justify-center gap-1 rounded-l-xl bg-violet-600 text-white text-[10px] font-bold shadow-lg hover:bg-violet-700 transition-colors"
          aria-label={t('supplierPortal.aiProfileShowSuggestions', { count: suggestionCount })}
        >
          <ChevronLeft size={16} />
          <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">AI</span>
        </button>
      )}

      <aside
        className={`fixed right-0 top-[var(--portal-header-height)] z-40 flex flex-col h-[calc(100vh-var(--portal-header-height))] w-[30vw] min-w-[17.5rem] max-w-[26rem] bg-gradient-to-b from-violet-50/95 to-white border-l border-violet-200/80 shadow-2xl transition-transform duration-300 ease-in-out ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!drawerOpen}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b border-violet-100 bg-white/90">
            <p className="text-sm font-semibold text-amber-900 leading-tight">
              {t('supplierPortal.aiProfileReviewTitle')}
            </p>
            <button
              type="button"
              onClick={closeDrawer}
              className="p-1 rounded-lg text-gray-500 hover:bg-violet-100 hover:text-violet-800 transition-colors"
              aria-label={t('supplierPortal.aiProfileHideSuggestions')}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-3">
            {hasNoSuggestions && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                {t('supplierPortal.aiProfileNoSuggestions')}
              </div>
            )}

            {result.gpuUpgradeRecommended && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900">
                {t('supplierPortal.aiProfileGpuUpgrade')}
              </div>
            )}

            {result.documents?.length > 0 && (
              <div className="rounded-lg bg-white border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">{t('supplierPortal.aiProfileDocuments')}</p>
                <ul className="space-y-1.5 text-sm">
                  {result.documents.map((doc) => (
                    <li key={doc.fileName} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium text-gray-900 text-xs">{doc.fileName}</span>
                      {doc.error ? (
                        <span className="text-red-600 text-xs">{doc.error}</span>
                      ) : (
                        <>
                          <span className="text-xs text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                            {sectionLabel(doc.section)}
                          </span>
                          <span className="text-xs text-muted">{Math.round((doc.confidence || 0) * 100)}%</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.conflicts?.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-amber-700" />
                  <p className="text-sm font-semibold text-amber-900">{t('supplierPortal.aiProfileConflicts')}</p>
                </div>
                <div className="space-y-3">
                  {result.conflicts.map((c) => (
                    <div key={c.field}>
                      <p className="text-xs font-semibold text-gray-800 mb-1">{fieldLabel(c.field)}</p>
                      <div className="space-y-1">
                        {c.values.map((v) => (
                          <label
                            key={`${c.field}-${v.fileName}-${v.value}`}
                            className="flex items-start gap-2 text-sm cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`conflict-${c.field}`}
                              checked={conflictChoices[c.field] === v.value}
                              onChange={() => setConflictChoice(c.field, v.value)}
                              className="mt-1"
                            />
                            <span>
                              <span className="text-gray-900">{v.value}</span>
                              <span className="text-xs text-muted ml-1">({v.fileName})</span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {nonConflictCount > 0 && (
              <div className="rounded-lg bg-white border border-gray-200 p-3">
                <p className="text-xs font-semibold text-gray-700 mb-1">{t('supplierPortal.aiProfileSuggestions')}</p>
                <p className="text-[11px] text-muted mb-2">{t('supplierPortal.aiProfileSuggestionsHint')}</p>
                <ul className="space-y-2">
                  {Object.entries(result.suggestions).map(([field, sug]) => {
                    if (sug.conflict) return null;
                    const checked = field in selectedFields;
                    return (
                      <li key={field} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleField(field, sug.value, e.target.checked)}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-gray-800">{fieldLabel(field)}: </span>
                          <span className="text-gray-900">{sug.value}</span>
                          {sug.differsFromCurrent && sug.currentValue && (
                            <span className="block text-xs text-muted mt-0.5">
                              {t('supplierPortal.aiProfileCurrent')}: {sug.currentValue}
                            </span>
                          )}
                          <span className="block text-xs text-muted">{sug.sources.join(', ')}</span>
                        </div>
                        <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-1" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <p className="text-xs text-amber-800">{result.disclaimer || t('supplierPortal.aiSuggestDisclaimer')}</p>
          </div>

          <div className="shrink-0 flex flex-wrap gap-2 px-3 py-2.5 border-t border-violet-100 bg-white/95">
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="flex-1 min-w-[8rem] px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canApply
                ? t('supplierPortal.aiProfileApplySelectedCount', { count: selectedCount })
                : t('supplierPortal.aiProfileApplySelected')}
            </button>
          </div>
        </div>
      </aside>
    </>
  );

  return createPortal(panel, document.body);
}

/** @deprecated Use SupplierAiProfileAssist.Root + UploadBar + Drawer */
export function SupplierAiProfileAssist({
  onApply,
  onStartEdit,
}: {
  onApply: (fields: Record<string, string>) => void;
  onStartEdit?: () => void;
}) {
  return (
    <Root onApply={onApply} onStartEdit={onStartEdit}>
      <UploadBar />
    </Root>
  );
}

SupplierAiProfileAssist.Root = Root;
SupplierAiProfileAssist.UploadBar = UploadBar;
SupplierAiProfileAssist.Drawer = Drawer;
