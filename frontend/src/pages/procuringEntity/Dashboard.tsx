import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlement } from '../../contexts/EntitlementContext';
import { uploadsUrl } from '../../utils/uploadsUrl';
import api from '../../services/api';
import { usePortalTab } from '../../hooks/usePortalTab';
import { PortalLayout } from '../../components/ui/PortalLayout';
import { AccountStatusBanner } from '../../components/ui/AccountStatusBanner';
import { ProceduresPanel } from '../../components/procuringEntity/ProceduresPanel';
import { ContractsPanel } from '../../components/procuringEntity/ContractsPanel';
import {
  ProcuringEntityHomeTab,
  EntityQuestionnaireStatsStrip,
  type EntityDashboardStats
} from '../../components/procuringEntity/ProcuringEntityHomeTab';
import { ProcuringEntityAiProfileAssist } from '../../components/procuringEntity/ProcuringEntityAiProfileAssist';
import {
  ProcuringEntityProfileTabsNav,
  type EntityProfileTabId,
} from '../../components/procuringEntity/ProcuringEntityProfileTabsNav';
import {
  ProcuringEntityProfileCompletenessRail,
  ProcuringEntityProfileCompletenessMobile,
  useEntityCompleteness,
} from '../../components/procuringEntity/ProcuringEntityProfileCompleteness';
import {
  ProcuringEntityQuestionnaireAiAssist,
  type AppliedQuestionnaireDraft,
} from '../../components/procuringEntity/ProcuringEntityQuestionnaireAiAssist';
import { AiPreferencesPanel } from '../../components/ai/AiPreferencesPanel';
import { CpvSearchSelect } from '../../components/cpv/CpvSearchSelect';
import { NutsSearchSelect } from '../../components/nuts/NutsSearchSelect';
import { useCpvCatalogSearch } from '../../hooks/useCpvCatalogSearch';
import { useNutsCatalogSearch } from '../../hooks/useNutsCatalogSearch';
import { useListPagination, useServerListPagination } from '../../hooks/useListPagination';
import { ListPagination } from '../../components/ui/ListPagination';
import { PortaledDropdown } from '../../components/ui/PortaledDropdown';
import { SearchField } from '../../components/ui/SearchField';
import { BrandSelect } from '../../components/ui/BrandSelect';
import { QuestionnaireSlimRow, StatusBadge, RowActionButton } from '../../components/questionnaires/QuestionnaireSlimRow';
import { DynamicFilterBar } from '../../components/search/DynamicFilterBar';
import { emptyFilters, filterValueAsString, type FilterFieldDef, type FilterValues } from '../../components/search/filterTypes';
import { CenterModal } from '../../components/ui/SlideOver';
import { 
  FileText, Search, User, Plus, Edit2, Trash2, Eye, 
  Upload, X, Calendar, Building2, Save, XCircle, Camera,
  CheckCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Users, Power, PowerOff,
  LayoutDashboard, Briefcase, ScrollText, Sparkles, Wallet, Award, Shield, Copy, Bell
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { NotificationsBell } from '../../components/notifications/NotificationsBell';
import { NotificationsPanel } from '../../components/notifications/NotificationsPanel';

const BUYER_QUESTIONNAIRE_FILTER_FIELDS: FilterFieldDef[] = [
  {
    key: 'keyword',
    type: 'keyword',
    labelKey: 'common.search',
    placeholderKey: 'savedSearch.questionnairePlaceholder'
  },
  { key: 'cpvCodeId', type: 'cpv', labelKey: 'savedSearch.cpv' },
  {
    key: 'status',
    type: 'select',
    labelKey: 'common.status',
    options: [
      { value: 'active', labelKey: 'common.active' },
      { value: 'inactive', labelKey: 'common.inactive' }
    ]
  }
];

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface CPVCode {
  id: string;
  code: string;
  description: string;
}

interface Question {
  id?: string;
  questionText: string;
  questionType: 'text' | 'textarea' | 'number' | 'date' | 'yes_no' | 'multiple_choice' | 'radio' | 'checkbox' | 'dropdown';
  options?: string[];
  isRequired: boolean;
  requiresDocument: boolean;
  documentType?: string;
  order: number;
  attachedDocumentId?: string | null;
  attachedDocument?: { id: string; fileName: string; filePath: string } | null;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  deadline: string;
  cpvCodeId?: string;
  cpvCode?: CPVCode;
  questions: Question[];
  responses?: any[];
  createdAt: string;
  isActive?: boolean;
  editLocked?: boolean;
  inUse?: boolean;
  linkedProcedureCount?: number;
  linkedProcedures?: Array<{ id: string; title: string; status: string; referenceNumber?: string | null }>;
}

// Turnover range options for supplier search: { value, minTurnover, maxTurnover }
// Use inclusive ranges to match both legacy values (e.g. 100000) and new dropdown values (e.g. 1000000)
const TURNOVER_SEARCH_OPTIONS = [
  { value: '', labelKey: 'commonQuestions.turnoverFilterPlaceholder', min: 0, max: 0 },
  { value: '0_1M', labelKey: 'commonQuestions.turnover0_1M', min: 0, max: 1000000 },
  { value: '1M_10M', labelKey: 'commonQuestions.turnover1M_10M', min: 1000000, max: 10000000 },
  { value: '10M_25M', labelKey: 'commonQuestions.turnover10M_25M', min: 10000000, max: 25000000 },
  { value: '25M_50M', labelKey: 'commonQuestions.turnover25M_50M', min: 25000000, max: 50000000 },
  { value: '50M_75M', labelKey: 'commonQuestions.turnover50M_75M', min: 50000000, max: 75000000 },
  { value: '75M_100M', labelKey: 'commonQuestions.turnover75M_100M', min: 75000000, max: 100000000 },
  { value: '100MPlus', labelKey: 'commonQuestions.turnover100MPlus', min: 100000000, max: 999999999999 }
];

function formatSupplierTurnoverLabel(raw: unknown, t: (key: string) => string): string {
  if (raw == null || raw === '') return '';
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
  if (!Number.isNaN(num)) {
    const match = TURNOVER_SEARCH_OPTIONS.find((o) => o.value && num >= o.min && num <= o.max);
    if (match) return t(match.labelKey);
  }
  return String(raw);
}

const ENTITY_PORTAL_TABS = [
  'home',
  'procedures',
  'contracts',
  'questionnaires',
  'suppliers',
  'notifications',
  'profile',
  'ai-preferences',
] as const;

const ProcuringEntityDashboard = () => {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = usePortalTab('home', ENTITY_PORTAL_TABS);
  const [loading, setLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState<EntityDashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<EntityProfileTabId>('contact');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    entityName: '',
    address: '',
    city: '',
    country: ''
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const profilePictureRef = useRef<HTMLInputElement>(null);
  const entityCompleteness = useEntityCompleteness(profileData, documents.length);
  
  // Questionnaire state
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [questionnaireFilters, setQuestionnaireFilters] = useState<FilterValues>(() =>
    emptyFilters(BUYER_QUESTIONNAIRE_FILTER_FIELDS)
  );
  const [showCreateQuestionnaire, setShowCreateQuestionnaire] = useState(false);
  const [newQuestionnaire, setNewQuestionnaire] = useState({
    title: '',
    description: '',
    deadline: '',
    cpvCodeId: '',
    questions: [] as Question[]
  });
  const cpvCatalog = useCpvCatalogSearch();
  const nutsCatalog = useNutsCatalogSearch();
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<Questionnaire | null>(null);
  const [viewingResponses, setViewingResponses] = useState<Questionnaire | null>(null);
  const [questionnaireResponses, setQuestionnaireResponses] = useState<any[]>([]);
  const [copySourceQuestionnaire, setCopySourceQuestionnaire] = useState<Questionnaire | null>(null);
  const [copyTitle, setCopyTitle] = useState('');
  const [copyNotes, setCopyNotes] = useState('');
  const [copySaving, setCopySaving] = useState(false);

  // Search Suppliers state
  const { enabled: canDiscoverSuppliers } = useEntitlement('marketplace.supplier_discovery');
  const [supplierScope, setSupplierScope] = useState<'discover' | 'mine'>('discover');
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [appliedSupplierSearch, setAppliedSupplierSearch] = useState('');
  const [supplierTurnoverFilter, setSupplierTurnoverFilter] = useState('');
  const [supplierCpvFilter, setSupplierCpvFilter] = useState('');
  const [supplierNutsFilter, setSupplierNutsFilter] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<any>(null);
  const [supplierDetailLoading, setSupplierDetailLoading] = useState(false);

  const activeSupplierScope: 'discover' | 'mine' =
    canDiscoverSuppliers && supplierScope === 'discover' ? 'discover' : 'mine';

  const supplierPager = useServerListPagination({
    resetKey: [
      activeSupplierScope,
      appliedSupplierSearch,
      supplierTurnoverFilter,
      supplierCpvFilter,
      supplierNutsFilter
    ].join('|')
  });

  // Keep selected CPV ids in refs so search callbacks stay stable (avoids CPV dropdown refetch loop).
  const newCpvIdRef = useRef(newQuestionnaire.cpvCodeId);
  const editCpvIdRef = useRef(editingQuestionnaire?.cpvCodeId || '');
  const supplierCpvFilterRef = useRef(supplierCpvFilter);
  const supplierNutsFilterRef = useRef(supplierNutsFilter);
  newCpvIdRef.current = newQuestionnaire.cpvCodeId;
  editCpvIdRef.current = editingQuestionnaire?.cpvCodeId || '';
  supplierCpvFilterRef.current = supplierCpvFilter;
  supplierNutsFilterRef.current = supplierNutsFilter;

  const handleNewQuestionnaireCpvSearch = useCallback(
    (term: string) => cpvCatalog.searchDebounced(term, newCpvIdRef.current),
    [cpvCatalog.searchDebounced]
  );
  const handleEditQuestionnaireCpvSearch = useCallback(
    (term: string) => cpvCatalog.searchDebounced(term, editCpvIdRef.current),
    [cpvCatalog.searchDebounced]
  );
  const handleSupplierCpvSearch = useCallback(
    (term: string) => cpvCatalog.searchDebounced(term, supplierCpvFilterRef.current),
    [cpvCatalog.searchDebounced]
  );

  const fetchDashboardStats = async (showLoading = true) => {
    try {
      if (showLoading) setStatsLoading(true);
      const response = await api.get('/procuring-entity/dashboard/stats');
      setDashboardStats(response.data.stats || null);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      if (showLoading) {
        showToast(error.response?.data?.message || t('entityPortal.statsLoadFailed'), 'error');
      }
    } finally {
      if (showLoading) setStatsLoading(false);
    }
  };

  // Fetch profile and documents
  const fetchProfile = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const response = await api.get('/procuring-entity/profile');
      const entity = response.data.procuringEntity;
      setProfile(entity);
      setProfileData({
        firstName: entity.user?.firstName || '',
        lastName: entity.user?.lastName || '',
        email: entity.user?.email || '',
        phone: entity.user?.phone || '',
        entityName: entity.entityName || '',
        address: entity.address || '',
        city: entity.city || '',
        country: entity.country || ''
      });
      setDocuments(entity.documents || []);
    } catch (error: any) {
      if (!opts?.silent) {
        showToast(error.response?.data?.message || t('msg.failedFetchProfile'), 'error');
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  // Fetch questionnaires
  const fetchQuestionnaires = async () => {
    try {
      setLoading(true);
      const response = await api.get('/questionnaires');
      setQuestionnaires(response.data.questionnaires || []);
    } catch (error: any) {
      if (error.response?.status === 401) return;
      showToast(error.response?.data?.message || t('msg.failedFetchQuestionnaires'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch suppliers: discover (marketplace) or mine (applied / invited / contracted)
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page: supplierPager.page,
        limit: supplierPager.pageSize,
        scope: activeSupplierScope
      };
      if (appliedSupplierSearch) params.search = appliedSupplierSearch;
      const turnoverOpt = TURNOVER_SEARCH_OPTIONS.find((o) => o.value === supplierTurnoverFilter);
      if (turnoverOpt && turnoverOpt.value && turnoverOpt.min !== undefined && turnoverOpt.max !== undefined && turnoverOpt.max > 0) {
        params.minTurnover = turnoverOpt.min;
        params.maxTurnover = turnoverOpt.max;
      }
      if (supplierCpvFilter) params.cpvCodeId = supplierCpvFilter;
      if (supplierNutsFilter) params.nutsCodeId = supplierNutsFilter;
      const response = await api.get('/procuring-entity/suppliers', { params });
      setSuppliers(response.data.suppliers || []);
      supplierPager.setTotal(response.data.pagination?.total ?? 0);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedFetchSuppliers'), 'error');
      setSuppliers([]);
      supplierPager.setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    activeSupplierScope,
    supplierPager.page,
    supplierPager.pageSize,
    supplierPager.setTotal,
    appliedSupplierSearch,
    supplierTurnoverFilter,
    supplierCpvFilter,
    supplierNutsFilter,
    showToast,
    t
  ]);

  // Fetch single supplier detail (profile + responses with answers and documents)
  const fetchSupplierDetail = async (supplierId: string) => {
    try {
      setSupplierDetailLoading(true);
      const response = await api.get(`/procuring-entity/suppliers/${supplierId}`);
      setSelectedSupplierDetail({ supplier: response.data.supplier, responses: response.data.responses || [] });
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLoadSupplierDetails'), 'error');
      setSelectedSupplierDetail(null);
    } finally {
      setSupplierDetailLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSupplierId) {
      fetchSupplierDetail(selectedSupplierId);
    } else {
      setSelectedSupplierDetail(null);
    }
  }, [selectedSupplierId]);

  // Always load entity status on mount — needed for Procedures/Contracts action gates
  useEffect(() => {
    if (!user?.id) return;
    fetchProfile({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    if (activeTab === 'home') {
      fetchDashboardStats();
    } else if (activeTab === 'profile') {
      fetchProfile();
    } else if (activeTab === 'procedures' || activeTab === 'contracts') {
      if (!profile) fetchProfile({ silent: true });
    } else if (activeTab === 'questionnaires') {
      fetchQuestionnaires();
      cpvCatalog.fetchCodes();
    } else if (activeTab === 'suppliers') {
      cpvCatalog.fetchCodes();
      nutsCatalog.fetchCodes('', supplierNutsFilterRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?.id]);

  useEffect(() => {
    if (!user?.id || activeTab !== 'suppliers') return;
    fetchSuppliers();
  }, [user?.id, activeTab, fetchSuppliers]);

  const handleAiProfileApply = (fields: Record<string, string>) => {
    setProfileData((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(fields)) {
        if (key === 'companyName') {
          next.entityName = value;
        } else if (key in next) {
          (next as Record<string, string>)[key] = value;
        }
      }
      return next;
    });
    if (!editingProfile) setEditingProfile(true);
    const orgKeys = ['entityName', 'companyName', 'address', 'city', 'country'];
    if (Object.keys(fields).some((key) => orgKeys.includes(key))) {
      setActiveProfileTab('organization');
    } else if (Object.keys(fields).some((key) => ['firstName', 'lastName', 'phone'].includes(key))) {
      setActiveProfileTab('contact');
    }
  };

  const handleAiQuestionnaireApply = async (draft: AppliedQuestionnaireDraft) => {
    await cpvCatalog.fetchCodes('', draft.cpvCodeId);
    setNewQuestionnaire({
      title: draft.title,
      description: draft.description,
      deadline: '',
      cpvCodeId: draft.cpvCodeId,
      questions: draft.questions.map((q) => ({
        questionText: q.questionText,
        questionType: q.questionType as Question['questionType'],
        isRequired: q.isRequired,
        requiresDocument: q.requiresDocument,
        documentType: q.documentType,
        options: q.options,
        order: q.order,
      })),
    });
    setShowCreateQuestionnaire(true);
  };

  // Update profile
  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      await api.put('/procuring-entity/profile', profileData);
      showToast(t('msg.profileUpdated'), 'success');
      setEditingProfile(false);
      fetchProfile();
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

  // Upload document
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', 'general');

    try {
      setUploadingDoc(true);
      await api.post('/documents/procuring-entity', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast(t('msg.documentUploaded'), 'success');
      fetchProfile();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUploadDocument'), 'error');
    } finally {
      setUploadingDoc(false);
      e.target.value = '';
    }
  };

  // Delete document
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm(t('sections.confirmDeleteDocument'))) return;
    
    try {
      await api.delete(`/documents/${documentId}`);
      showToast(t('msg.documentDeleted'), 'success');
      fetchProfile();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedDeleteDocument'), 'error');
    }
  };

  // Add question to questionnaire
  const addQuestion = () => {
    setNewQuestionnaire({
      ...newQuestionnaire,
      questions: [
        ...newQuestionnaire.questions,
        {
          questionText: '',
          questionType: 'text',
          isRequired: true,
          requiresDocument: false,
          order: newQuestionnaire.questions.length
        }
      ]
    });
  };

  // Update question (for new questionnaire)
  const updateQuestion = (index: number, field: string, value: any) => {
    const updatedQuestions = [...newQuestionnaire.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setNewQuestionnaire({ ...newQuestionnaire, questions: updatedQuestions });
  };

  // Update question (for editing questionnaire)
  const updateQuestionInEdit = (index: number, field: string, value: any) => {
    if (!editingQuestionnaire) return;
    const updatedQuestions = [...editingQuestionnaire.questions];
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
    setEditingQuestionnaire({ ...editingQuestionnaire, questions: updatedQuestions });
  };

  // Update question attachment (sets both attachedDocumentId and attachedDocument)
  const updateQuestionAttachment = (index: number, doc: { id: string; fileName: string; filePath: string } | null) => {
    const updatedQuestions = [...newQuestionnaire.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      attachedDocumentId: doc?.id ?? null,
      attachedDocument: doc ?? null
    };
    setNewQuestionnaire({ ...newQuestionnaire, questions: updatedQuestions });
  };
  const updateQuestionAttachmentInEdit = (index: number, doc: { id: string; fileName: string; filePath: string } | null) => {
    if (!editingQuestionnaire) return;
    const updatedQuestions = [...editingQuestionnaire.questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      attachedDocumentId: doc?.id ?? null,
      attachedDocument: doc ?? null
    };
    setEditingQuestionnaire({ ...editingQuestionnaire, questions: updatedQuestions });
  };

  // Remove question (for new questionnaire)
  const removeQuestion = (index: number) => {
    const updatedQuestions = newQuestionnaire.questions.filter((_, i) => i !== index);
    setNewQuestionnaire({ ...newQuestionnaire, questions: updatedQuestions });
  };

  // Remove question (for editing questionnaire)
  const removeQuestionInEdit = (index: number) => {
    if (!editingQuestionnaire) return;
    const updatedQuestions = editingQuestionnaire.questions.filter((_, i) => i !== index);
    setEditingQuestionnaire({ ...editingQuestionnaire, questions: updatedQuestions });
  };

  // Add question (for editing questionnaire)
  const addQuestionInEdit = () => {
    if (!editingQuestionnaire) return;
    setEditingQuestionnaire({
      ...editingQuestionnaire,
      questions: [
        ...editingQuestionnaire.questions,
        {
          questionText: '',
          questionType: 'text',
          isRequired: true,
          requiresDocument: false,
          order: editingQuestionnaire.questions.length
        }
      ]
    });
  };

  // Add option to question (for new questionnaire)
  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...newQuestionnaire.questions];
    const currentOptions = updatedQuestions[questionIndex].options || [];
    updatedQuestions[questionIndex].options = [...currentOptions, ''];
    setNewQuestionnaire({ ...newQuestionnaire, questions: updatedQuestions });
  };

  // Add option to question (for editing questionnaire)
  const addOptionInEdit = (questionIndex: number) => {
    if (!editingQuestionnaire) return;
    const updatedQuestions = [...editingQuestionnaire.questions];
    const currentOptions = updatedQuestions[questionIndex].options || [];
    updatedQuestions[questionIndex].options = [...currentOptions, ''];
    setEditingQuestionnaire({ ...editingQuestionnaire, questions: updatedQuestions });
  };

  // Update option (for new questionnaire)
  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedQuestions = [...newQuestionnaire.questions];
    const options = [...(updatedQuestions[questionIndex].options || [])];
    options[optionIndex] = value;
    updatedQuestions[questionIndex].options = options;
    setNewQuestionnaire({ ...newQuestionnaire, questions: updatedQuestions });
  };

  // Update option (for editing questionnaire)
  const updateOptionInEdit = (questionIndex: number, optionIndex: number, value: string) => {
    if (!editingQuestionnaire) return;
    const updatedQuestions = [...editingQuestionnaire.questions];
    const options = [...(updatedQuestions[questionIndex].options || [])];
    options[optionIndex] = value;
    updatedQuestions[questionIndex].options = options;
    setEditingQuestionnaire({ ...editingQuestionnaire, questions: updatedQuestions });
  };

  // Remove option (for new questionnaire)
  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...newQuestionnaire.questions];
    const options = updatedQuestions[questionIndex].options?.filter((_, i) => i !== optionIndex) || [];
    updatedQuestions[questionIndex].options = options;
    setNewQuestionnaire({ ...newQuestionnaire, questions: updatedQuestions });
  };

  // Remove option (for editing questionnaire)
  const removeOptionInEdit = (questionIndex: number, optionIndex: number) => {
    if (!editingQuestionnaire) return;
    const updatedQuestions = [...editingQuestionnaire.questions];
    const options = updatedQuestions[questionIndex].options?.filter((_, i) => i !== optionIndex) || [];
    updatedQuestions[questionIndex].options = options;
    setEditingQuestionnaire({ ...editingQuestionnaire, questions: updatedQuestions });
  };

  // Create questionnaire
  const handleCreateQuestionnaire = async () => {
    const missing: string[] = [];
    if (!newQuestionnaire.title?.trim()) missing.push(t('columns.title'));
    if (!newQuestionnaire.cpvCodeId) missing.push(t('forms.selectCPVCode'));
    if (!newQuestionnaire.deadline) missing.push(t('forms.deadlineDateOnly'));
    if (missing.length > 0) {
      showToast(t('msg.fillRequiredFieldsNamed', { fields: missing.join(', ') }), 'error');
      return;
    }

    if (newQuestionnaire.questions.length === 0) {
      showToast(t('msg.addAtLeastOneQuestion'), 'error');
      return;
    }

    if (newQuestionnaire.questions.some((q) => !String(q.questionText || '').trim())) {
      showToast(t('msg.questionTextRequired'), 'error');
      return;
    }

    try {
      setLoading(true);
      // Sort questions by explicit sort number if provided, otherwise by current index
      const sortedQuestions = [...newQuestionnaire.questions].sort(
        (a, b) => ((a.order ?? 0) - (b.order ?? 0))
      );
      const payload = {
        title: newQuestionnaire.title.trim(),
        description: newQuestionnaire.description?.trim() || '',
        deadline: newQuestionnaire.deadline,
        cpvCodeId: newQuestionnaire.cpvCodeId,
        questions: sortedQuestions.map((q, index) => {
          const questionType = q.questionType || 'text';
          const needsOptions = ['radio', 'checkbox', 'dropdown', 'multiple_choice'].includes(questionType);
          const options = Array.isArray(q.options) ? q.options : (needsOptions ? [] : null);
          return {
            questionText: q.questionText != null ? String(q.questionText).trim() : '',
            questionType,
            options,
            isRequired: q.isRequired !== undefined ? q.isRequired : true,
            requiresDocument: q.requiresDocument || false,
            documentType: q.documentType || null,
            attachedDocumentId: q.attachedDocumentId || null,
            order: q.order !== undefined ? Number(q.order) : index
          };
        })
      };
      await api.post('/questionnaires', payload);
      showToast(t('msg.questionnaireCreated'), 'success');
      setShowCreateQuestionnaire(false);
      setNewQuestionnaire({
        title: '',
        description: '',
        deadline: '',
        cpvCodeId: '',
        questions: []
      });
      fetchQuestionnaires();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedCreateQuestionnaire'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update questionnaire
  const handleUpdateQuestionnaire = async () => {
    if (!editingQuestionnaire) return;

    const missing: string[] = [];
    if (!editingQuestionnaire.title?.trim()) missing.push(t('columns.title'));
    if (!editingQuestionnaire.cpvCodeId) missing.push(t('forms.selectCPVCode'));
    if (!editingQuestionnaire.deadline) missing.push(t('forms.deadlineDateOnly'));
    if (missing.length > 0) {
      showToast(t('msg.fillRequiredFieldsNamed', { fields: missing.join(', ') }), 'error');
      return;
    }

    if (editingQuestionnaire.questions.length === 0) {
      showToast(t('msg.addAtLeastOneQuestion'), 'error');
      return;
    }

    if (editingQuestionnaire.questions.some((q) => !String(q.questionText || '').trim())) {
      showToast(t('msg.questionTextRequired'), 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare questions data - remove IDs and ensure proper structure for all question types
      const sortedQuestions = [...editingQuestionnaire.questions].sort(
        (a, b) => ((a.order ?? 0) - (b.order ?? 0))
      );
      const questionsData = sortedQuestions.map((q, index) => {
        const questionType = q.questionType || 'text';
        const needsOptions = ['radio', 'checkbox', 'dropdown', 'multiple_choice'].includes(questionType);
        let options: string[] | null = null;
        if (needsOptions) {
          const raw = q.options;
          const arr = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' ? Object.values(raw) : []);
          options = arr.map((o: any) => (o != null ? String(o) : ''));
        }
        return {
          questionText: q.questionText != null ? String(q.questionText).trim() : '',
          questionType,
          options,
          isRequired: q.isRequired !== undefined ? q.isRequired : true,
          requiresDocument: q.requiresDocument || false,
          documentType: q.documentType || null,
          attachedDocumentId: q.attachedDocumentId || null,
          order: q.order !== undefined ? Number(q.order) : index
        };
      });

      // Convert deadline to ISO string if it's a datetime-local string
      let deadlineValue = editingQuestionnaire.deadline;
      if (deadlineValue && deadlineValue.includes('T') && !deadlineValue.includes('Z')) {
        // Convert datetime-local to ISO string
        deadlineValue = new Date(deadlineValue).toISOString();
      }

      await api.put(`/questionnaires/${editingQuestionnaire.id}`, {
        title: editingQuestionnaire.title.trim(),
        description: editingQuestionnaire.description?.trim() || '',
        deadline: deadlineValue,
        cpvCodeId: editingQuestionnaire.cpvCodeId,
        questions: questionsData
      });
      showToast(t('msg.questionnaireUpdated'), 'success');
      setEditingQuestionnaire(null);
      fetchQuestionnaires();
    } catch (error: any) {
      console.error('Update questionnaire error:', error);
      showToast(error.response?.data?.message || t('msg.failedUpdateQuestionnaire'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete questionnaire
  const handleDeleteQuestionnaire = async (questionnaireId: string) => {
    if (!confirm(t('sections.confirmDeleteQuestionnaire'))) return;
    
    try {
      setLoading(true);
      await api.delete(`/questionnaires/${questionnaireId}`);
      showToast(t('msg.questionnaireDeleted'), 'success');
      fetchQuestionnaires();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedDeleteQuestionnaire'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCopyQuestionnaire = (questionnaire: Questionnaire) => {
    setCopySourceQuestionnaire(questionnaire);
    setCopyTitle(`${questionnaire.title} (copy)`);
    setCopyNotes('');
  };

  const handleCopyQuestionnaire = async () => {
    if (!copySourceQuestionnaire) return;
    const title = copyTitle.trim();
    if (!title) {
      showToast(t('questionnaires.copyNeedsTitle', { defaultValue: 'Enter a name for the new questionnaire' }), 'warning');
      return;
    }
    try {
      setCopySaving(true);
      const res = await api.post(`/questionnaires/${copySourceQuestionnaire.id}/copy`, {
        title,
        notes: copyNotes.trim() || undefined,
      });
      showToast(t('questionnaires.copySuccess', { defaultValue: 'Questionnaire copied — unused copy ready to link' }), 'success');
      setCopySourceQuestionnaire(null);
      setCopyTitle('');
      setCopyNotes('');
      await fetchQuestionnaires();
      const created = res.data.questionnaire;
      if (created) openQuestionnaireEditor(created);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedSave'), 'error');
    } finally {
      setCopySaving(false);
    }
  };

  // Toggle questionnaire status
  const handleToggleQuestionnaireStatus = async (questionnaireId: string, currentStatus: boolean) => {
    try {
      await api.put(`/questionnaires/${questionnaireId}/toggle-status`);
      showToast(!currentStatus ? t('msg.questionnaireActivated') : t('msg.questionnaireDeactivated'), 'success');
      fetchQuestionnaires();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedToggleQuestionnaire'), 'error');
    }
  };

  // Fetch questionnaire responses (respect sealed-bid lock)
  const fetchQuestionnaireResponses = async (questionnaireId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/questionnaires/${questionnaireId}/responses`);
      setQuestionnaireResponses(response.data.responses || []);
      setViewingResponses(questionnaires.find(q => q.id === questionnaireId) || null);
    } catch (error: any) {
      if (error.response?.data?.sealed) {
        const until = error.response.data.sealedUntil
          ? new Date(error.response.data.sealedUntil).toLocaleString()
          : '';
        showToast(
          t('procedures.sealedResponses', {
            count: error.response.data.submittedCount ?? 0,
            until: until || t('procedures.bidDeadline')
          }),
          'warning'
        );
        setQuestionnaireResponses([]);
        setViewingResponses(null);
      } else {
        showToast(error.response?.data?.message || t('msg.failedFetchResponses'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredEntityQuestionnaires = useMemo(() => {
    const q = filterValueAsString(questionnaireFilters, 'keyword').trim().toLowerCase();
    const cpvCodeId = filterValueAsString(questionnaireFilters, 'cpvCodeId').trim();
    const status = filterValueAsString(questionnaireFilters, 'status').trim();
    return questionnaires.filter((item) => {
      if (cpvCodeId && item.cpvCode?.id !== cpvCodeId && (item as { cpvCodeId?: string }).cpvCodeId !== cpvCodeId) {
        return false;
      }
      if (status === 'active' && item.isActive === false) return false;
      if (status === 'inactive' && item.isActive !== false) return false;
      if (!q) return true;
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.cpvCode?.code || '').toLowerCase().includes(q) ||
        (item.cpvCode?.description || '').toLowerCase().includes(q)
      );
    });
  }, [questionnaires, questionnaireFilters]);

  const {
    page: questionnaireListPage,
    setPage: setQuestionnaireListPage,
    paginatedItems: paginatedEntityQuestionnaires,
    total: entityQuestionnaireTotal,
    pageSize: entityQuestionnairePageSize,
    setPageSize: setEntityQuestionnairePageSize
  } = useListPagination(filteredEntityQuestionnaires);

  const openQuestionnaireEditor = (questionnaire: Questionnaire) => {
    try {
      const questionsForEdit = (questionnaire.questions || []).map((q: Question, index: number) => ({
        id: q.id,
        questionText: q.questionText || '',
        questionType: q.questionType || 'text',
        options: Array.isArray(q.options) ? q.options : [],
        isRequired: q.isRequired !== undefined ? q.isRequired : true,
        requiresDocument: q.requiresDocument || false,
        documentType: q.documentType || '',
        order: q.order !== undefined ? q.order : index,
        attachedDocumentId: q.attachedDocumentId ?? q.attachedDocument?.id ?? null,
        attachedDocument: q.attachedDocument ?? null
      }));

      let deadlineForEdit = '';
      if (questionnaire.deadline) {
        try {
          const date = new Date(questionnaire.deadline);
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            deadlineForEdit = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        } catch (e) {
          console.error('Error formatting deadline:', e);
        }
      }

      const qToEdit: Questionnaire = {
        id: questionnaire.id,
        title: questionnaire.title || '',
        description: questionnaire.description || '',
        deadline: deadlineForEdit,
        cpvCodeId: questionnaire.cpvCode?.id || '',
        cpvCode: questionnaire.cpvCode || { id: '', code: '', description: '' },
        questions: questionsForEdit,
        createdAt: questionnaire.createdAt || new Date().toISOString(),
        isActive: questionnaire.isActive !== undefined ? questionnaire.isActive : true,
        editLocked: questionnaire.editLocked === true
      };
      setEditingQuestionnaire(qToEdit);
      cpvCatalog.fetchCodes('', qToEdit.cpvCodeId);
    } catch (error: any) {
      console.error('Error preparing questionnaire for edit:', error);
      showToast(`${t('msg.errorPreparingQuestionnaire')}: ${error.message}`, 'error');
    }
  };

  const sidebarItems = [
    { id: 'home', label: t('entityPortal.navHome'), icon: LayoutDashboard },
    { id: 'procedures', label: t('procedures.nav'), icon: Briefcase },
    { id: 'contracts', label: t('contracts.nav'), icon: ScrollText },
    { id: 'questionnaires', label: t('nav.questionnaires'), icon: FileText },
    { id: 'suppliers', label: t('nav.searchSuppliers'), icon: Search },
    { id: 'notifications', label: t('nav.notifications'), icon: Bell },
    { id: 'profile', label: t('nav.profile'), icon: User },
    { id: 'ai-preferences', label: t('common.aiPreferences'), icon: Sparkles },
  ];

  return (
    <>
      <PortalLayout
        logoTo="/procuring-entity"
        logoSubtitle={t('nav.procuringEntityPortal')}
        roleLabel={t('nav.procuringEntity')}
        sidebarItems={sidebarItems}
        activeTab={activeTab}
        onTabSelect={setActiveTab}
        onProfileClick={() => setActiveTab('profile')}
        sidebarVariant="wide"
        headerExtra={<NotificationsBell onNavigate={setActiveTab} />}
      >
            <AccountStatusBanner
              status={profile?.status}
              rejectionReason={profile?.rejectionReason}
              roleLabel={t('nav.procuringEntity')}
            />

            {activeTab === 'home' && (
              <ProcuringEntityHomeTab
                stats={dashboardStats}
                loading={statsLoading}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'procedures' && (
              <ProceduresPanel accountApproved={profile?.status === 'approved'} />
            )}

            {activeTab === 'contracts' && <ContractsPanel />}

            {activeTab === 'notifications' && (
              <NotificationsPanel onNavigate={setActiveTab} />
            )}

            {/* Questionnaires Tab */}
            {activeTab === 'questionnaires' && (
              <ProcuringEntityQuestionnaireAiAssist.Root onApply={handleAiQuestionnaireApply}>
              <div className="space-y-6">
                <ProcuringEntityQuestionnaireAiAssist.InputBar />
                {questionnaires.length > 0 && (
                  <EntityQuestionnaireStatsStrip questionnaires={questionnaires} />
                )}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">{t('sections.questionnaireManagement')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('dashboard.createAndManageQuestionnaires')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateQuestionnaire(true);
                      cpvCatalog.fetchCodes('', newQuestionnaire.cpvCodeId);
                    }}
                    className="btn-save flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  >
                    <Plus size={20} />
                    {t('dashboard.createQuestionnaire')}
                  </button>
                </div>

                {questionnaires.length > 0 ? (
                  <DynamicFilterBar
                    scope="buyer.questionnaires"
                    fields={BUYER_QUESTIONNAIRE_FILTER_FIELDS}
                    values={questionnaireFilters}
                    onChange={setQuestionnaireFilters}
                  />
                ) : null}

                {questionnaires.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-primary-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <FileText className="text-gray-400 mx-auto mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-700">{t('sections.noQuestionnairesFound')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('sections.createFirstQuestionnaire')}</p>
                  </div>
                ) : filteredEntityQuestionnaires.length === 0 ? (
                  <div className="text-center py-10 rounded-xl border-2 border-dashed border-border text-sm text-muted">
                    {t('common.noResults')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paginatedEntityQuestionnaires.map((questionnaire) => (
                      <QuestionnaireSlimRow
                        key={questionnaire.id}
                        title={questionnaire.title}
                        description={questionnaire.description}
                        badges={
                          <>
                            <StatusBadge tone={questionnaire.isActive !== false ? 'green' : 'gray'}>
                              {questionnaire.isActive !== false ? t('nav.active') : t('common.inactive')}
                            </StatusBadge>
                            {questionnaire.inUse ? (
                              <StatusBadge tone="orange">
                                {t('questionnaires.inUseBadge', {
                                  defaultValue: 'Linked to procedure',
                                  count: questionnaire.linkedProcedureCount || 1,
                                })}
                              </StatusBadge>
                            ) : (
                              <StatusBadge tone="blue">
                                {t('questionnaires.unusedBadge', { defaultValue: 'Unused' })}
                              </StatusBadge>
                            )}
                          </>
                        }
                        meta={
                          <>
                            <span className="inline-flex items-center gap-1.5 min-w-0">
                              <Building2 size={14} className="shrink-0" />
                              <span className="truncate">
                                {questionnaire.cpvCode?.code} - {questionnaire.cpvCode?.description}
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Calendar size={14} className="shrink-0" />
                              {t('columns.deadline')}: {new Date(questionnaire.deadline).toLocaleDateString()}
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <FileText size={14} className="shrink-0" />
                              {questionnaire.questions?.length || 0} {t('sections.questionsCount')}
                            </span>
                            {questionnaire.responses && questionnaire.responses.length > 0 ? (
                              <span className="inline-flex items-center gap-1.5">
                                <CheckCircle size={14} className="shrink-0" />
                                {questionnaire.responses.length} {t('entityPortal.responsesLabel')}
                              </span>
                            ) : null}
                          </>
                        }
                        trailing={
                          <>
                            <RowActionButton
                              variant="secondary"
                              onClick={() => setSelectedQuestionnaire(questionnaire)}
                            >
                              <Eye size={14} />
                              {t('buttons.view')}
                            </RowActionButton>
                            <RowActionButton
                              variant="muted"
                              onClick={() => openCopyQuestionnaire(questionnaire)}
                            >
                              <Copy size={14} />
                              {t('questionnaires.copyAsNew', { defaultValue: 'Copy as new' })}
                            </RowActionButton>
                            <RowActionButton
                              variant="muted"
                              onClick={() => openQuestionnaireEditor(questionnaire)}
                            >
                              <Edit2 size={14} />
                              {t('buttons.editQuestionnaire')}
                            </RowActionButton>
                            {questionnaire.responses && questionnaire.responses.length > 0 ? (
                              <RowActionButton
                                variant="muted"
                                onClick={() => fetchQuestionnaireResponses(questionnaire.id)}
                              >
                                <Users size={14} />
                                {t('buttons.viewResponses')} ({questionnaire.responses.length})
                              </RowActionButton>
                            ) : null}
                            <RowActionButton
                              variant="muted"
                              onClick={() => handleToggleQuestionnaireStatus(questionnaire.id, questionnaire.isActive ?? false)}
                            >
                              {questionnaire.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                              {questionnaire.isActive ? t('buttons.deactivate') : t('buttons.activate')}
                            </RowActionButton>
                            {(!questionnaire.responses || questionnaire.responses.length === 0 || questionnaire.responses.every((r: any) => r.status === 'draft')) ? (
                              <RowActionButton
                                variant="danger"
                                onClick={() => handleDeleteQuestionnaire(questionnaire.id)}
                              >
                                <Trash2 size={14} />
                                {t('common.delete')}
                              </RowActionButton>
                            ) : null}
                          </>
                        }
                      />
                    ))}
                    <ListPagination
                      page={questionnaireListPage}
                      pageSize={entityQuestionnairePageSize}
                      total={entityQuestionnaireTotal}
                      onPageChange={setQuestionnaireListPage}
                      onPageSizeChange={setEntityQuestionnairePageSize}
                      itemLabel={t('nav.questionnaires').toLowerCase()}
                    />
                  </div>
                )}
              </div>
              <ProcuringEntityQuestionnaireAiAssist.Drawer />
              </ProcuringEntityQuestionnaireAiAssist.Root>
            )}

            {activeTab === 'ai-preferences' && (
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 p-4 sm:p-6">
                <AiPreferencesPanel />
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <ProcuringEntityProfileCompletenessMobile completeness={entityCompleteness} />

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
                      <div className="bg-gradient-to-br from-white to-primary-50/30 rounded-2xl border border-gray-200/50 flex flex-col max-h-[calc(100vh-var(--portal-header-height)-5.5rem)] lg:max-h-[calc(100vh-var(--portal-header-height)-4rem)] min-h-[280px]">
                        <div className="shrink-0 px-3 sm:px-4 pt-3 pb-2 border-b border-gray-200 bg-white/95 backdrop-blur-sm rounded-t-2xl z-10">
                          <h3 className="text-base font-bold text-gray-900 mb-3">{t('common.profile')} Information</h3>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div className="relative group shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-gray-200">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xl sm:text-2xl font-bold">
                                  {(profile?.user?.profilePicture ?? user?.profilePicture) ? (
                                    <img
                                      src={uploadsUrl(profile?.user?.profilePicture ?? user?.profilePicture) || undefined}
                                      alt={t('common.profilePhotoAlt')}
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
                        </div>

                        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                          <ProcuringEntityAiProfileAssist.Root
                            enabled={editingProfile}
                            onApply={handleAiProfileApply}
                            onStartEdit={() => { if (!editingProfile) setEditingProfile(true); }}
                          >
                            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                              {editingProfile && (
                                <div className="shrink-0 px-3 sm:px-4 pt-2 pb-2 border-b border-gray-100 bg-white/80 space-y-2">
                                  <ProcuringEntityAiProfileAssist.UploadBar />
                                </div>
                              )}
                              <div className="flex flex-col flex-1 min-w-0 min-h-0">
                                <div className="shrink-0 px-3 sm:px-4 py-2 border-b border-gray-100 bg-white/80">
                                  <ProcuringEntityProfileTabsNav
                                    activeTab={activeProfileTab}
                                    onTabChange={setActiveProfileTab}
                                    completeness={entityCompleteness}
                                  />
                                </div>
                                <div className="flex-1 overflow-y-auto min-h-0 overscroll-behavior-contain px-3 sm:px-4 py-4">
                                  {activeProfileTab === 'contact' && (
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
                                    </div>
                                  )}

                                  {activeProfileTab === 'organization' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="md:col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.entityName')}</label>
                                        {editingProfile ? (
                                          <input
                                            type="text"
                                            value={profileData.entityName}
                                            onChange={(e) => setProfileData({ ...profileData, entityName: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                          />
                                        ) : (
                                          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                            {profileData.entityName || t('common.na')}
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
                                    </div>
                                  )}

                                  {activeProfileTab === 'documents' && (
                                    <div className="space-y-4">
                                      <div className="flex justify-between items-center gap-3">
                                        <p className="text-sm text-muted">{t('entityPortal.documentsHint')}</p>
                                        <label className="cursor-pointer shrink-0">
                                          <input
                                            type="file"
                                            onChange={handleDocumentUpload}
                                            disabled={uploadingDoc}
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                          />
                                          <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-all duration-200 font-medium text-sm">
                                            <Upload size={16} />
                                            {uploadingDoc ? t('sections.uploading') : t('sections.upload')}
                                          </div>
                                        </label>
                                      </div>
                                      {documents.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500 rounded-xl border border-dashed border-gray-200 bg-gray-50/50">
                                          <FileText size={32} className="mx-auto mb-2 opacity-50" />
                                          <p className="text-sm">{t('sections.noDocumentsUploaded')}</p>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {documents.map((doc) => (
                                            <div
                                              key={doc.id}
                                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all duration-200"
                                            >
                                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <FileText className="text-primary-600 flex-shrink-0" size={20} />
                                                <div className="flex-1 min-w-0">
                                                  <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                                                  <p className="text-xs text-gray-500">
                                                    {(doc.fileSize / 1024).toFixed(2)} KB
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1 flex-shrink-0">
                                                <a
                                                  href={uploadsUrl(doc.filePath.replace(/^.*[\\\/]/, '')) || '#'}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                                                  title={t('sections.viewDownload')}
                                                >
                                                  <Eye size={16} />
                                                </a>
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteDocument(doc.id)}
                                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                  title={t('common.delete')}
                                                >
                                                  <Trash2 size={16} />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {editingProfile && <ProcuringEntityAiProfileAssist.Drawer />}
                          </ProcuringEntityAiProfileAssist.Root>
                        </div>
                      </div>
                    </div>

                    <aside className="hidden lg:flex flex-col gap-3 w-52 xl:w-56 shrink-0 sticky top-[calc(var(--portal-header-height)+1rem)] self-start">
                      <ProcuringEntityProfileCompletenessRail completeness={entityCompleteness} />
                    </aside>
                  </div>
                )}
              </div>
            )}

            {/* Search Suppliers Tab */}
            {activeTab === 'suppliers' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-gray-900">{t('sections.searchSuppliers')}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {activeSupplierScope === 'mine'
                      ? t('sections.mySuppliersSubtitle')
                      : t('sections.discoverSuppliersSubtitle')}
                  </p>
                </div>
                <div
                  className="flex gap-1 overflow-x-auto overscroll-x-contain scrollbar-thin pb-0.5"
                  role="tablist"
                  aria-label={t('sections.searchSuppliers')}
                >
                  {canDiscoverSuppliers ? (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeSupplierScope === 'discover'}
                      onClick={() => setSupplierScope('discover')}
                      className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors border ${
                        activeSupplierScope === 'discover'
                          ? 'bg-primary-50 text-primary-800 border-primary-200 shadow-sm'
                          : 'bg-white text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Search size={15} className="shrink-0" aria-hidden />
                      <span>{t('sections.discoverSuppliers')}</span>
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeSupplierScope === 'mine'}
                    onClick={() => setSupplierScope('mine')}
                    className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors border ${
                      activeSupplierScope === 'mine'
                        ? 'bg-primary-50 text-primary-800 border-primary-200 shadow-sm'
                        : 'bg-white text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Users size={15} className="shrink-0" aria-hidden />
                    <span>{t('sections.mySuppliers')}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px] max-w-md">
                    <SearchField
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setAppliedSupplierSearch(supplierSearch.trim());
                        }
                      }}
                      placeholder={t('placeholders.searchByNameEmailCompany')}
                    />
                  </div>
                  <div className="w-full sm:w-72 min-w-0">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('sections.filterByTurnover')}</label>
                    <div className="flex items-center gap-2">
                      <BrandSelect
                        wrapperClassName="flex-1 min-w-0"
                        value={supplierTurnoverFilter}
                        onChange={(e) => setSupplierTurnoverFilter(e.target.value)}
                      >
                        {TURNOVER_SEARCH_OPTIONS.map((opt) => (
                          <option key={opt.value || 'all'} value={opt.value}>
                            {t(opt.labelKey)}
                          </option>
                        ))}
                      </BrandSelect>
                      {supplierTurnoverFilter && (
                        <button
                          type="button"
                          onClick={() => setSupplierTurnoverFilter('')}
                          className="text-sm text-gray-500 hover:text-primary-600 whitespace-nowrap"
                        >
                          {t('buttons.clear')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full sm:w-72 min-w-0">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('sections.filterByCPV')}</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <CpvSearchSelect
                          cpvCodes={cpvCatalog.cpvCodes}
                          value={supplierCpvFilter}
                          onChange={(id) => setSupplierCpvFilter(id)}
                          onSearch={handleSupplierCpvSearch}
                          loading={cpvCatalog.loading}
                          placeholder={t('placeholders.allCPVCodes')}
                        />
                      </div>
                      {supplierCpvFilter && (
                        <button
                          type="button"
                          onClick={() => setSupplierCpvFilter('')}
                          className="text-sm text-gray-500 hover:text-primary-600 whitespace-nowrap"
                        >
                          {t('buttons.clear')}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="w-full sm:w-72 min-w-0" data-section="supplier-search-nuts-filter">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('sections.filterByNUTS')}</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <NutsSearchSelect
                          nutsCodes={nutsCatalog.nutsCodes}
                          value={supplierNutsFilter}
                          loading={nutsCatalog.loading}
                          onSearch={(term) => nutsCatalog.searchDebounced(term, supplierNutsFilter)}
                          onChange={(id) => setSupplierNutsFilter(id)}
                          placeholder={t('placeholders.allNUTSCodes')}
                        />
                      </div>
                      {supplierNutsFilter && (
                        <button
                          type="button"
                          onClick={() => setSupplierNutsFilter('')}
                          className="text-sm text-gray-500 hover:text-primary-600 whitespace-nowrap"
                        >
                          {t('buttons.clear')}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppliedSupplierSearch(supplierSearch.trim())}
                    className="btn-save px-5 py-2.5 font-medium rounded-xl transition-colors shrink-0"
                  >
                    {t('buttons.search')}
                  </button>
                </div>
                {loading && suppliers.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                    <p className="mt-4 text-gray-600">{t('sections.loadingSuppliers')}</p>
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                    <Users className="text-gray-400 mx-auto mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-700">{t('sections.noSuppliersFoundSearch')}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      {activeSupplierScope === 'mine'
                        ? t('sections.mySuppliersWillAppear')
                        : t('sections.discoverSuppliersWillAppear')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {suppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => setSelectedSupplierId(supplier.id)}
                          className="text-left bg-white rounded-lg border border-border p-2.5 hover:border-primary-400 hover:shadow-sm transition-all duration-150"
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-semibold text-foreground truncate leading-snug">{supplier.companyName}</h3>
                              <p className="text-xs text-muted truncate">
                                {[supplier.user?.firstName, supplier.user?.lastName].filter(Boolean).join(' ')}
                                {supplier.user?.email ? ` · ${supplier.user.email}` : ''}
                              </p>
                              {supplier.city || supplier.country ? (
                                <p className="text-xs text-muted/80 truncate">{[supplier.city, supplier.country].filter(Boolean).join(', ')}</p>
                              ) : null}
                            </div>
                            {activeSupplierScope === 'mine' && (supplier.submittedQuestionnaireCount || 0) > 0 ? (
                              <StatusBadge tone="blue">
                                {supplier.submittedQuestionnaireCount} {t('common.submitted')}
                              </StatusBadge>
                            ) : null}
                          </div>
                          {activeSupplierScope === 'mine' && supplier.relation ? (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {supplier.relation.applied ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary-50 text-primary-800 text-xs font-medium">
                                  {t('sections.supplierRelationApplied')}
                                </span>
                              ) : null}
                              {supplier.relation.invited ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-xs font-medium">
                                  {t('sections.supplierRelationInvited')}
                                </span>
                              ) : null}
                              {supplier.relation.contracted ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-xs font-medium">
                                  {t('sections.supplierRelationContracted')}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                          {(() => {
                            const turnoverLabel = formatSupplierTurnoverLabel(supplier.turnover, t);
                            const nutsLabel = (supplier.nutsCodes || [])
                              .slice(0, 2)
                              .map((n: any) => n.nameSwedish || n.name || n.code)
                              .filter(Boolean)
                              .join(', ');
                            const nutsExtra = (supplier.nutsCodes?.length || 0) > 2
                              ? ` +${supplier.nutsCodes.length - 2}`
                              : '';
                            const metaBits = [
                              turnoverLabel
                                ? `${t('forms.turnover')}: ${turnoverLabel}`
                                : null,
                              supplier.employeeCount
                                ? `${t('forms.employeeCount')}: ${supplier.employeeCount}`
                                : null,
                              supplier.registrationNumber
                                ? `${t('columns.registrationNumber')}: ${supplier.registrationNumber}`
                                : null,
                              nutsLabel ? `${nutsLabel}${nutsExtra}` : null
                            ].filter(Boolean);
                            if (!metaBits.length) return null;
                            return (
                              <div className="mt-1.5 pt-1.5 border-t border-border/60">
                                <p className="text-xs text-muted leading-snug line-clamp-2">
                                  {metaBits.join(' · ')}
                                </p>
                              </div>
                            );
                          })()}
                        </button>
                      ))}
                    </div>
                    <ListPagination
                      page={supplierPager.page}
                      pageSize={supplierPager.pageSize}
                      total={supplierPager.total}
                      onPageChange={supplierPager.setPage}
                      onPageSizeChange={supplierPager.setPageSize}
                      itemLabel={t('nav.suppliers').toLowerCase()}
                    />
                  </>
                )}
              </div>
            )}
      </PortalLayout>

      <CenterModal
        open={!!copySourceQuestionnaire}
        onClose={() => {
          if (copySaving) return;
          setCopySourceQuestionnaire(null);
        }}
        title={t('questionnaires.copyAsNew', { defaultValue: 'Copy as new' })}
        subtitle={
          copySourceQuestionnaire
            ? t('questionnaires.copySubtitle', {
                defaultValue: 'Create an unused copy of “{{title}}” for another procedure.',
                title: copySourceQuestionnaire.title,
              })
            : undefined
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-cancel px-4 py-2 rounded-xl text-sm font-semibold"
              disabled={copySaving}
              onClick={() => setCopySourceQuestionnaire(null)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50"
              disabled={copySaving}
              onClick={handleCopyQuestionnaire}
            >
              {copySaving
                ? t('common.loading', { defaultValue: 'Saving…' })
                : t('questionnaires.copyConfirm', { defaultValue: 'Create copy' })}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('questionnaires.copyNewTitle', { defaultValue: 'New questionnaire name' })}
            </label>
            <input
              className="input-brand w-full"
              value={copyTitle}
              onChange={(e) => setCopyTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              {t('questionnaires.copyNotes', { defaultValue: 'Extra notes (optional)' })}
            </label>
            <textarea
              className="input-brand w-full"
              rows={3}
              value={copyNotes}
              onChange={(e) => setCopyNotes(e.target.value)}
              placeholder={t('questionnaires.copyNotesPlaceholder', {
                defaultValue: 'Optional notes appended to the description',
              })}
            />
          </div>
          {copySourceQuestionnaire?.inUse ? (
            <p className="text-xs text-amber-800 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              {t('questionnaires.copyInUseHint', {
                defaultValue: 'Original stays linked to its procedure. This creates a separate unused copy.',
              })}
            </p>
          ) : null}
        </div>
      </CenterModal>

      {/* Create Questionnaire Modal */}
      {showCreateQuestionnaire && (
        <CreateQuestionnaireModal
          questionnaire={newQuestionnaire}
          setQuestionnaire={setNewQuestionnaire}
          cpvCodes={cpvCatalog.cpvCodes}
          cpvLoading={cpvCatalog.loading}
          onCpvSearch={handleNewQuestionnaireCpvSearch}
          updateQuestionAttachment={updateQuestionAttachment}
          onClose={() => {
            setShowCreateQuestionnaire(false);
            setNewQuestionnaire({
              title: '',
              description: '',
              deadline: '',
              cpvCodeId: '',
              questions: []
            });
          }}
          onSubmit={handleCreateQuestionnaire}
          addQuestion={addQuestion}
          updateQuestion={updateQuestion}
          removeQuestion={removeQuestion}
          addOption={addOption}
          updateOption={updateOption}
          removeOption={removeOption}
          loading={loading}
        />
      )}

      {/* View Questionnaire Modal */}
      {selectedQuestionnaire && (
        <ViewQuestionnaireModal
          questionnaire={selectedQuestionnaire}
          onClose={() => setSelectedQuestionnaire(null)}
        />
      )}

      {/* Edit Questionnaire Modal */}
      {editingQuestionnaire && (
        <EditQuestionnaireModal
          questionnaire={editingQuestionnaire}
          editLocked={editingQuestionnaire.editLocked === true}
          setQuestionnaire={setEditingQuestionnaire}
          cpvCodes={cpvCatalog.cpvCodes}
          cpvLoading={cpvCatalog.loading}
          onCpvSearch={handleEditQuestionnaireCpvSearch}
          updateQuestionAttachment={updateQuestionAttachmentInEdit}
          onClose={() => {
            setEditingQuestionnaire(null);
            fetchQuestionnaires();
          }}
          onSubmit={handleUpdateQuestionnaire}
          addQuestion={addQuestionInEdit}
          updateQuestion={updateQuestionInEdit}
          removeQuestion={removeQuestionInEdit}
          addOption={addOptionInEdit}
          updateOption={updateOptionInEdit}
          removeOption={removeOptionInEdit}
          loading={loading}
        />
      )}

      {/* View Responses Modal */}
      {viewingResponses && (
        <ViewResponsesModal
          questionnaire={viewingResponses}
          responses={questionnaireResponses}
          onClose={() => {
            setViewingResponses(null);
            setQuestionnaireResponses([]);
          }}
        />
      )}

      {/* Supplier Detail Modal (Search Suppliers) */}
      {(selectedSupplierId || selectedSupplierDetail) && (
        <SupplierDetailModal
          supplierId={selectedSupplierId}
          supplier={selectedSupplierDetail?.supplier}
          loading={supplierDetailLoading}
          onClose={() => {
            setSelectedSupplierId(null);
            setSelectedSupplierDetail(null);
          }}
        />
      )}
    </>
  );
};

// Date-only picker - custom calendar dropdown (no time, large and themed)
const DateOnlyPicker = ({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
}) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder || t('common.selectDate');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() =>
    value ? new Date(value + 'T12:00:00') : new Date()
  );
  useEffect(() => {
    if (open && value) setCurrentMonth(new Date(value + 'T12:00:00'));
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if ((e.target as HTMLElement)?.closest?.('[data-portaled-dropdown="true"]')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const start = startOfWeek(monthStart, { weekStartsOn: 1 });
  const end = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const rows: Date[][] = [];
  let day = start;
  while (day <= end) {
    rows.push(Array(7).fill(null).map(() => {
      const d = day;
      day = addDays(day, 1);
      return d;
    }));
  }

  const displayLabel = value ? format(new Date(value + 'T12:00:00'), 'EEEE, d MMM yyyy') : resolvedPlaceholder;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 min-h-[52px] hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-left"
      >
        <Calendar className="text-primary-600 flex-shrink-0" size={24} />
        <span className={value ? 'text-gray-900 font-medium' : 'text-gray-500'}>{displayLabel}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 ml-auto flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <PortaledDropdown
        open={open}
        anchorRef={containerRef}
        className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden p-4 min-w-[280px]"
      >
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label={t('datePicker.previousMonth')}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-semibold text-gray-900">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
            aria-label={t('datePicker.nextMonth')}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <table className="w-full text-center">
          <thead>
            <tr className="text-gray-500 text-xs font-medium uppercase">
              {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const).map((d) => (
                <th key={d} className="py-2">{t(`weekdays.${d}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((week, wi) => (
              <tr key={wi}>
                {week.map((d) => {
                  const sameMonth = isSameMonth(d, currentMonth);
                  const selected = value && isSameDay(d, new Date(value + 'T12:00:00'));
                  const today = isToday(d);
                  return (
                    <td key={d.toISOString()} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onChange(format(d, 'yyyy-MM-dd'));
                          setOpen(false);
                        }}
                        className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                          !sameMonth ? 'text-gray-300' : selected
                            ? 'bg-primary-600 text-white hover:bg-primary-700'
                            : today
                              ? 'bg-primary-100 text-primary-800 hover:bg-primary-200'
                              : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {format(d, 'd')}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </PortaledDropdown>
    </div>
  );
};

// Question type selector - themed dropdown list
const QUESTION_TYPE_OPTIONS = [
  { value: 'text' },
  { value: 'textarea' },
  { value: 'number' },
  { value: 'date' },
  { value: 'yes_no' },
  { value: 'radio' },
  { value: 'checkbox' },
  { value: 'dropdown' },
  { value: 'multiple_choice' }
];

const QuestionTypeSelect = ({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = QUESTION_TYPE_OPTIONS.find((o) => o.value === value) || QUESTION_TYPE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if ((e.target as HTMLElement)?.closest?.('[data-portaled-dropdown="true"]')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white hover:border-primary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 text-left"
      >
        <span className="text-gray-900 font-medium">{t(`questionTypes.${selected.value}`)}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <PortaledDropdown
        open={open}
        anchorRef={containerRef}
        className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden py-1 max-h-64 overflow-y-auto"
      >
        {QUESTION_TYPE_OPTIONS.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => {
              onChange(type.value);
              setOpen(false);
            }}
            className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
              value === type.value
                ? 'bg-primary-50 text-primary-800 font-medium'
                : 'text-gray-700 hover:bg-primary-50/60'
            }`}
          >
            {t(`questionTypes.${type.value}`)}
          </button>
        ))}
      </PortaledDropdown>
    </div>
  );
};

// Create Questionnaire Modal Component
const CreateQuestionnaireModal = ({
  questionnaire,
  setQuestionnaire,
  cpvCodes,
  cpvLoading = false,
  onCpvSearch,
  updateQuestionAttachment,
  onClose,
  onSubmit,
  addQuestion,
  updateQuestion,
  removeQuestion,
  addOption,
  updateOption,
  removeOption,
  loading
}: any) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-gradient-to-r from-white to-primary-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{t('actions.createQuestionnaire')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('sections.createQuestionnaireSubtitle')}</p>
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
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-gray-900">{t('sections.basicInformation')}</h4>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('columns.title')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={questionnaire.title || ''}
                onChange={(e) => setQuestionnaire({ ...questionnaire, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                placeholder={t('placeholders.enterQuestionnaireTitle')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.description')}</label>
              <textarea
                value={questionnaire.description || ''}
                onChange={(e) => setQuestionnaire({ ...questionnaire, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                placeholder={t('placeholders.enterQuestionnaireDescription')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('forms.selectCPVCode')} <span className="text-red-500">*</span>
                </label>
                <CpvSearchSelect
                  cpvCodes={cpvCodes}
                  value={questionnaire.cpvCodeId || ''}
                  onChange={(cpvCodeId) => setQuestionnaire({ ...questionnaire, cpvCodeId })}
                  onSearch={onCpvSearch}
                  loading={cpvLoading}
                  placeholder={t('forms.selectCPVCode')}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('forms.deadlineDateOnly')} <span className="text-red-500">*</span>
                </label>
                <DateOnlyPicker
                  value={questionnaire.deadline ? questionnaire.deadline.slice(0, 10) : ''}
                  onChange={(d) => setQuestionnaire({ ...questionnaire, deadline: d ? `${d}T23:59:59` : '' })}
                  placeholder={t('forms.selectDeadlineDate')}
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-gray-900">{t('sections.questionsSection')}</h4>
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-all duration-200 font-medium text-sm"
              >
                <Plus size={16} />
                {t('sections.addQuestion')}
              </button>
            </div>

            {!questionnaire.questions || questionnaire.questions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <FileText className="text-gray-400 mx-auto mb-2" size={32} />
                <p className="text-sm text-gray-500">{t('sections.noQuestionsYet')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questionnaire.questions.map((question: Question, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-700">
                          {t('sections.questionNumber', { n: index + 1 })}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{t('sections.sortNo')}</span>
                          <input
                            type="number"
                            min={1}
                            className="w-16 px-2 py-1 border border-gray-300 rounded"
                            value={question.order ?? index + 1}
                            onChange={(e) =>
                              updateQuestion(index, 'order', Number(e.target.value) || index + 1)
                            }
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeQuestion(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-all duration-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.questionText')}</label>
                        <input
                          type="text"
                          value={question.questionText || ''}
                          onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                          placeholder={t('placeholders.enterQuestionText')}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.questionType')}</label>
                          <QuestionTypeSelect
                            value={question.questionType || 'text'}
                            onChange={(v) => updateQuestion(index, 'questionType', v)}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={question.isRequired !== undefined ? question.isRequired : true}
                              onChange={(e) => updateQuestion(index, 'isRequired', e.target.checked)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm font-semibold text-gray-700">{t('forms.required')}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={question.requiresDocument || false}
                              onChange={(e) => updateQuestion(index, 'requiresDocument', e.target.checked)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm font-semibold text-gray-700">{t('forms.requiresDocument')}</span>
                          </label>
                        </div>
                      </div>
                      {question.requiresDocument && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.documentType')}</label>
                          <input
                            type="text"
                            value={question.documentType || ''}
                            onChange={(e) => updateQuestion(index, 'documentType', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                            placeholder={t('placeholders.documentTypeExample')}
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('questionnaire.attachDocumentToQuestion')}</label>
                        {question.attachedDocument ? (
                          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-700">
                              <FileText size={18} />
                              <span className="text-sm font-medium truncate">{question.attachedDocument.fileName}</span>
                              <a
                                href={uploadsUrl(question.attachedDocument.filePath.replace(/^.*[\\/]/, '')) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary-600 hover:underline text-sm"
                              >
                                {t('questionnaire.view')}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateQuestionAttachment(index, null)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('questionnaire.deleteAttachment')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('documentType', 'question_attachment');
                                const res = await api.post('/documents/procuring-entity', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                const doc = res.data.document;
                                updateQuestionAttachment(index, { id: doc.id, fileName: doc.fileName, filePath: doc.filePath });
                                showToast(t('questionnaire.documentAttached'), 'success');
                              } catch (err: any) {
                                showToast(err.response?.data?.message || t('msg.failedUploadDocument'), 'error');
                              }
                              e.target.value = '';
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                          />
                        )}
                        <p className="mt-1 text-xs text-gray-500">{t('questionnaire.attachDocumentHint')}</p>
                      </div>
                      {(question.questionType === 'radio' || question.questionType === 'checkbox' || question.questionType === 'dropdown' || question.questionType === 'multiple_choice') && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-gray-700">{t('forms.options')}</label>
                            <button
                              onClick={() => addOption(index)}
                              className="flex items-center gap-1 px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-all duration-200 text-sm font-medium"
                            >
                              <Plus size={14} />
                              {t('sections.addOption')}
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(question.options || []).map((option: string, optIndex: number) => (
                              <div key={optIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={option || ''}
                                  onChange={(e) => updateOption(index, optIndex, e.target.value)}
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                  placeholder={t('placeholders.optionNumber', { n: optIndex + 1 })}
                                />
                                <button
                                  onClick={() => removeOption(index, optIndex)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/50">
            <button
              onClick={onClose}
              className="btn-cancel px-6 py-2.5 rounded-xl font-semibold transition-all duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="btn-save px-6 py-2.5 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('actions.creating')}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {t('actions.createQuestionnaire')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// View Questionnaire Modal
const ViewQuestionnaireModal = ({ questionnaire, onClose }: { questionnaire: Questionnaire; onClose: () => void }) => {
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
              <h3 className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{questionnaire.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{questionnaire.cpvCode?.code} - {questionnaire.cpvCode?.description}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {questionnaire.description && (
            <p className="text-gray-700">{questionnaire.description}</p>
          )}
          <div className="space-y-4">
            {questionnaire.questions?.map((question, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-2">{question.questionText}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{t(`questionTypes.${question.questionType}`, { defaultValue: question.questionType })}</span>
                      {question.isRequired && <span className="px-2 py-1 bg-red-100 text-red-700 rounded">{t('forms.required')}</span>}
                      {question.requiresDocument && <span className="px-2 py-1 bg-green-100 text-green-700 rounded">{t('forms.requiresDocument')}</span>}
                    </div>
                    {question.options && question.options.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 mb-1">{t('forms.options')}:</p>
                        <ul className="list-disc list-inside text-sm text-gray-700">
                          {question.options.map((opt, optIdx) => (
                            <li key={optIdx}>{opt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit Questionnaire Modal Component
const EditQuestionnaireModal = ({
  questionnaire,
  editLocked = false,
  setQuestionnaire,
  cpvCodes,
  cpvLoading = false,
  onCpvSearch,
  updateQuestionAttachment,
  onClose,
  onSubmit,
  addQuestion,
  updateQuestion,
  removeQuestion,
  addOption,
  updateOption,
  removeOption,
  loading
}: any) => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  if (!questionnaire) {
    console.error('EditQuestionnaireModal: No questionnaire provided');
    return null;
  }

  // Ensure questionnaire has required structure
  const safeQuestionnaire = {
    ...questionnaire,
    title: questionnaire.title || '',
    description: questionnaire.description || '',
    deadline: questionnaire.deadline || '',
    cpvCodeId: questionnaire.cpvCodeId || '',
    questions: Array.isArray(questionnaire.questions) ? questionnaire.questions : []
  };

  // Provide default functions if props are missing (shouldn't happen, but safety check)
  const safeAddQuestion = addQuestion || (() => console.error('addQuestion not provided'));
  const safeUpdateQuestion = updateQuestion || ((_i: number, _f: string, _v: any) => console.error('updateQuestion not provided'));
  const safeRemoveQuestion = removeQuestion || ((_i: number) => console.error('removeQuestion not provided'));
  const safeAddOption = addOption || ((_i: number) => console.error('addOption not provided'));
  const safeUpdateOption = updateOption || ((_qi: number, _oi: number, _v: string) => console.error('updateOption not provided'));
  const safeRemoveOption = removeOption || ((_qi: number, _oi: number) => console.error('removeOption not provided'));

  // Convert deadline to datetime-local format for editing
  const formatDeadlineForInput = (deadline: string) => {
    if (!deadline) return '';
    try {
      const date = new Date(deadline);
      if (isNaN(date.getTime())) {
        return deadline;
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return deadline;
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-gradient-to-r from-white to-primary-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{t('actions.updateQuestionnaire')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('sections.editQuestionnaireSubtitle')}</p>
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
          {editLocked ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {t('entityPortal.questionnaireEditLocked')}
            </div>
          ) : null}
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-gray-900">{t('sections.basicInformation')}</h4>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('columns.title')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={safeQuestionnaire.title}
                disabled={editLocked}
                onChange={(e) => setQuestionnaire({ ...safeQuestionnaire, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder={t('placeholders.enterQuestionnaireTitle')}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.description')}</label>
              <textarea
                value={safeQuestionnaire.description}
                onChange={(e) => setQuestionnaire({ ...safeQuestionnaire, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                placeholder={t('placeholders.enterQuestionnaireDescription')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('forms.selectCPVCode')} <span className="text-red-500">*</span>
                </label>
                <CpvSearchSelect
                  cpvCodes={cpvCodes}
                  value={safeQuestionnaire.cpvCodeId}
                  onChange={(cpvCodeId) => setQuestionnaire({ ...safeQuestionnaire, cpvCodeId })}
                  onSearch={onCpvSearch}
                  loading={cpvLoading}
                  placeholder={t('forms.selectCPVCode')}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('forms.deadlineDateOnly')} <span className="text-red-500">*</span>
                </label>
                <DateOnlyPicker
                  value={formatDeadlineForInput(safeQuestionnaire.deadline).slice(0, 10)}
                  onChange={(d) => setQuestionnaire({ ...safeQuestionnaire, deadline: d ? `${d}T23:59:59` : '' })}
                  placeholder={t('forms.selectDeadlineDate')}
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-base font-bold text-gray-900">{t('sections.questionsSection')}</h4>
              <button
                onClick={safeAddQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-all duration-200 font-medium text-sm"
              >
                <Plus size={16} />
                {t('sections.addQuestion')}
              </button>
            </div>

            {safeQuestionnaire.questions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                <FileText className="text-gray-400 mx-auto mb-2" size={32} />
                <p className="text-sm text-gray-500">{t('sections.noQuestionsYet')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {safeQuestionnaire.questions.map((question: Question, index: number) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-700">
                          {t('sections.questionNumber', { n: index + 1 })}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{t('sections.sortNo')}</span>
                          <input
                            type="number"
                            min={1}
                            className="w-16 px-2 py-1 border border-gray-300 rounded"
                            value={question.order ?? index + 1}
                            onChange={(e) =>
                              safeUpdateQuestion(index, 'order', Number(e.target.value) || index + 1)
                            }
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => safeRemoveQuestion(index)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-all duration-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.questionText')}</label>
                        <input
                          type="text"
                          value={question.questionText || ''}
                          onChange={(e) => safeUpdateQuestion(index, 'questionText', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                          placeholder={t('placeholders.enterQuestionText')}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.questionType')}</label>
                          <QuestionTypeSelect
                            value={question.questionType || 'text'}
                            onChange={(v) => safeUpdateQuestion(index, 'questionType', v)}
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={question.isRequired !== undefined ? question.isRequired : true}
                              onChange={(e) => safeUpdateQuestion(index, 'isRequired', e.target.checked)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm font-semibold text-gray-700">{t('forms.required')}</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={question.requiresDocument || false}
                              onChange={(e) => safeUpdateQuestion(index, 'requiresDocument', e.target.checked)}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm font-semibold text-gray-700">{t('forms.requiresDocument')}</span>
                          </label>
                        </div>
                      </div>
                      {question.requiresDocument && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.documentType')}</label>
                          <input
                            type="text"
                            value={question.documentType || ''}
                            onChange={(e) => safeUpdateQuestion(index, 'documentType', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                            placeholder={t('placeholders.documentTypeExample')}
                          />
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">{t('questionnaire.attachDocumentToQuestion')}</label>
                        {(question.attachedDocument || question.attachedDocumentId) ? (
                          <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                            <div className="flex items-center gap-2 text-gray-700">
                              <FileText size={18} />
                              <span className="text-sm font-medium truncate">
                                {question.attachedDocument?.fileName || t('questionnaire.attachedFile')}
                              </span>
                              {question.attachedDocument?.filePath && (
                                <a
                                  href={uploadsUrl(question.attachedDocument.filePath.replace(/^.*[\\/]/, '')) || '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:underline text-sm"
                                >
                                  {t('questionnaire.view')}
                                </a>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                const docId = question.attachedDocument?.id || question.attachedDocumentId;
                                if (!docId) return;
                                try {
                                  await api.delete(`/documents/${docId}`);
                                  updateQuestionAttachment(index, null);
                                  showToast(t('questionnaire.documentDeleted'), 'success');
                                } catch (err: any) {
                                  showToast(err.response?.data?.message || t('msg.failedDeleteDocument'), 'error');
                                }
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title={t('questionnaire.deleteAttachment')}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file || !updateQuestionAttachment) return;
                              try {
                                const formData = new FormData();
                                formData.append('file', file);
                                formData.append('documentType', 'question_attachment');
                                const res = await api.post('/documents/procuring-entity', formData, {
                                  headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                const doc = res.data.document;
                                updateQuestionAttachment(index, { id: doc.id, fileName: doc.fileName, filePath: doc.filePath });
                                showToast(t('questionnaire.documentAttached'), 'success');
                              } catch (err: any) {
                                showToast(err.response?.data?.message || t('msg.failedUploadDocument'), 'error');
                              }
                              e.target.value = '';
                            }}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                          />
                        )}
                        <p className="mt-1 text-xs text-gray-500">{t('questionnaire.attachDocumentHint')}</p>
                      </div>
                      {(question.questionType === 'radio' || question.questionType === 'checkbox' || question.questionType === 'dropdown' || question.questionType === 'multiple_choice') && (
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-semibold text-gray-700">{t('forms.options')}</label>
                            <button
                              onClick={() => safeAddOption(index)}
                              className="flex items-center gap-1 px-3 py-1 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-all duration-200 text-sm font-medium"
                            >
                              <Plus size={14} />
                              {t('sections.addOption')}
                            </button>
                          </div>
                          <div className="space-y-2">
                            {(question.options || []).map((option: string, optIndex: number) => (
                              <div key={optIndex} className="flex gap-2">
                                <input
                                  type="text"
                                  value={option || ''}
                                  onChange={(e) => safeUpdateOption(index, optIndex, e.target.value)}
                                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                                  placeholder={t('placeholders.optionNumber', { n: optIndex + 1 })}
                                />
                                <button
                                  onClick={() => safeRemoveOption(index, optIndex)}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/50">
            <button
              onClick={onClose}
              className="btn-cancel px-6 py-2.5 rounded-xl font-semibold transition-all duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onSubmit}
              disabled={loading || editLocked}
              className="btn-update px-6 py-2.5 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('actions.updating')}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {t('actions.updateQuestionnaire')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// View Responses Modal
const ViewResponsesModal = ({ questionnaire, responses, onClose }: { questionnaire: Questionnaire; responses: any[]; onClose: () => void }) => {
  const { t } = useTranslation();
  const [expandedResponseId, setExpandedResponseId] = useState<string | null>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-gradient-to-r from-white to-primary-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{questionnaire.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('sections.submittedResponseCount', { count: responses.length })}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-3">
          {responses.length === 0 ? (
            <div className="text-center py-16">
              <Users className="text-gray-400 mx-auto mb-4" size={48} />
              <p className="text-lg font-semibold text-gray-700">{t('sections.noResponsesYet')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('sections.noResponsesHint')}</p>
            </div>
          ) : (
            responses.map((response) => {
              const expanded = expandedResponseId === response.id;
              return (
              <div key={response.id} className="bg-gradient-to-br from-white to-primary-50/30 rounded-xl border border-gray-200/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedResponseId(expanded ? null : response.id)}
                  className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left hover:bg-primary-50/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-bold text-gray-900">
                      {response.supplier?.user?.firstName} {response.supplier?.user?.lastName}
                    </h4>
                    <p className="text-sm text-gray-600 truncate">{response.supplier?.user?.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {t('sections.submittedAtLabel', {
                        date: response.submittedAt ? new Date(response.submittedAt).toLocaleString() : t('common.na')
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      {t('common.submitted')}
                    </span>
                    {expanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" aria-hidden />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" aria-hidden />
                    )}
                  </div>
                </button>
                {expanded ? (
                <div className="px-4 sm:px-6 pb-6 pt-0 border-t border-gray-200/80 space-y-4">
                  {(() => {
                    // Map answers by questionId so we can render them in the same order as questionnaire.questions
                    const answerMap = new Map<string, any>();
                    (response.answers || []).forEach((a: any) => {
                      if (a && a.questionId) {
                        answerMap.set(String(a.questionId), a);
                      }
                    });

                    if (!questionnaire.questions || questionnaire.questions.length === 0) {
                      return (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm text-gray-500 italic">{t('sections.noQuestionsYet')}</p>
                        </div>
                      );
                    }

                    return questionnaire.questions.map((question: Question, index: number) => {
                      const answer = answerMap.get(String(question.id));
                      const raw = answer?.answerText ?? answer?.answerValue ?? '';
                      const isDate = question.questionType === 'date';
                      const displayText = isDate && raw
                        ? (typeof raw === 'string' && raw.length >= 10
                            ? (() => {
                                const s = raw.slice(0, 10);
                                const [y, m, d] = s.split('-').map(Number);
                                return new Date(y, m - 1, d).toLocaleDateString();
                              })()
                            : String(raw))
                        : (raw ? String(raw) : '');

                      return (
                        <div key={question.id || index} className="bg-gray-50 rounded-lg p-4">
                          <p className="font-semibold text-gray-900 mb-2">{question.questionText}</p>
                          <div className="mt-2">
                            {displayText && (
                              <p className="text-gray-700">{displayText}</p>
                            )}
                            {!displayText && !answer?.document && (
                              <p className="text-gray-500 italic">{t('common.noAnswerProvided')}</p>
                            )}
                            {answer?.document && (
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
                        </div>
                      );
                    });
                  })()}
                </div>
                ) : null}
              </div>
            );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// Supplier Detail Modal – marketplace profile only (bid responses belong under questionnaires / procedures)
const SupplierDetailModal = ({
  supplierId: _supplierId,
  supplier,
  loading,
  onClose
}: {
  supplierId: string | null;
  supplier: any;
  loading: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const PROFILE_DOC_TYPES_BY_QUESTION: Record<string, string> = {
    q2: 'q2-financial',
    q5: 'q5-quality',
    q6: 'q6-environment',
    q7: 'q7-social',
    q8: 'q8-ohs'
  };

  const getQuestionDocuments = (questionKey: string) => {
    const docType = PROFILE_DOC_TYPES_BY_QUESTION[questionKey];
    if (!docType) return [];
    return (supplier?.documents || []).filter((d: any) => d.documentType === docType);
  };

  const formatTurnoverDisplay = (raw: unknown) => {
    if (raw == null || raw === '') return '';
    const num = typeof raw === 'number' ? raw : parseFloat(String(raw));
    if (!Number.isNaN(num)) {
      const match = TURNOVER_SEARCH_OPTIONS.find(
        (o) => o.value && num >= o.min && num <= o.max
      );
      if (match) return t(match.labelKey);
    }
    return String(raw);
  };

  type ProfileFieldRow = { key: string; label: string; value: string; wide?: boolean };

  const profileSections: {
    id: string;
    title: string;
    icon: LucideIcon;
    fields: ProfileFieldRow[];
  }[] = [
    {
      id: 'financial',
      title: t('supplierPortal.profileTabs.financial'),
      icon: Wallet,
      fields: [
        { key: 'q1', label: t('commonQuestions.q1Field'), value: formatTurnoverDisplay(supplier?.turnover) },
        { key: 'q2', label: t('commonQuestions.q2Field'), value: supplier?.financialStability || '', wide: true }
      ]
    },
    {
      id: 'certifications',
      title: t('supplierPortal.profileTabs.certifications'),
      icon: Award,
      fields: [
        { key: 'q5', label: t('commonQuestions.q5Field'), value: supplier?.qualityManagementSystem || '', wide: true },
        { key: 'q6', label: t('commonQuestions.q6Field'), value: supplier?.environmentalManagementSystem || '', wide: true },
        { key: 'q7', label: t('commonQuestions.q7Field'), value: supplier?.socialResponsibilityManagementSystem || '', wide: true },
        { key: 'q8', label: t('commonQuestions.q8Field'), value: supplier?.ohsManagementSystem || '', wide: true }
      ]
    },
    {
      id: 'compliance',
      title: t('supplierPortal.profileTabs.compliance'),
      icon: Shield,
      fields: [
        { key: 'q9', label: t('commonQuestions.q9Field'), value: supplier?.groundsForExclusion || '', wide: true },
        { key: 'q10', label: t('commonQuestions.q10Field'), value: supplier?.laborLawRegulations || '', wide: true },
        { key: 'q11', label: t('commonQuestions.q11Field'), value: supplier?.sanctionsRussiaBelarus || '', wide: true }
      ]
    },
    {
      id: 'references',
      title: t('supplierPortal.profileTabs.references'),
      icon: Users,
      fields: [
        {
          key: 'q12',
          label: t('commonQuestions.q12Field'),
          value: supplier?.technicalCapacityProfessionalExperience || '',
          wide: true
        }
      ]
    }
  ].map((section) => ({
    ...section,
    fields: section.fields.filter((f) => {
      const hasText = String(f.value || '').trim().length > 0;
      const hasDocs = getQuestionDocuments(f.key).length > 0;
      return hasText || hasDocs;
    })
  })).filter((section) => section.fields.length > 0);

  const renderFieldDocs = (questionKey: string) => {
    const qDocs = getQuestionDocuments(questionKey);
    if (!qDocs.length) return null;
    return (
      <div className="mt-2 flex flex-wrap gap-1.5">
        {qDocs.map((doc: any) => (
          <a
            key={doc.id}
            href={uploadsUrl(doc.filePath.replace(/^.*[\\\/]/, '')) || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs hover:underline"
          >
            <FileText size={13} />
            {doc.fileName}
          </a>
        ))}
      </div>
    );
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-white to-primary-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg flex items-center justify-between z-10">
          <h3 className="text-base font-bold text-gray-900">{t('sections.supplierProfile')}</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-600">{t('common.loading')}</p>
            </div>
          ) : supplier ? (
            <div className="space-y-5">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={20} />
                  {t('sections.basicData')}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">{t('common.company')}</span><p className="font-medium text-gray-900">{supplier.companyName}</p></div>
                  <div><span className="text-gray-500">{t('common.contact')}</span><p className="font-medium text-gray-900">{supplier.user?.firstName} {supplier.user?.lastName}</p></div>
                  <div><span className="text-gray-500">{t('common.email')}</span><p className="font-medium text-gray-900">{supplier.user?.email}</p></div>
                  {supplier.user?.phone && <div><span className="text-gray-500">{t('common.phone')}</span><p className="font-medium text-gray-900">{supplier.user.phone}</p></div>}
                  {supplier.registrationNumber && <div><span className="text-gray-500">{t('columns.registrationNumber')}</span><p className="font-medium text-gray-900">{supplier.registrationNumber}</p></div>}
                  {(supplier.address || supplier.city || supplier.country) && (
                    <div className="sm:col-span-2"><span className="text-gray-500">{t('common.address')}</span><p className="font-medium text-gray-900">{[supplier.address, supplier.city, supplier.country].filter(Boolean).join(', ')}</p></div>
                  )}
                  {supplier.cpvCodes?.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block mb-2">{t('sections.cpvCodesLabel')}</span>
                      <div className="flex flex-wrap gap-2">
                        {supplier.cpvCodes.map((c: any) => (
                          <span
                            key={c.id}
                            className="inline-flex flex-col px-3 py-1.5 rounded-lg bg-primary-50 border border-primary-100 text-primary-800"
                            title={c.description}
                          >
                            <span className="font-semibold text-sm">{c.code}</span>
                            {c.description && <span className="text-xs text-primary-700/90 truncate max-w-[200px]">{c.description}</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {supplier.nutsCodes?.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block mb-2">{t('sections.nutsCodesLabel')}</span>
                      <div className="flex flex-wrap gap-2">
                        {supplier.nutsCodes.map((nuts: any) => (
                          <span
                            key={nuts.id}
                            className="inline-flex flex-col px-3 py-1.5 rounded-lg bg-purple-50 border border-purple-100 text-purple-800"
                            title={nuts.nameSwedish || nuts.name}
                          >
                            <span className="font-semibold text-sm">{nuts.code}</span>
                            <span className="text-xs text-purple-700/90 truncate max-w-[200px]">{nuts.nameSwedish || nuts.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {profileSections.map((section) => {
                const Icon = section.icon;
                return (
                  <div key={section.id} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Icon size={20} />
                      {section.title}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      {section.fields.map((field) => (
                        <div key={field.key} className={field.wide ? 'sm:col-span-2' : undefined}>
                          <span className="text-gray-500">{field.label}</span>
                          {String(field.value || '').trim().length > 0 ? (
                            <p className="font-medium text-gray-900 whitespace-pre-wrap mt-0.5">{field.value}</p>
                          ) : null}
                          {renderFieldDocs(field.key)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">{t('sections.noSupplierData')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcuringEntityDashboard;
