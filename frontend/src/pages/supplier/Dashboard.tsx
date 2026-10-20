import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlement } from '../../contexts/EntitlementContext';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { DateOnlyPicker } from '../../components/DateOnlyPicker';
import { SearchField } from '../../components/ui/SearchField';
import { PortalLayout } from '../../components/ui/PortalLayout';
import { AccountStatusBanner } from '../../components/ui/AccountStatusBanner';
import { SupplierTendersPanel } from '../../components/supplier/SupplierTendersPanel';
import { AiPreferencesPanel } from '../../components/ai/AiPreferencesPanel';
import { SupplierContractsPanel } from '../../components/supplier/SupplierContractsPanel';
import { SupplierOverviewTab } from '../../components/supplier/SupplierOverviewTab';
import { SupplierNotificationsBell } from '../../components/supplier/SupplierNotificationsBell';
import { SupplierExportProfileModal } from '../../components/supplier/SupplierExportProfileModal';
import {
  SupplierProfileCompletenessRail,
  SupplierProfileCompletenessMobile,
  SupplierQualificationStatusBar,
  SupplierSubmitModal
} from '../../components/supplier/SupplierProfileCompleteness';
import { SupplierReferencesSection } from '../../components/supplier/SupplierReferencesSection';
import { SupplierProfileSubmissionHistory } from '../../components/supplier/SupplierProfileSubmissionHistory';
import { SupplierDocumentList } from '../../components/supplier/SupplierDocumentList';
import { SupplierAiProfileAssist } from '../../components/supplier/SupplierAiProfileAssist';
import { SupplierQuestionnaireAnswerAiAssist } from '../../components/supplier/SupplierQuestionnaireAnswerAiAssist';
import { SupplierProfileTabsNav, type ProfileTabId } from '../../components/supplier/SupplierProfileTabsNav';
import { useListPagination } from '../../hooks/useListPagination';
import { usePortalTab } from '../../hooks/usePortalTab';
import { useCpvCatalogSearch } from '../../hooks/useCpvCatalogSearch';
import { ListPagination } from '../../components/ui/ListPagination';
import { QuestionnaireSlimRow, StatusBadge, RowActionButton } from '../../components/questionnaires/QuestionnaireSlimRow';
import { 
  FileText, History, User, Upload, Edit2, Eye, 
  Save, XCircle, Calendar, Building2, CheckCircle, Camera,
  ChevronDown, LayoutDashboard, Download, Briefcase, ScrollText, Sparkles
} from 'lucide-react';
import type { AnswerSuggestion } from '../../components/supplier/SupplierQuestionnaireAnswerAiAssist';
import { uploadsUrl } from '../../utils/uploadsUrl';

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  validFrom?: string | null;
  validTo?: string | null;
  issuer?: string | null;
  documentNumber?: string | null;
  isActive?: boolean;
}

interface CPVCode {
  id: string;
  code: string;
  description: string;
}

interface NUTSCode {
  id: string;
  code: string;
  name: string;
  nameSwedish: string;
  level: number;
}

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options?: string[];
  isRequired: boolean;
  requiresDocument: boolean;
  documentType?: string;
  attachedDocument?: { id: string; fileName: string; filePath: string } | null;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  deadline: string;
  cpvCode: CPVCode;
  procuringEntity: any;
  questions: Question[];
  responses?: any[];
  createdAt: string;
}

interface QuestionnaireResponse {
  id: string;
  status: 'draft' | 'submitted';
  submittedAt?: string;
  procedureId?: string | null;
  questionnaire: Questionnaire;
  answers?: any[];
}

// Turnover range options: value = upper bound (stored in DB)
const TURNOVER_OPTIONS = [
  { value: 1000000, labelKey: 'commonQuestions.turnover0_1M' },
  { value: 10000000, labelKey: 'commonQuestions.turnover1M_10M' },
  { value: 25000000, labelKey: 'commonQuestions.turnover10M_25M' },
  { value: 50000000, labelKey: 'commonQuestions.turnover25M_50M' },
  { value: 75000000, labelKey: 'commonQuestions.turnover50M_75M' },
  { value: 100000000, labelKey: 'commonQuestions.turnover75M_100M' },
  { value: 999999999999, labelKey: 'commonQuestions.turnover100MPlus' }
];

const getTurnoverLabel = (val: string | number | undefined, t: (k: string) => string): string => {
  const n = val === '' || val == null ? NaN : Number(val);
  if (isNaN(n)) return t('common.na');
  const opt = TURNOVER_OPTIONS.find((o) => o.value === n) ?? TURNOVER_OPTIONS.find((o) => n <= o.value);
  return opt ? t(opt.labelKey) : t('common.na');
};

const getTurnoverValueForSelect = (val: string | number | undefined): string => {
  const n = val === '' || val == null ? NaN : Number(val);
  if (isNaN(n)) return '';
  const exact = TURNOVER_OPTIONS.find((o) => o.value === n);
  if (exact) return String(exact.value);
  const range = TURNOVER_OPTIONS.find((o) => n <= o.value);
  return range ? String(range.value) : '';
};

const SUPPLIER_PORTAL_TABS = [
  'overview',
  'profile',
  'tenders',
  'contracts',
  'history',
  'ai-preferences',
] as const;

const SupplierDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { enabled: canAiCompleteness } = useEntitlement('ai.completeness_conflict');
  const [activeTab, setActiveTab] = usePortalTab('overview', SUPPLIER_PORTAL_TABS);
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [completeness, setCompleteness] = useState<any>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [submittingProfile, setSubmittingProfile] = useState(false);
  const [documentExpiryDates, setDocumentExpiryDates] = useState<Record<string, string>>({});
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    registrationNumber: '',
    taxId: '',
    address: '',
    city: '',
    country: '',
    website: '',
    turnover: '',
    employeeCount: '',
    yearEstablished: '',
    financialStability: '',
    qualityManagementSystem: '',
    environmentalManagementSystem: '',
    socialResponsibilityManagementSystem: '',
    ohsManagementSystem: '',
    groundsForExclusion: '',
    laborLawRegulations: '',
    sanctionsRussiaBelarus: '',
    technicalCapacityProfessionalExperience: '',
    insurerName: '',
    insurancePolicyNumber: '',
    insuranceCoverageAmount: '',
    insuranceValidTo: ''
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingQuestionDoc, setUploadingQuestionDoc] = useState<string | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<ProfileTabId>('basic');
  const [selectedCPVCodes, setSelectedCPVCodes] = useState<string[]>([]);
  const cpvCatalog = useCpvCatalogSearch();
  const [cpvSearchTerm, setCpvSearchTerm] = useState('');
  const [showCPVSelector, setShowCPVSelector] = useState(false);
  
  // NUTS codes state
  const [selectedNUTSCodes, setSelectedNUTSCodes] = useState<string[]>([]);
  const [nutsCodes, setNutsCodes] = useState<NUTSCode[]>([]);
  const [nutsSearchTerm, setNutsSearchTerm] = useState('');
  const [showNUTSSelector, setShowNUTSSelector] = useState(false);
  
  // Questionnaires state (tender-linked modal; no standalone Forms tab)
  const [questionnaireHistory, setQuestionnaireHistory] = useState<QuestionnaireResponse[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  /** When set, answers are stored per procedure (tender bid), not shared across procedures. */
  const [bidProcedureId, setBidProcedureId] = useState<string | null>(null);
  const [questionnaireResponse, setQuestionnaireResponse] = useState<Record<string, any>>({});
  const [responseDocuments, setResponseDocuments] = useState<Record<string, File>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [prefillHint, setPrefillHint] = useState(false);
  const [bidContext, setBidContext] = useState<{
    editable?: boolean;
    reason?: string | null;
    label?: string;
    procedureStatus?: string;
    bidDeadline?: string | null;
  } | null>(null);

  // Fetch profile
  const fetchProfile = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const response = await api.get('/supplier/profile');
      const supplier = response.data.supplier;
      setProfile(supplier);
      setProfileData({
        firstName: supplier.user?.firstName || '',
        lastName: supplier.user?.lastName || '',
        email: supplier.user?.email || '',
        phone: supplier.user?.phone || supplier.phone || '',
        companyName: supplier.companyName || '',
        registrationNumber: supplier.registrationNumber || '',
        taxId: supplier.taxId || '',
        address: supplier.address || '',
        city: supplier.city || '',
        country: supplier.country || '',
        website: supplier.website || '',
        turnover: supplier.turnover?.toString() || '',
        employeeCount: supplier.employeeCount?.toString() || '',
        yearEstablished: supplier.yearEstablished?.toString() || '',
        financialStability: supplier.financialStability || '',
        qualityManagementSystem: supplier.qualityManagementSystem || '',
        environmentalManagementSystem: supplier.environmentalManagementSystem || '',
        socialResponsibilityManagementSystem: supplier.socialResponsibilityManagementSystem || '',
        ohsManagementSystem: supplier.ohsManagementSystem || '',
        groundsForExclusion: supplier.groundsForExclusion || '',
        laborLawRegulations: supplier.laborLawRegulations || '',
        sanctionsRussiaBelarus: supplier.sanctionsRussiaBelarus || '',
        technicalCapacityProfessionalExperience: supplier.technicalCapacityProfessionalExperience || '',
        insurerName: supplier.insurerName || '',
        insurancePolicyNumber: supplier.insurancePolicyNumber || '',
        insuranceCoverageAmount: supplier.insuranceCoverageAmount?.toString() || '',
        insuranceValidTo: supplier.insuranceValidTo ? String(supplier.insuranceValidTo).split('T')[0] : ''
      });
      setDocuments((supplier.documents || []).filter((d: Document) => d.isActive !== false));
      setSelectedCPVCodes(supplier.cpvCodes?.map((cpv: CPVCode) => cpv.id) || []);
      setSelectedNUTSCodes(supplier.nutsCodes?.map((nuts: NUTSCode) => nuts.id) || []);
    } catch (error: any) {
      if (!opts?.silent) {
        showToast(error.response?.data?.message || t('msg.failedFetchProfile'), 'error');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      setDashboardLoading(true);
      const response = await api.get('/supplier/dashboard');
      setDashboardData(response.data);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('common.error'), 'error');
      setDashboardData(null);
    } finally {
      setDashboardLoading(false);
    }
  };

  const fetchCompleteness = async () => {
    try {
      const response = await api.get('/supplier/profile/completeness');
      setCompleteness(response.data);
    } catch {
      setCompleteness(null);
    }
  };

  const handleSubmitProfile = async () => {
    try {
      setSubmittingProfile(true);
      const res = await api.post('/supplier/profile/submit');
      showToast(res.data?.message || t('supplierPortal.profileSubmitted'), 'success');
      setShowSubmitModal(false);
      await fetchProfile();
      await fetchCompleteness();
      await fetchDashboard();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('common.error'), 'error');
    } finally {
      setSubmittingProfile(false);
    }
  };

  const handleExportProfile = () => {
    setShowExportModal(true);
  };

  const handleUpdateDocumentMetadata = async (id: string, metadata: { validFrom?: string; validTo?: string; issuer?: string; documentNumber?: string }) => {
    try {
      await api.put(`/documents/supplier/${id}/metadata`, metadata);
      showToast(t('supplierPortal.metadataSaved'), 'success');
      await fetchProfile();
      await fetchCompleteness();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('common.error'), 'error');
    }
  };

  const handleNavigateTab = (tab: string) => {
    setActiveTab(tab);
  };

  const openLinkedQuestionnaire = async (questionnaireId: string, procedureId?: string) => {
    if (!questionnaireId) return;
    try {
      const params = procedureId ? { procedureId } : undefined;
      const res = await api.get(`/supplier/questionnaires/${questionnaireId}`, { params });
      const questionnaire = res.data.questionnaire;

      if (!questionnaire) {
        showToast(t('msg.questionnaireNotFound', { defaultValue: 'Questionnaire not found' }), 'error');
        return;
      }

      setBidProcedureId(procedureId || null);
      setPrefillHint(false);
      setSelectedQuestionnaire(questionnaire);
      await loadQuestionnaireResponse(questionnaireId, procedureId || null);
    } catch (error: any) {
      showToast(
        error.response?.data?.message ||
          t('msg.failedLoadQuestionnaire', { defaultValue: 'Failed to open questionnaire' }),
        'error'
      );
    }
  };

  const closeQuestionnaireModal = () => {
    setSelectedQuestionnaire(null);
    setBidProcedureId(null);
    setPrefillHint(false);
    setBidContext(null);
    setQuestionnaireResponse({});
    setResponseDocuments({});
  };

  // Fetch NUTS codes
  const fetchNUTSCodes = async (searchTerm?: string) => {
    try {
      const params: Record<string, string> = {};
      if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
      const response = await api.get('/nuts', { params });
      const list = response.data.nutsCodes || [];
      setNutsCodes(Array.isArray(list) ? list : []);
    } catch (error: any) {
      console.error('Failed to fetch NUTS codes:', error);
      showToast(error.response?.data?.message || t('nutsCodes.failedToLoad'), 'error');
      setNutsCodes([]);
    }
  };

  // Fetch questionnaire history
  const fetchQuestionnaireHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/supplier/questionnaires/history');
      setQuestionnaireHistory(response.data.responses || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedFetchHistory'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const mapAnswersFromApi = (answerList: any[]): Record<string, any> => {
    const answers: Record<string, any> = {};
    if (!Array.isArray(answerList)) return answers;
    answerList.forEach((answer: any) => {
      let answerValue = answer.answerValue;
      if (answerValue === null || answerValue === undefined) {
        answerValue = answer.answerText || '';
      } else if (typeof answerValue === 'object') {
        if (Array.isArray(answerValue)) {
          answerValue = answerValue.join(',');
        } else if (answerValue.value !== undefined) {
          answerValue = answerValue.value;
        } else {
          answerValue = JSON.stringify(answerValue);
        }
      } else if (typeof answerValue !== 'string') {
        answerValue = String(answerValue);
      }
      if (!answerValue && answer.answerText) {
        answerValue = answer.answerText;
      }
      const questionIdKey = String(answer.questionId);
      answers[questionIdKey] = {
        answerText: answer.answerText || answerValue || '',
        answerValue: answerValue || answer.answerText || '',
        documentId: answer.documentId || null,
        document: answer.document || null
      };
    });
    return answers;
  };

  // Load existing response for questionnaire (optionally scoped to a procedure bid)
  const loadQuestionnaireResponse = async (
    questionnaireId: string,
    procedureId: string | null = bidProcedureId
  ): Promise<void> => {
    try {
      const params = procedureId ? { procedureId } : undefined;
      const response = await api.get(`/questionnaires/${questionnaireId}/responses`, { params });

      setBidContext(response.data.bidContext || null);

      if (response.data.response) {
        const answers = mapAnswersFromApi(response.data.response.answers || []);
        setPrefillHint(false);
        setQuestionnaireResponse(answers);
        await new Promise((resolve) => setTimeout(resolve, 50));

        setSelectedQuestionnaire((prev) => {
          if (prev && prev.id === questionnaireId) {
            const questionnaireFromResponse = response.data.response.questionnaire;
            return {
              ...prev,
              questions: questionnaireFromResponse?.questions || prev.questions,
              ...(questionnaireFromResponse && {
                title: questionnaireFromResponse.title || prev.title,
                description: questionnaireFromResponse.description || prev.description,
                deadline: questionnaireFromResponse.deadline || prev.deadline,
                cpvCode: questionnaireFromResponse.cpvCode || prev.cpvCode
              }),
              responses: [
                {
                  id: response.data.response.id,
                  status: response.data.response.status,
                  submittedAt: response.data.response.submittedAt
                }
              ]
            };
          }
          return prev;
        });
      } else if (response.data.prefill?.answers?.length) {
        // New procedure bid: prefill from a previous submission, still editable
        const answers = mapAnswersFromApi(response.data.prefill.answers);
        setQuestionnaireResponse(answers);
        setPrefillHint(!!response.data.bidContext?.editable);
        setSelectedQuestionnaire((prev) => {
          if (prev && prev.id === questionnaireId) {
            return { ...prev, responses: [] };
          }
          return prev;
        });
      } else {
        setPrefillHint(false);
        setQuestionnaireResponse({});
        setSelectedQuestionnaire((prev) => {
          if (prev && prev.id === questionnaireId) {
            return { ...prev, responses: [] };
          }
          return prev;
        });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        setPrefillHint(false);
        setBidContext(null);
        setQuestionnaireResponse({});
        setSelectedQuestionnaire((prev) => {
          if (prev && prev.id === questionnaireId) {
            return { ...prev, responses: [] };
          }
          return prev;
        });
      } else {
        console.error('Error loading response:', error);
      }
    }
  };

  // Always load profile status on mount — needed for tender action gates (Q&A, ESPD, bid)
  useEffect(() => {
    fetchProfile({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchDashboard();
    } else if (activeTab === 'profile') {
      fetchProfile();
      fetchCompleteness();
    } else if (activeTab === 'tenders') {
      // Ensure approval status is known before enabling tender actions
      if (!profile) fetchProfile({ silent: true });
    } else if (activeTab === 'history') {
      fetchQuestionnaireHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleAiProfileApply = (fields: Record<string, string>) => {
    setProfileData((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(fields)) {
        if (key in next) {
          (next as Record<string, string>)[key] = value;
        }
      }
      return next;
    });
    if (!editingProfile) setEditingProfile(true);
    const insuranceKeys = ['insurerName', 'insurancePolicyNumber', 'insuranceCoverageAmount', 'insuranceValidTo'];
    if (Object.keys(fields).some((key) => insuranceKeys.includes(key))) {
      setActiveProfileTab('insurance');
    }
  };

  // Update profile
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      const updateData: any = {
        firstName: profileData.firstName.trim(),
        lastName: profileData.lastName.trim(),
        phone: profileData.phone.trim(),
        companyName: profileData.companyName.trim()
      };

      if (profileData.registrationNumber.trim()) updateData.registrationNumber = profileData.registrationNumber.trim();
      if (profileData.taxId.trim()) updateData.taxId = profileData.taxId.trim();
      if (profileData.address.trim()) updateData.address = profileData.address.trim();
      if (profileData.city.trim()) updateData.city = profileData.city.trim();
      if (profileData.country.trim()) updateData.country = profileData.country.trim();
      if (profileData.website.trim()) updateData.website = profileData.website.trim();
      if (profileData.turnover && profileData.turnover !== '') {
        const v = parseFloat(profileData.turnover);
        if (!isNaN(v)) updateData.turnover = v;
      }
      if (profileData.employeeCount) updateData.employeeCount = parseInt(profileData.employeeCount);
      if (profileData.yearEstablished) updateData.yearEstablished = parseInt(profileData.yearEstablished);
      if (profileData.financialStability != null) updateData.financialStability = String(profileData.financialStability).trim();
      if (profileData.qualityManagementSystem != null) updateData.qualityManagementSystem = String(profileData.qualityManagementSystem).trim();
      if (profileData.environmentalManagementSystem != null) updateData.environmentalManagementSystem = String(profileData.environmentalManagementSystem).trim();
      if (profileData.socialResponsibilityManagementSystem != null) updateData.socialResponsibilityManagementSystem = String(profileData.socialResponsibilityManagementSystem).trim();
      if (profileData.ohsManagementSystem != null) updateData.ohsManagementSystem = String(profileData.ohsManagementSystem).trim();
      if (profileData.groundsForExclusion != null) updateData.groundsForExclusion = String(profileData.groundsForExclusion).trim();
      if (profileData.laborLawRegulations != null) updateData.laborLawRegulations = String(profileData.laborLawRegulations).trim();
      if (profileData.sanctionsRussiaBelarus != null) updateData.sanctionsRussiaBelarus = String(profileData.sanctionsRussiaBelarus).trim();
      if (profileData.technicalCapacityProfessionalExperience != null) updateData.technicalCapacityProfessionalExperience = String(profileData.technicalCapacityProfessionalExperience).trim();
      if (profileData.insurerName != null) updateData.insurerName = String(profileData.insurerName).trim();
      if (profileData.insurancePolicyNumber != null) updateData.insurancePolicyNumber = String(profileData.insurancePolicyNumber).trim();
      if (profileData.insuranceCoverageAmount?.trim()) {
        const v = parseFloat(profileData.insuranceCoverageAmount);
        if (!isNaN(v)) updateData.insuranceCoverageAmount = v;
      }
      if (profileData.insuranceValidTo) updateData.insuranceValidTo = profileData.insuranceValidTo;

      const res = await api.put('/supplier/profile', updateData);
      showToast(res.data?.message || t('msg.profileSaved'), 'success');
      setEditingProfile(false);
      fetchProfile();
      fetchCompleteness();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUpdateProfile'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t('msg.invalidProfileImage'), 'error');
      return;
    }
    setUploadingPicture(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      await api.put('/auth/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
      fetchProfile();
      showToast(t('msg.profilePictureUpdated'), 'success');
      if (profilePictureRef.current) profilePictureRef.current.value = '';
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUploadProfilePicture'), 'error');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      await api.delete('/auth/profile-picture');
      await refreshUser();
      fetchProfile();
      showToast(t('msg.profilePictureRemoved'), 'success');
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedRemoveProfilePicture'), 'error');
    }
  };

  // Update CPV codes
  const handleUpdateCPVCodes = async () => {
    try {
      setLoading(true);
      const res = await api.put('/supplier/cpv-codes', { cpvCodeIds: selectedCPVCodes });
      showToast(res.data?.message || t('msg.cpvSaved'), 'success');
      setShowCPVSelector(false);
      fetchProfile();
      fetchCompleteness();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUpdateCPV'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update NUTS codes
  const handleUpdateNUTSCodes = async () => {
    try {
      setLoading(true);
      const res = await api.put('/supplier/nuts-codes', { nutsCodeIds: selectedNUTSCodes });
      showToast(res.data?.message || t('msg.nutsSaved'), 'success');
      setShowNUTSSelector(false);
      fetchProfile();
      fetchCompleteness();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('nutsCodes.failedToUpdate'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete document
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm(t('sections.confirmDeleteDocument'))) return;
    
    try {
      await api.delete(`/documents/${documentId}`);
      showToast(t('msg.documentDeleted'), 'success');
      fetchProfile();
      fetchCompleteness();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedDeleteDocument'), 'error');
    }
  };

  // Document types for Q5–Q8
  const DOCUMENT_TYPES = {
  q2: 'q2-financial',
    q5: 'q5-quality',
    q6: 'q6-environment',
    q7: 'q7-social',
  q8: 'q8-ohs'
  } as const;

  const getDocumentsForQuestion = (documentType: string) =>
    (documents || []).filter((d) => d.documentType === documentType && d.isActive !== false);

  const {
    page: historyPage,
    setPage: setHistoryPage,
    paginatedItems: paginatedHistory,
    total: historyTotal,
    pageSize: historyPageSize,
    setPageSize: setHistoryPageSize
  } = useListPagination(questionnaireHistory);

  const showSubmitButton = profile && (
    profile.status === 'pending' ||
    profile.status === 'rejected' ||
    profile.status === 'requalification_required'
  );

  const renderProfileDocuments = (docType: string) => (
    <div className="mt-3">
      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-all duration-200 font-medium text-sm">
        <input
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={(e) => handleProfileQuestionDocumentUpload(docType, e)}
          disabled={!!uploadingQuestionDoc}
        />
        <Upload size={16} />
        {uploadingQuestionDoc === docType ? t('sections.uploading') : t('sections.upload')}
      </label>
      <div className="mt-2 max-w-xs">
        <label className="block text-xs text-muted mb-1">{t('supplierPortal.documentExpiry')}</label>
        <DateOnlyPicker
          value={documentExpiryDates[docType] || ''}
          onChange={(dateStr) => setDocumentExpiryDates({ ...documentExpiryDates, [docType]: dateStr })}
          placeholder={t('supplierPortal.documentExpiry')}
          className="text-sm px-3 py-2"
        />
      </div>
      <SupplierDocumentList
        documents={getDocumentsForQuestion(docType)}
        getDocumentUrl={getDocumentUrl}
        onDelete={handleDeleteDocument}
        onUpdateMetadata={handleUpdateDocumentMetadata}
      />
    </div>
  );

  const getDocumentUrl = (doc: { filePath: string }) => uploadsUrl(doc.filePath) || '#';

  const handleProfileQuestionDocumentUpload = async (documentType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    if (documentExpiryDates[documentType]) {
      formData.append('validTo', documentExpiryDates[documentType]);
    }

    try {
      setUploadingQuestionDoc(documentType);
      const res = await api.post('/documents/supplier', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(res.data?.message || t('msg.documentSaved'), 'success');
      setDocumentExpiryDates({ ...documentExpiryDates, [documentType]: '' });
      fetchProfile();
      fetchCompleteness();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUploadDocument'), 'error');
    } finally {
      setUploadingQuestionDoc(null);
      e.target.value = '';
    }
  };

  // Save draft - simple save, no auto-save
  const handleSaveDraft = async () => {
    if (!selectedQuestionnaire) return;

    try {
      setSavingDraft(true);
      
      // Upload documents first and get documentIds (only upload new files selected by user)
      const documentIds: Record<string, string> = {};
      for (const [questionId, file] of Object.entries(responseDocuments)) {
        if (file instanceof File) {
          // Upload new file selected by user
          const formData = new FormData();
          formData.append('file', file);
          const question = selectedQuestionnaire.questions.find((q: Question) => q.id === questionId);
          formData.append('documentType', question?.documentType || 'questionnaire_answer');
          
          const docResponse = await api.post('/documents/supplier', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          documentIds[questionId] = docResponse.data.document.id;
        }
      }

      // Map answers with documentIds (use new uploads if available, otherwise use existing documentIds)
      // Include all answers that have been entered (even if empty, user can save empty draft)
      const answers = Object.entries(questionnaireResponse)
        .filter(([_questionId, data]) => data) // Only include entries that exist
        .map(([questionId, data]) => ({
          questionId,
          answerText: data.answerText || '',
          answerValue: data.answerValue || data.answerText || '',
          documentId: documentIds[questionId] || data.documentId || null
        }));

      console.log('Saving answers:', answers);
      console.log('Questionnaire response state:', questionnaireResponse);
      console.log('Selected questionnaire:', selectedQuestionnaire?.id);

      const saveResponse = await api.post(`/questionnaires/${selectedQuestionnaire.id}/responses`, {
        answers,
        status: 'draft',
        ...(bidProcedureId ? { procedureId: bidProcedureId } : {})
      });

      console.log('Save response from backend:', saveResponse.data);

      showToast(t('msg.savedAsDraft'), 'success');

      // Close modal after saving
      closeQuestionnaireModal();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
    } finally {
      setSavingDraft(false);
    }
  };

  // Submit questionnaire
  const handleSubmitQuestionnaire = async () => {
    if (!selectedQuestionnaire) return;

    // Validate required questions
    const requiredQuestions = selectedQuestionnaire.questions.filter(q => q.isRequired);
    const missingAnswers = requiredQuestions.filter(q => !questionnaireResponse[q.id]?.answerText);

    if (missingAnswers.length > 0) {
      showToast(t('msg.answerAllRequired'), 'error');
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload documents first and get documentIds (only upload new files selected by user)
      const documentIds: Record<string, string> = {};
      for (const [questionId, file] of Object.entries(responseDocuments)) {
        if (file instanceof File) {
          // Upload new file selected by user
          const formData = new FormData();
          formData.append('file', file);
          const question = selectedQuestionnaire.questions.find((q: Question) => q.id === questionId);
          formData.append('documentType', question?.documentType || 'questionnaire_answer');
          
          const docResponse = await api.post('/documents/supplier', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          documentIds[questionId] = docResponse.data.document.id;
        }
      }

      // Map answers with documentIds (use new uploads if available, otherwise use existing documentIds)
      const answers = Object.entries(questionnaireResponse).map(([questionId, data]) => ({
        questionId,
        answerText: data.answerText || '',
        answerValue: data.answerValue || '',
        documentId: documentIds[questionId] || data.documentId || null
      }));

      await api.post(`/questionnaires/${selectedQuestionnaire.id}/responses`, {
        answers,
        status: 'submitted',
        ...(bidProcedureId ? { procedureId: bidProcedureId } : {})
      });

      showToast(t('msg.questionnaireSubmitted'), 'success');

      // Close modal after submitting
      closeQuestionnaireModal();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSubmitQuestionnaire'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle CPV code selection
  const toggleCPVCode = (cpvId: string) => {
    if (selectedCPVCodes.includes(cpvId)) {
      setSelectedCPVCodes(selectedCPVCodes.filter(id => id !== cpvId));
    } else {
      setSelectedCPVCodes([...selectedCPVCodes, cpvId]);
    }
  };

  // Toggle NUTS code selection
  const toggleNUTSCode = (nutsId: string) => {
    if (selectedNUTSCodes.includes(nutsId)) {
      setSelectedNUTSCodes(selectedNUTSCodes.filter(id => id !== nutsId));
    } else {
      setSelectedNUTSCodes([...selectedNUTSCodes, nutsId]);
    }
  };

  useEffect(() => {
    if (!showCPVSelector) return;
    cpvCatalog.searchDebounced(cpvSearchTerm, selectedCPVCodes);
  }, [showCPVSelector, cpvSearchTerm, selectedCPVCodes, cpvCatalog.searchDebounced]);

  const sidebarItems = [
    { id: 'overview', label: t('supplierPortal.navOverview'), icon: LayoutDashboard },
    { id: 'profile', label: t('supplierPortal.navProfile'), icon: User },
    { id: 'tenders', label: t('procedures.navTenders'), icon: Briefcase },
    { id: 'contracts', label: t('contracts.nav'), icon: ScrollText },
    { id: 'history', label: t('supplierPortal.navHistory'), icon: History },
    { id: 'ai-preferences', label: t('common.aiPreferences'), icon: Sparkles },
  ];

  return (
    <>
      <PortalLayout
        logoTo="/supplier"
        logoSubtitle={t('nav.supplierPortal')}
        roleLabel={t('nav.supplier')}
        sidebarItems={sidebarItems}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        headerExtra={<SupplierNotificationsBell onNavigate={handleNavigateTab} />}
      >
            <AccountStatusBanner
              status={profile?.status}
              rejectionReason={profile?.rejectionReason}
              roleLabel={t('nav.supplier')}
            />

            {activeTab === 'profile' && canAiCompleteness ? (
              <div className="mb-4">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700"
                  onClick={async () => {
                    try {
                      const res = await api.get('/ai-extras/completeness', {
                        params: { language: (i18n.language || 'en').slice(0, 2) },
                      });
                      const data = res.data || {};
                      const issues = data.issues || [];
                      const conflicts = data.conflicts || [];
                      const percent = data.percent ?? null;
                      await fetchCompleteness();
                      if (data.ready) {
                        showToast(
                          data.summary ||
                            t('supplierPortal.completenessOk', {
                              defaultValue: 'Profile looks complete ({{percent}}%)',
                              percent: percent ?? 100,
                            }),
                          'success'
                        );
                        return;
                      }
                      const gapLines = [
                        ...issues.slice(0, 4).map((i: { message?: string }) => i.message),
                        ...conflicts.slice(0, 2).map((c: { message?: string }) => c.message),
                      ].filter(Boolean);
                      const header = t('supplierPortal.completenessGaps', {
                        defaultValue: 'Profile {{percent}}% complete — {{count}} gap(s)',
                        percent: percent ?? '—',
                        count: issues.length + conflicts.length,
                      });
                      showToast(
                        data.summary ||
                          (gapLines.length ? `${header}: ${gapLines.join('; ')}` : header),
                        'warning'
                      );
                    } catch (error: any) {
                      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
                    }
                  }}
                >
                  {t('supplierPortal.aiCompletenessCheck', { defaultValue: 'AI completeness check' })}
                </button>
              </div>
            ) : null}

            {/* Overview */}
            {activeTab === 'overview' && (
              <SupplierOverviewTab
                data={dashboardData}
                loading={dashboardLoading}
                onNavigate={handleNavigateTab}
              />
            )}

            {activeTab === 'tenders' && (
              <SupplierTendersPanel
                accountApproved={profile?.status === 'approved'}
                onOpenQuestionnaire={openLinkedQuestionnaire}
              />
            )}

            {activeTab === 'contracts' && <SupplierContractsPanel />}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-8">
                <SupplierTendersPanel mode="history" accountApproved={profile?.status === 'approved'} />

                <div>
                  <h2 className="text-base font-bold text-gray-900">{t('sections.questionHistory')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('sections.viewSubmittedQuestionnaires')}</p>
                </div>

                {loading && questionnaireHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                      <p className="mt-6 text-gray-600 font-medium">{t('sections.loadingHistory')}</p>
                    </div>
                  </div>
                ) : questionnaireHistory.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-primary-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <History className="text-gray-400 mx-auto mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-700">{t('sections.noHistoryFound')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('sections.submittedHistoryWillAppear')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedHistory.map((response) => (
                      <QuestionnaireSlimRow
                        key={response.id}
                        title={response.questionnaire?.title || ''}
                        badges={<StatusBadge tone="green">{t('common.submitted')}</StatusBadge>}
                        meta={
                          <>
                            <span className="inline-flex items-center gap-1.5 min-w-0">
                              <Building2 size={14} className="shrink-0" />
                              <span className="truncate">
                                {response.questionnaire?.cpvCode?.code} - {response.questionnaire?.cpvCode?.description}
                              </span>
                            </span>
                            {response.submittedAt ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar size={14} className="shrink-0" />
                                {t('columns.submittedAt')}: {new Date(response.submittedAt).toLocaleDateString()}
                              </span>
                            ) : null}
                            {response.questionnaire?.deadline ? (
                              <span className="inline-flex items-center gap-1.5">
                                <Calendar size={14} className="shrink-0" />
                                {t('columns.deadline')}: {new Date(response.questionnaire.deadline).toLocaleDateString()}
                              </span>
                            ) : null}
                          </>
                        }
                        trailing={
                          <>
                            <RowActionButton
                              variant="secondary"
                              onClick={async () => {
                                const preloadedAnswers: Record<string, any> = {};
                                if (response.answers && response.answers.length > 0) {
                                  response.answers.forEach((answer: any) => {
                                    let answerValue = answer.answerValue;
                                    if (answerValue === null || answerValue === undefined) {
                                      answerValue = answer.answerText || '';
                                    } else if (typeof answerValue === 'object') {
                                      if (Array.isArray(answerValue)) {
                                        answerValue = answerValue.join(',');
                                      } else if (answerValue.value !== undefined) {
                                        answerValue = answerValue.value;
                                      } else {
                                        answerValue = JSON.stringify(answerValue);
                                      }
                                    } else if (typeof answerValue !== 'string') {
                                      answerValue = String(answerValue);
                                    }
                                    preloadedAnswers[answer.questionId] = {
                                      answerText: answer.answerText || answerValue || '',
                                      answerValue: answerValue || answer.answerText || '',
                                      documentId: answer.documentId || null,
                                      document: answer.document || null
                                    };
                                  });
                                }
                                setQuestionnaireResponse(preloadedAnswers);
                                setBidProcedureId(response.procedureId || null);
                                setPrefillHint(false);
                                setSelectedQuestionnaire({
                                  ...response.questionnaire,
                                  responses: [{
                                    id: response.id,
                                    status: response.status,
                                    submittedAt: response.submittedAt
                                  }]
                                });
                                await loadQuestionnaireResponse(
                                  response.questionnaire.id,
                                  response.procedureId || null
                                );
                              }}
                            >
                              <Eye size={14} />
                              {t('buttons.viewResponse')}
                            </RowActionButton>
                          </>
                        }
                      />
                    ))}
                    <ListPagination
                      page={historyPage}
                      pageSize={historyPageSize}
                      total={historyTotal}
                      onPageChange={setHistoryPage}
                      onPageSizeChange={setHistoryPageSize}
                      itemLabel={t('nav.history').toLowerCase()}
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai-preferences' && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6">
                <AiPreferencesPanel />
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-3 -mt-1 lg:-mt-2">
                {/* Mobile action buttons */}
                <div className="lg:hidden flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExportProfile}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-white hover:bg-surface font-semibold text-sm transition-colors"
                  >
                    <Download size={18} />
                    {t('supplierPortal.exportProfile')}
                  </button>
                  {showSubmitButton && !editingProfile && (
                    <button
                      type="button"
                      onClick={() => setShowSubmitModal(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold"
                    >
                      <CheckCircle size={20} />
                      {t('supplierPortal.submitForQualification')}
                    </button>
                  )}
                </div>

                <SupplierProfileCompletenessMobile completeness={completeness} />

                {profile?.status === 'rejected' && profile?.rejectionReason && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="font-semibold text-red-800">{t('supplierPortal.rejectionTitle')}</p>
                    <p className="text-sm text-red-700 mt-1">{profile.rejectionReason}</p>
                  </div>
                )}

                {profile?.status === 'requalification_required' && (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                    <p className="font-semibold text-orange-800">{t('supplierPortal.requalificationTitle')}</p>
                    <p className="text-sm text-orange-700 mt-1">
                      {t('supplierPortal.requalificationHint', {
                        date: profile.qualificationExpiresAt
                          ? new Date(profile.qualificationExpiresAt).toLocaleDateString()
                          : '—'
                      })}
                    </p>
                  </div>
                )}

                {loading && !profile ? (
                  <div className="text-center py-16">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                      <p className="mt-6 text-gray-600 font-medium">{t('dashboard.loadingProfile')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col lg:flex-row gap-6 items-start mt-0">
                    <div className="flex-1 min-w-0 space-y-6">
                      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl border border-gray-200/50 flex flex-col max-h-[calc(100vh-var(--portal-header-height)-5.5rem)] lg:max-h-[calc(100vh-var(--portal-header-height)-4rem)] min-h-[280px]">
                        {/* Sticky: photo + edit/save/cancel + qualification status */}
                        <div className="shrink-0 px-3 sm:px-4 pt-3 pb-2 border-b border-gray-200 bg-white/95 backdrop-blur-sm rounded-t-2xl z-10">
                          <h3 className="text-base font-bold text-gray-900 mb-3">{t('common.profile')} Information</h3>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div className="relative group shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-200">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                                  {(profile?.user?.profilePicture ?? user?.profilePicture) ? (
                                    <img
                                      src={uploadsUrl(profile?.user?.profilePicture ?? user?.profilePicture) || undefined}
                                      alt="Profile"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span>{profileData.firstName?.[0] || user?.firstName?.[0]}{profileData.lastName?.[0] || user?.lastName?.[0]}</span>
                                  )}
                                </div>
                                <input
                                  ref={profilePictureRef}
                                  type="file"
                                  accept="image/jpeg,image/jpg,image/png"
                                  onChange={handleProfilePictureUpload}
                                  className="hidden"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  <button
                                    type="button"
                                    onClick={() => profilePictureRef.current?.click()}
                                    disabled={uploadingPicture}
                                    className="p-2 bg-white/90 rounded-lg hover:bg-white"
                                  >
                                    <Camera size={18} className="text-gray-800" />
                                  </button>
                                </div>
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => profilePictureRef.current?.click()}
                                  disabled={uploadingPicture}
                                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                                >
                                  <Upload size={14} />
                                  {uploadingPicture ? t('common.loading') : ((profile?.user?.profilePicture ?? user?.profilePicture) ? t('supplierPortal.changePhoto') : t('supplierPortal.uploadPhoto'))}
                                </button>
                                {(profile?.user?.profilePicture ?? user?.profilePicture) && (
                                  <button
                                    type="button"
                                    onClick={handleRemoveProfilePicture}
                                    className="block mt-1 text-sm text-gray-500 hover:text-red-600 text-left"
                                  >
                                    {t('supplierPortal.removePhoto')}
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                              {editingProfile ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={handleUpdateProfile}
                                    disabled={loading}
                                    className="btn-save flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
                                  >
                                    <Save size={16} />
                                    {t('actions.saveChanges')}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingProfile(false);
                                      fetchProfile();
                                    }}
                                    className="btn-cancel px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold"
                                  >
                                    {t('common.cancel')}
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEditingProfile(true)}
                                  className="btn-save flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-semibold"
                                >
                                  <Edit2 size={16} />
                                  {t('actions.editProfile')}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <SupplierQualificationStatusBar profile={profile} />
                          </div>
                        </div>

                        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <SupplierAiProfileAssist.Root
                          enabled={editingProfile}
                          onApply={handleAiProfileApply}
                          onStartEdit={() => { if (!editingProfile) setEditingProfile(true); }}
                        >
                          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                            {editingProfile && (
                              <div className="shrink-0 px-3 sm:px-4 pt-2 pb-2 border-b border-gray-100 bg-white/80 space-y-2">
                                <SupplierAiProfileAssist.UploadBar />
                              </div>
                            )}
                            <div className="flex flex-col flex-1 min-w-0 min-h-0">
                              <div className="shrink-0 px-3 sm:px-4 py-2 border-b border-gray-100 bg-white/80">
                                <SupplierProfileTabsNav
                                  activeTab={activeProfileTab}
                                  onTabChange={setActiveProfileTab}
                                  completeness={completeness}
                                />
                              </div>
                              <div className="flex-1 overflow-y-auto min-h-0 overscroll-behavior-contain px-3 sm:px-4 py-4">
                          {activeProfileTab === 'basic' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.firstName')}</label>
                            {editingProfile ? (
                              <input
                                type="text"
                                value={profileData.firstName}
                                onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.firstName || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.lastName')}</label>
                            {editingProfile ? (
                              <input
                                type="text"
                                value={profileData.lastName}
                                onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.lastName || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.email')}</label>
                            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                              {profileData.email || t('common.na')}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.phone')}</label>
                            {editingProfile ? (
                              <input
                                type="tel"
                                value={profileData.phone}
                                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.phone || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.companyName')}</label>
                            {editingProfile ? (
                              <input
                                type="text"
                                value={profileData.companyName}
                                onChange={(e) => setProfileData({ ...profileData, companyName: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.companyName || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.registrationNumber')}</label>
                            {editingProfile ? (
                              <input
                                type="text"
                                value={profileData.registrationNumber}
                                onChange={(e) => setProfileData({ ...profileData, registrationNumber: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.registrationNumber || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.taxId')}</label>
                            {editingProfile ? (
                              <input
                                type="text"
                                value={profileData.taxId}
                                onChange={(e) => setProfileData({ ...profileData, taxId: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.taxId || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.address')}</label>
                            {editingProfile ? (
                              <input
                                type="text"
                                value={profileData.address}
                                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.address || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.city')}</label>
                            {editingProfile ? (
                              <input
                                type="text"
                                value={profileData.city}
                                onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.city || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.country')}</label>
                            {editingProfile ? (
                              <input
                                type="text"
                                value={profileData.country}
                                onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.country || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.website')}</label>
                            {editingProfile ? (
                              <input
                                type="url"
                                value={profileData.website}
                                onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.website || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.employeeCount')}</label>
                            {editingProfile ? (
                              <input
                                type="number"
                                value={profileData.employeeCount}
                                onChange={(e) => setProfileData({ ...profileData, employeeCount: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.employeeCount || t('common.na')}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.yearEstablished')}</label>
                            {editingProfile ? (
                              <input
                                type="number"
                                value={profileData.yearEstablished}
                                onChange={(e) => setProfileData({ ...profileData, yearEstablished: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.yearEstablished || t('common.na')}
                              </div>
                            )}
                          </div>
                          </div>
                          )}

                          {activeProfileTab === 'financial' && (
                          <div className="space-y-6">
                            {/* Q1 – Turnover */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q1Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q1Help')}</p>
                              {editingProfile ? (
                                <div className="relative">
                                  <select
                                    value={getTurnoverValueForSelect(profileData.turnover)}
                                    onChange={(e) => setProfileData({ ...profileData, turnover: e.target.value })}
                                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white appearance-none cursor-pointer text-gray-900 hover:border-primary-400"
                                    style={{ minHeight: '48px' }}
                                  >
                                    <option value="">{t('commonQuestions.turnoverSelectPlaceholder')}</option>
                                    {TURNOVER_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {t(opt.labelKey)}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden />
                                </div>
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                  {getTurnoverLabel(profileData.turnover, t)}
                                </div>
                              )}
                            </div>

                            {/* Q2 – Financial Stability */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q2Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q2Help')}</p>
                              {editingProfile ? (
                                <input
                                  type="text"
                                  value={profileData.financialStability}
                                  onChange={(e) => setProfileData({ ...profileData, financialStability: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                  {profileData.financialStability || t('common.na')}
                                </div>
                              )}
                              {renderProfileDocuments(DOCUMENT_TYPES.q2)}
                            </div>
                          </div>
                          )}

                          {activeProfileTab === 'scope' && (
                          <div className="space-y-6">
                            {/* Q3 – NUTS Codes */}
                            <div className="bg-gradient-to-br from-white to-green-50/30 rounded-2xl p-6 border border-gray-200/50">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-gray-900">{t('commonQuestions.q3Label')}</h4>
                                </div>
                                {!editingProfile && (
                                  <button
                                    onClick={() => {
                                      if (profile?.nutsCodes) setSelectedNUTSCodes(profile.nutsCodes.map((nuts: NUTSCode) => nuts.id));
                                      setShowNUTSSelector(true);
                                      fetchNUTSCodes();
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all duration-200 font-medium text-sm"
                                  >
                                    <Edit2 size={16} />
                                    {t('nutsCodes.editButton')}
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mb-4">{t('commonQuestions.q3Help')}</p>
                              {profile?.nutsCodes && profile.nutsCodes.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {profile.nutsCodes.map((nuts: NUTSCode) => (
                                    <span key={nuts.id} className="px-3 py-1 bg-green-100 text-green-700 text-sm font-semibold rounded-lg">
                                      {nuts.code} - {nuts.nameSwedish} ({nuts.name})
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">{t('nutsCodes.noCodesSelected')}</p>
                              )}
                            </div>

                            {/* Q4 – Goods and Services (CPV Codes) - card */}
                            <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-gray-200/50">
                              <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-base font-bold text-gray-900">{t('commonQuestions.q4Label')}</h4>
                                </div>
                                {!editingProfile && (
                                  <button
                                    onClick={() => {
                                      setCpvSearchTerm('');
                                      setShowCPVSelector(true);
                                      cpvCatalog.fetchCodes('', selectedCPVCodes);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-all duration-200 font-medium text-sm"
                                  >
                                    <Edit2 size={16} />
                                    {t('cpvCodes.editButton')}
                                  </button>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mb-4">{t('commonQuestions.q4Help')}</p>
                              {profile?.cpvCodes && profile.cpvCodes.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {profile.cpvCodes.map((cpv: CPVCode) => (
                                    <span key={cpv.id} className="px-3 py-1 bg-primary-100 text-primary-700 text-sm font-semibold rounded-lg">
                                      {cpv.code} - {cpv.description}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-gray-500 text-sm">{t('cpvCodes.noCodesSelected')}</p>
                              )}
                            </div>
                          </div>
                          )}

                          {activeProfileTab === 'certifications' && (
                          <div className="space-y-6">
                            {/* Q5 – Quality */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q5Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q5Help')}</p>
                              {editingProfile ? (
                                <input
                                  type="text"
                                  value={profileData.qualityManagementSystem}
                                  onChange={(e) => setProfileData({ ...profileData, qualityManagementSystem: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                  {profileData.qualityManagementSystem || t('common.na')}
                                </div>
                              )}
                              {renderProfileDocuments(DOCUMENT_TYPES.q5)}
                            </div>

                            {/* Q6 – Management System – Environment */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q6Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q6Help')}</p>
                              {editingProfile ? (
                                <input
                                  type="text"
                                  value={profileData.environmentalManagementSystem}
                                  onChange={(e) => setProfileData({ ...profileData, environmentalManagementSystem: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                  {profileData.environmentalManagementSystem || t('common.na')}
                                </div>
                              )}
                              {renderProfileDocuments(DOCUMENT_TYPES.q6)}
                            </div>

                            {/* Q7 – Management System – Social Responsibility */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q7Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q7Help')}</p>
                              {editingProfile ? (
                                <input
                                  type="text"
                                  value={profileData.socialResponsibilityManagementSystem}
                                  onChange={(e) => setProfileData({ ...profileData, socialResponsibilityManagementSystem: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                  {profileData.socialResponsibilityManagementSystem || t('common.na')}
                                </div>
                              )}
                              {renderProfileDocuments(DOCUMENT_TYPES.q7)}
                            </div>

                            {/* Q8 – Management System – Occupational Health and Safety */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q8Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q8Help')}</p>
                              {editingProfile ? (
                                <input
                                  type="text"
                                  value={profileData.ohsManagementSystem}
                                  onChange={(e) => setProfileData({ ...profileData, ohsManagementSystem: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                  {profileData.ohsManagementSystem || t('common.na')}
                                </div>
                              )}
                              {renderProfileDocuments(DOCUMENT_TYPES.q8)}
                            </div>
                          </div>
                          )}

                          {activeProfileTab === 'compliance' && (
                          <div className="space-y-6">
                            {/* Q9 – Grounds for Exclusion */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q9Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q9Help')}</p>
                              {editingProfile ? (
                                <input
                                  type="text"
                                  value={profileData.groundsForExclusion}
                                  onChange={(e) => setProfileData({ ...profileData, groundsForExclusion: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                  {profileData.groundsForExclusion || t('common.na')}
                                </div>
                              )}
                            </div>

                            {/* Q10 – Labor Law Regulations */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q10Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q10Help')}</p>
                              {editingProfile ? (
                                <input
                                  type="text"
                                  value={profileData.laborLawRegulations}
                                  onChange={(e) => setProfileData({ ...profileData, laborLawRegulations: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                  {profileData.laborLawRegulations || t('common.na')}
                                </div>
                              )}
                            </div>

                            {/* Q11 – Sanctions Regarding Russia and Belarus */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q11Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q11Help')}</p>
                              {editingProfile ? (
                                <input
                                  type="text"
                                  value={profileData.sanctionsRussiaBelarus}
                                  onChange={(e) => setProfileData({ ...profileData, sanctionsRussiaBelarus: e.target.value })}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                  {profileData.sanctionsRussiaBelarus || t('common.na')}
                                </div>
                              )}
                            </div>
                          </div>
                          )}

                          {activeProfileTab === 'references' && (
                          <div className="space-y-6">
                            {/* Q12 – Technical capacity */}
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-semibold text-gray-700">{t('commonQuestions.q12Label')}</label>
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{t('commonQuestions.q12Help')}</p>
                              {editingProfile ? (
                                <textarea
                                  value={profileData.technicalCapacityProfessionalExperience}
                                  onChange={(e) => setProfileData({ ...profileData, technicalCapacityProfessionalExperience: e.target.value })}
                                  rows={4}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 resize-y"
                                />
                              ) : (
                                <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 whitespace-pre-wrap">
                                  {profileData.technicalCapacityProfessionalExperience || t('common.na')}
                                </div>
                              )}
                            </div>

                            <SupplierReferencesSection editing={editingProfile} />

                            <SupplierProfileSubmissionHistory />
                          </div>
                          )}

                          {activeProfileTab === 'insurance' && (
                            <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-gray-200/50">
                              <div className="mb-4">
                                <h4 className="text-base font-bold text-gray-900 mb-1">{t('supplierPortal.insuranceTitle')}</h4>
                                <p className="text-xs text-muted">{t('supplierPortal.insuranceSubtitle')}</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('supplierPortal.insurerName')}</label>
                                  {editingProfile ? (
                                    <input
                                      type="text"
                                      value={profileData.insurerName}
                                      onChange={(e) => setProfileData({ ...profileData, insurerName: e.target.value })}
                                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                      {profileData.insurerName || t('common.na')}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('supplierPortal.insurancePolicyNumber')}</label>
                                  {editingProfile ? (
                                    <input
                                      type="text"
                                      value={profileData.insurancePolicyNumber}
                                      onChange={(e) => setProfileData({ ...profileData, insurancePolicyNumber: e.target.value })}
                                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                      {profileData.insurancePolicyNumber || t('common.na')}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('supplierPortal.insuranceCoverageAmount')}</label>
                                  {editingProfile ? (
                                    <input
                                      type="number"
                                      value={profileData.insuranceCoverageAmount}
                                      onChange={(e) => setProfileData({ ...profileData, insuranceCoverageAmount: e.target.value })}
                                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                      {profileData.insuranceCoverageAmount || t('common.na')}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('supplierPortal.insuranceValidTo')}</label>
                                  {editingProfile ? (
                                    <DateOnlyPicker
                                      value={profileData.insuranceValidTo}
                                      onChange={(dateStr) => setProfileData({ ...profileData, insuranceValidTo: dateStr })}
                                      placeholder={t('supplierPortal.insuranceValidTo')}
                                    />
                                  ) : (
                                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                      {profileData.insuranceValidTo ? new Date(profileData.insuranceValidTo).toLocaleDateString() : t('common.na')}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                                </div>
                              </div>
                          </div>
                          {editingProfile && <SupplierAiProfileAssist.Drawer />}
                        </SupplierAiProfileAssist.Root>
                        </div>
                      </div>
                    </div>

                    {/* Right rail: actions + completeness checklist */}
                    <aside className="hidden lg:flex flex-col gap-3 w-52 xl:w-56 shrink-0 sticky top-[calc(var(--portal-header-height)+1rem)] self-start">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleExportProfile}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-white hover:bg-surface font-semibold text-sm transition-colors"
                        >
                          <Download size={16} />
                          {t('supplierPortal.exportProfile')}
                        </button>
                        {showSubmitButton && !editingProfile && (
                          <button
                            type="button"
                            onClick={() => setShowSubmitModal(true)}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90"
                          >
                            <CheckCircle size={16} />
                            {t('supplierPortal.submitForQualification')}
                          </button>
                        )}
                      </div>
                      <SupplierProfileCompletenessRail completeness={completeness} />
                    </aside>
                  </div>
                )}
              </div>
            )}

      </PortalLayout>

      <SupplierSubmitModal
        open={showSubmitModal}
        completeness={completeness}
        loading={submittingProfile}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleSubmitProfile}
      />

      <SupplierExportProfileModal
        open={showExportModal}
        companyName={profile?.companyName}
        onClose={() => setShowExportModal(false)}
      />

      {/* CPV Code Selector Modal */}
      {showCPVSelector && (
        <CPVSelectorModal
          cpvCodes={cpvCatalog.cpvCodes}
          selectedCPVCodes={selectedCPVCodes}
          toggleCPVCode={toggleCPVCode}
          searchTerm={cpvSearchTerm}
          setSearchTerm={setCpvSearchTerm}
          onClose={() => {
            setShowCPVSelector(false);
            fetchProfile();
          }}
          onSave={handleUpdateCPVCodes}
          loading={loading}
          cpvLoading={cpvCatalog.loading}
        />
      )}

      {/* NUTS Code Selector Modal */}
      {showNUTSSelector && (
        <NUTSSelectorModal
          nutsCodes={nutsCodes.filter(nuts =>
            nuts.code.toLowerCase().includes(nutsSearchTerm.toLowerCase()) ||
            nuts.name.toLowerCase().includes(nutsSearchTerm.toLowerCase()) ||
            nuts.nameSwedish.toLowerCase().includes(nutsSearchTerm.toLowerCase())
          )}
          selectedNUTSCodes={selectedNUTSCodes}
          toggleNUTSCode={toggleNUTSCode}
          searchTerm={nutsSearchTerm}
          setSearchTerm={setNutsSearchTerm}
          onClose={() => {
            setShowNUTSSelector(false);
            fetchProfile();
          }}
          onSave={handleUpdateNUTSCodes}
          loading={loading}
        />
      )}

      {/* Questionnaire Response Modal */}
      {selectedQuestionnaire && (
        <QuestionnaireResponseModal
          questionnaire={selectedQuestionnaire}
          response={questionnaireResponse}
          setResponse={setQuestionnaireResponse}
          responseDocuments={responseDocuments}
          setResponseDocuments={setResponseDocuments}
          onClose={closeQuestionnaireModal}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmitQuestionnaire}
          savingDraft={savingDraft}
          submitting={submitting}
          loadResponse={loadQuestionnaireResponse}
          procedureId={bidProcedureId}
          prefillHint={prefillHint}
          bidContext={bidContext}
        />
      )}
    </>
  );
};

// CPV Selector Modal
const CPVSelectorModal = ({
  cpvCodes,
  selectedCPVCodes,
  toggleCPVCode,
  searchTerm,
  setSearchTerm,
  onClose,
  onSave,
  loading,
  cpvLoading = false,
}: any) => {
  const { t } = useTranslation();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-gradient-to-r from-white to-primary-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{t('cpvCodes.modalTitle')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('cpvCodes.modalDescription')}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XCircle size={24} />
            </button>
          </div>
          <div className="mt-4">
            <SearchField
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('cpvCodes.searchPlaceholder')}
            />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cpvLoading ? (
              <div className="text-center py-8 text-muted">
                <p className="font-medium">{t('common.loading')}</p>
              </div>
            ) : cpvCodes.length === 0 ? (
              <div className="text-center py-8 text-amber-700 bg-amber-50 rounded-lg px-4">
                <p className="font-medium">{t('cpvCodes.noCodesLoaded')}</p>
                <p className="text-sm mt-1">{t('cpvCodes.noCodesLoadedHint')}</p>
              </div>
            ) : (
              cpvCodes.map((cpv: CPVCode) => (
                <label
                  key={cpv.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-all duration-200"
                >
                  <input
                    type="checkbox"
                    checked={selectedCPVCodes.includes(cpv.id)}
                    onChange={() => toggleCPVCode(cpv.id)}
                    className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{cpv.code}</p>
                    <p className="text-sm text-gray-600">{cpv.description}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/50 mt-6">
            <button
              onClick={onClose}
              className="btn-cancel px-6 py-2.5 rounded-xl font-semibold transition-all duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onSave}
              disabled={loading}
              className="btn-save px-6 py-2.5 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {t('cpvCodes.saveButton')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// NUTS Selector Modal
const NUTSSelectorModal = ({
  nutsCodes,
  selectedNUTSCodes,
  toggleNUTSCode,
  searchTerm,
  setSearchTerm,
  onClose,
  onSave,
  loading
}: any) => {
  const { t } = useTranslation();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  
  // Group NUTS codes by level
  const groupedByLevel = {
    level1: nutsCodes.filter((nuts: NUTSCode) => nuts.level === 1),
    level2: nutsCodes.filter((nuts: NUTSCode) => nuts.level === 2),
    level3: nutsCodes.filter((nuts: NUTSCode) => nuts.level === 3)
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-gradient-to-r from-white to-primary-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{t('nutsCodes.modalTitle')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('nutsCodes.modalDescription')}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XCircle size={24} />
            </button>
          </div>
          <div className="mt-4">
            <SearchField
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('nutsCodes.searchPlaceholder')}
            />
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {nutsCodes.length === 0 ? (
              <div className="text-center py-8 text-amber-700 bg-amber-50 rounded-lg px-4">
                <p className="font-medium">{t('nutsCodes.noCodesLoaded')}</p>
                <p className="text-sm mt-1">{t('nutsCodes.noCodesLoadedHint')}</p>
              </div>
            ) : (
              <>
                {/* NUTS Level 1 */}
                {groupedByLevel.level1.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('nutsCodes.level1')}</h4>
                    <div className="space-y-2">
                      {groupedByLevel.level1.map((nuts: NUTSCode) => (
                        <label
                          key={nuts.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-all duration-200"
                        >
                          <input
                            type="checkbox"
                            checked={selectedNUTSCodes.includes(nuts.id)}
                            onChange={() => toggleNUTSCode(nuts.id)}
                            className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{nuts.code} - {nuts.nameSwedish}</p>
                            <p className="text-sm text-gray-600">{nuts.name}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* NUTS Level 2 */}
                {groupedByLevel.level2.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('nutsCodes.level2')}</h4>
                    <div className="space-y-2">
                      {groupedByLevel.level2.map((nuts: NUTSCode) => (
                        <label
                          key={nuts.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-all duration-200"
                        >
                          <input
                            type="checkbox"
                            checked={selectedNUTSCodes.includes(nuts.id)}
                            onChange={() => toggleNUTSCode(nuts.id)}
                            className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{nuts.code} - {nuts.nameSwedish}</p>
                            <p className="text-sm text-gray-600">{nuts.name}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* NUTS Level 3 */}
                {groupedByLevel.level3.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('nutsCodes.level3')}</h4>
                    <div className="space-y-2">
                      {groupedByLevel.level3.map((nuts: NUTSCode) => (
                        <label
                          key={nuts.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition-all duration-200"
                        >
                          <input
                            type="checkbox"
                            checked={selectedNUTSCodes.includes(nuts.id)}
                            onChange={() => toggleNUTSCode(nuts.id)}
                            className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{nuts.code} - {nuts.nameSwedish}</p>
                            <p className="text-sm text-gray-600">{nuts.name}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/50 mt-6">
            <button
              onClick={onClose}
              className="btn-cancel px-6 py-2.5 rounded-xl font-semibold transition-all duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onSave}
              disabled={loading}
              className="btn-save px-6 py-2.5 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {t('nutsCodes.saveButton')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Questionnaire Response Modal
const QuestionnaireResponseModal = ({
  questionnaire,
  response,
  setResponse,
  responseDocuments,
  setResponseDocuments,
  onClose,
  onSaveDraft,
  onSubmit,
  savingDraft,
  submitting,
  loadResponse,
  procedureId = null,
  prefillHint = false,
  bidContext = null
}: any) => {
  const { t } = useTranslation();
  // Load answers when modal opens
  const [loadingResponse, setLoadingResponse] = useState(true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (questionnaire?.id && loadResponse) {
      setLoadingResponse(true);
      loadResponse(questionnaire.id, procedureId || null).finally(() => {
        setTimeout(() => {
          setLoadingResponse(false);
        }, 200);
      });
    } else {
      setLoadingResponse(false);
    }
  }, [questionnaire?.id, procedureId]);

  // Check if response is submitted - if so, make it read-only
  // IMPORTANT: Submitted responses should always be viewable (read-only) regardless of expiration.
  // Suppliers can view their submitted answers forever, even if questionnaire expired.
  const responseStatus = questionnaire.responses && questionnaire.responses.length > 0 
    ? questionnaire.responses[0].status 
    : null;
  const isSubmitted = responseStatus === 'submitted';
  
  // IMPORTANT: For submitted responses, expiration is based on submission date vs deadline at submission time.
  // If entity changes deadline retroactively after submission, we still allow viewing.
  // Only show as expired if it's NOT submitted AND current deadline has passed.
  const isExpired = !isSubmitted && new Date(questionnaire.deadline) < new Date();

  // Prefer server bidContext (procedure status / bid deadline / submitted). Fallback to local checks.
  const isReadOnly =
    bidContext && typeof bidContext.editable === 'boolean'
      ? !bidContext.editable
      : isSubmitted || isExpired;

  // Helper function to get answer for a question - handles both string and UUID formats
  const getAnswer = (questionId: string) => {
    const questionIdStr = String(questionId);
    return response[questionIdStr] || response[questionId] || null;
  };

  // Debug: Log current response state
  useEffect(() => {
    console.log('QuestionnaireResponseModal - Current response state:', response);
    console.log('Questionnaire ID:', questionnaire?.id);
    console.log('Questionnaire has questions:', !!questionnaire?.questions, 'Count:', questionnaire?.questions?.length || 0);
    console.log('Response keys:', Object.keys(response));
    console.log('Response entries:', Object.entries(response));
    
    // Log answer-question matching
    if (questionnaire?.questions && Object.keys(response).length > 0) {
      console.log('Answer-Question matching check:');
      questionnaire.questions.forEach((q: any) => {
        const answer = response[q.id];
        console.log(`  Question ${q.id}: ${q.questionText.substring(0, 50)}... - Answer: ${answer ? (answer.answerText || answer.answerValue || 'empty') : 'NOT FOUND'}`);
      });
    }
  }, [response, questionnaire?.id, questionnaire?.questions]);

  const renderQuestionInput = (question: Question) => {
    if (isReadOnly) {
      // Read-only view (submitted or expired)
      const answer = getAnswer(question.id);
      console.log(`[Render ReadOnly] Question ${question.id}:`, {
        questionId: question.id,
        questionIdStr: String(question.id),
        hasAnswer: !!answer,
        answerText: answer?.answerText,
        answerValue: answer?.answerValue,
        responseKeys: Object.keys(response),
        allResponseEntries: Object.entries(response).map(([k, v]: [string, any]) => ({ key: k, hasText: !!v?.answerText, hasValue: !!v?.answerValue }))
      });
      const displayValue = answer?.answerText ?? answer?.answerValue ?? '';
      const formatted =
        question.questionType === 'date' && displayValue
          ? (typeof displayValue === 'string' && displayValue.length >= 10
              ? (() => {
                  const s = displayValue.slice(0, 10);
                  const [y, m, d] = s.split('-').map(Number);
                  return new Date(y, m - 1, d).toLocaleDateString();
                })()
              : displayValue)
          : displayValue;
      return (
        <div>
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
            {formatted || t('common.noAnswerProvided')}
          </div>
          {/* Document link is shown only in the "Upload Document" section below (when question.requiresDocument) to avoid showing it twice */}
          {answer?.document && !question.requiresDocument && (
            <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
              <FileText size={16} />
              <a 
                href={uploadsUrl(answer.document.filePath.replace(/^.*[\\\/]/, '')) || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:underline"
              >
                {answer.document.fileName}
              </a>
            </div>
          )}
        </div>
      );
    }

    switch (question.questionType) {
      case 'text':
        const textAnswer = getAnswer(question.id);
        console.log(`Text input for question ${question.id}:`, textAnswer);
        return (
          <input
            type="text"
            value={textAnswer?.answerText || ''}
            onChange={(e) => {
              const currentAnswer = response[question.id] || {};
              setResponse({ 
                ...response, 
                [question.id]: { 
                  ...currentAnswer,
                  answerText: e.target.value, 
                  answerValue: e.target.value 
                } 
              });
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            required={question.isRequired}
          />
        );
      case 'textarea':
        return (
          <textarea
            value={getAnswer(question.id)?.answerText || ''}
            onChange={(e) => {
              const currentAnswer = getAnswer(question.id) || {};
              setResponse({ 
                ...response, 
                [question.id]: { 
                  ...currentAnswer,
                  answerText: e.target.value, 
                  answerValue: e.target.value 
                } 
              });
            }}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            required={question.isRequired}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={getAnswer(question.id)?.answerText || ''}
            onChange={(e) => {
              const currentAnswer = getAnswer(question.id) || {};
              setResponse({ 
                ...response, 
                [question.id]: { 
                  ...currentAnswer,
                  answerText: e.target.value, 
                  answerValue: e.target.value 
                } 
              });
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            required={question.isRequired}
          />
        );
      case 'date': {
        // Date only (no time) - normalize in case backend returns ISO datetime
        const answer = getAnswer(question.id);
        const raw = answer?.answerText || answer?.answerValue || '';
        const dateOnly = typeof raw === 'string' && raw.length >= 10 ? raw.slice(0, 10) : raw;
        return (
          <DateOnlyPicker
            value={dateOnly}
            onChange={(val) => {
              const currentAnswer = getAnswer(question.id) || {};
              setResponse({
                ...response,
                [question.id]: {
                  ...currentAnswer,
                  answerText: val,
                  answerValue: val
                }
              });
            }}
            placeholder={t('common.selectDate')}
            required={question.isRequired}
          />
        );
      }
      case 'yes_no':
        return (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="yes"
                checked={getAnswer(question.id)?.answerValue === 'yes'}
                onChange={() => {
                  const currentAnswer = getAnswer(question.id) || {};
                  setResponse({ ...response, [question.id]: { ...currentAnswer, answerText: 'Yes', answerValue: 'yes' } });
                }}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                required={question.isRequired}
              />
              <span>{t('common.yes')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="no"
                checked={getAnswer(question.id)?.answerValue === 'no'}
                onChange={() => {
                  const currentAnswer = getAnswer(question.id) || {};
                  setResponse({ ...response, [question.id]: { ...currentAnswer, answerText: 'No', answerValue: 'no' } });
                }}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                required={question.isRequired}
              />
              <span>{t('common.no')}</span>
            </label>
          </div>
        );
      case 'radio':
      case 'multiple_choice':
        return (
          <div className="space-y-2">
            {question.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={getAnswer(question.id)?.answerValue === option}
                  onChange={() => {
                    const currentAnswer = getAnswer(question.id) || {};
                    setResponse({ ...response, [question.id]: { ...currentAnswer, answerText: option, answerValue: option } });
                  }}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  required={question.isRequired}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      case 'checkbox':
        const selectedValues = getAnswer(question.id)?.answerValue?.split(',') || [];
        return (
          <div className="space-y-2">
            {question.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    let newValues = [...selectedValues];
                    if (e.target.checked) {
                      newValues.push(option);
                    } else {
                      newValues = newValues.filter(v => v !== option);
                    }
                    const currentAnswer = getAnswer(question.id) || {};
                    setResponse({
                      ...response,
                      [question.id]: {
                        ...currentAnswer,
                        answerText: newValues.join(', '),
                        answerValue: newValues.join(',')
                      }
                    });
                  }}
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );
      case 'dropdown':
        return (
          <div className="relative">
            <select
              value={getAnswer(question.id)?.answerValue ?? getAnswer(question.id)?.answerText ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                const currentAnswer = response[question.id] || {};
                setResponse({
                  ...response,
                  [question.id]: {
                    ...currentAnswer,
                    answerText: val,
                    answerValue: val
                  }
                });
              }}
              className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-white appearance-none cursor-pointer text-gray-900"
              required={question.isRequired}
              style={{ minHeight: '48px' }}
            >
              <option value="">{t('common.selectOption')}</option>
              {question.options?.map((option: string, index: number) => (
                <option key={index} value={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" aria-hidden />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-gradient-to-r from-white to-primary-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{questionnaire.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('columns.deadline')}: {new Date(questionnaire.deadline).toLocaleDateString()}
                {/* Only show expired if NOT submitted - submitted responses are always viewable */}
                {isExpired && !isSubmitted && <span className="text-red-600 ml-2">{t('sections.statusExpiredParen')}</span>}
                {isSubmitted && <span className="text-green-600 ml-2">{t('sections.statusSubmittedParen')}</span>}
                {responseStatus === 'draft' && <span className="text-yellow-600 ml-2">{t('sections.statusDraftParen')}</span>}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {loadingResponse ? (
            <div className="text-center py-12">
              <div className="inline-flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600 font-medium">{t('sections.loadingAnswers')}</p>
              </div>
            </div>
          ) : (
            <>
              {questionnaire.description && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-gray-700">{questionnaire.description}</p>
                </div>
              )}
              {prefillHint && !isReadOnly && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-900">
                    {t('procedures.prefillFromPrevious', {
                      defaultValue:
                        'Answers were prefilled from a previous submission. Review and edit them for this tender, then save or submit.'
                    })}
                  </p>
                </div>
              )}
              {isReadOnly && bidContext?.reason && bidContext.reason !== 'submitted' && (
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-slate-800">
                    {bidContext.reason === 'bid_deadline_passed'
                      ? t('procedures.lockedBidDeadline', {
                          defaultValue: 'Bid deadline has passed — answers are locked for this tender.'
                        })
                      : bidContext.reason === 'procedure_closed'
                        ? t('procedures.lockedProcedureClosed', {
                            defaultValue:
                              'This procedure is no longer open for bids — answers are view-only.'
                          })
                        : t('procedures.lockedGeneric', {
                            defaultValue: 'Answers are locked for this tender.'
                          })}
                  </p>
                </div>
              )}
              {procedureId && !isReadOnly && !prefillHint && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <p className="text-xs text-slate-600">
                    {t('procedures.bidScopedHint', {
                      defaultValue:
                        'Answers for this tender are saved separately from other procedures that use the same questionnaire.'
                    })}
                  </p>
                </div>
              )}
              {!isReadOnly && !loadingResponse && (
                <SupplierQuestionnaireAnswerAiAssist
                  questionnaireId={questionnaire.id}
                  onApply={(suggestions: AnswerSuggestion[]) => {
                    setResponse((prev: Record<string, any>) => {
                      const next = { ...prev };
                      for (const s of suggestions) {
                        if (s.skipped) continue;
                        const current = next[s.questionId] || {};
                        next[s.questionId] = {
                          ...current,
                          answerText: s.answerText || s.answerValue || '',
                          answerValue: s.answerValue || s.answerText || '',
                          ...(s.suggestedDocumentId
                            ? {
                                documentId: s.suggestedDocumentId,
                                document: s.suggestedDocumentName
                                  ? {
                                      ...(current.document || {}),
                                      fileName: s.suggestedDocumentName,
                                      id: s.suggestedDocumentId,
                                    }
                                  : current.document,
                              }
                            : {}),
                        };
                      }
                      return next;
                    });
                  }}
                />
              )}
              {questionnaire.questions?.map((question: Question, index: number) => (
            <div key={question.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-start gap-3 mb-3">
                <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">
                    {question.questionText}
                    {question.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  {question.attachedDocument && (
                    <div className="mt-2 mb-3 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                      <FileText size={18} className="text-blue-600 flex-shrink-0" />
                      <a
                        href={uploadsUrl(question.attachedDocument.filePath.replace(/^.*[\\/]/, '')) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium text-sm truncate"
                      >
                        {question.attachedDocument.fileName}
                      </a>
                      <span className="text-blue-600 text-sm">({t('questionnaire.view')} / {t('questionnaire.download')})</span>
                    </div>
                  )}
                  <div className="mt-3">
                    {renderQuestionInput(question)}
                  </div>
                  {question.requiresDocument && (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {isReadOnly
                          ? t('sections.previewDownloadType', { type: question.documentType || t('sections.documentFallback') })
                          : t('sections.attachDocumentType', { type: question.documentType || t('sections.documentFallback') })}
                      </label>
                      {isReadOnly ? (
                        <div>
                          {getAnswer(question.id)?.document ? (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <FileText size={16} />
                              <a 
                                href={uploadsUrl(response[question.id].document.filePath.replace(/^.*[\\\/]/, '')) || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:underline"
                              >
                                {response[question.id].document.fileName}
                              </a>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">{t('sections.noDocumentUploaded')}</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {getAnswer(question.id)?.document ? (
                            <div className="mb-2 flex items-center gap-2 text-sm text-green-600">
                              <FileText size={16} />
                              <span>{response[question.id].document.fileName}</span>
                              <a 
                                href={uploadsUrl(response[question.id].document.filePath.replace(/^.*[\\\/]/, '')) || '#'} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline"
                              >
                                {t('buttons.view')}
                              </a>
                            </div>
                          ) : null}
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setResponseDocuments({ ...responseDocuments, [question.id]: file });
                              }
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
            </>
          )}
          {!isReadOnly && (
            <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/50">
              <button
                onClick={onSaveDraft}
                disabled={savingDraft || submitting}
                className="btn-cancel px-6 py-2.5 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                {savingDraft ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {t('sections.saveAsDraft')}
                  </>
                )}
              </button>
              <button
                onClick={onSubmit}
                disabled={submitting || savingDraft}
                className="btn-save px-6 py-2.5 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('common.submitting')}
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    {t('common.submit')}
                  </>
                )}
              </button>
            </div>
          )}
          {isReadOnly && isSubmitted && (
            <div className="flex justify-end pt-6 border-t border-gray-200/50">
              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-semibold">
                ✓ {t('sections.responseReadOnly')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
