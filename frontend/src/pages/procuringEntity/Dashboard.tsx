import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { 
  LogOut, FileText, Search, Bell, User, Plus, Edit2, Trash2, Eye, 
  Upload, X, Calendar, Building2, Save, XCircle,
  CheckCircle, ChevronDown, ChevronLeft, ChevronRight, Users, Power, PowerOff
} from 'lucide-react';

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
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  expiryDate: string;
  targetAudience: string;
  createdAt: string;
}

const ProcuringEntityDashboard = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('questionnaires');
  const [loading, setLoading] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
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
  
  // Questionnaire state
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [showCreateQuestionnaire, setShowCreateQuestionnaire] = useState(false);
  const [newQuestionnaire, setNewQuestionnaire] = useState({
    title: '',
    description: '',
    deadline: '',
    cpvCodeId: '',
    questions: [] as Question[]
  });
  const [cpvCodes, setCpvCodes] = useState<CPVCode[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<Questionnaire | null>(null);
  const [viewingResponses, setViewingResponses] = useState<Questionnaire | null>(null);
  const [questionnaireResponses, setQuestionnaireResponses] = useState<any[]>([]);
  
  // Announcements state
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Search Suppliers state
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierCpvFilter, setSupplierCpvFilter] = useState('');
  const [suppliersPagination, setSuppliersPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 0 });
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState<any>(null);
  const [supplierDetailLoading, setSupplierDetailLoading] = useState(false);

  // Fetch profile and documents
  const fetchProfile = async () => {
    try {
      setLoading(true);
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
      showToast(error.response?.data?.message || t('msg.failedFetchProfile'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch questionnaires
  const fetchQuestionnaires = async () => {
    try {
      setLoading(true);
      const response = await api.get('/questionnaires');
      setQuestionnaires(response.data.questionnaires || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedFetchQuestionnaires'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch CPV codes (limit so large lists don't timeout)
  const fetchCPVCodes = async (searchTerm?: string) => {
    try {
      const params: Record<string, string> = { limit: '2000' };
      if (searchTerm && searchTerm.trim()) params.search = searchTerm.trim();
      const response = await api.get('/cpv', { params });
      const list = response.data.cpvCodes || [];
      setCpvCodes(Array.isArray(list) ? list : []);
    } catch (error: any) {
      console.error('Failed to fetch CPV codes:', error);
      showToast(error.response?.data?.message || 'Failed to load CPV codes', 'error');
      setCpvCodes([]);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/announcements');
      setAnnouncements(response.data.announcements || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedFetchAnnouncements'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch suppliers (approved who submitted to this entity's questionnaires)
  const fetchSuppliers = async (page = 1) => {
    try {
      setLoading(true);
      const params: any = { page, limit: 12 };
      if (supplierSearch.trim()) params.search = supplierSearch.trim();
      if (supplierCpvFilter) params.cpvCodeId = supplierCpvFilter;
      const response = await api.get('/procuring-entity/suppliers', { params });
      setSuppliers(response.data.suppliers || []);
      setSuppliersPagination(response.data.pagination || { page: 1, limit: 12, total: 0, totalPages: 0 });
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedFetchSuppliers'), 'error');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

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

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfile();
    } else if (activeTab === 'questionnaires') {
      fetchQuestionnaires();
      fetchCPVCodes();
    } else if (activeTab === 'suppliers') {
      fetchSuppliers(1);
      fetchCPVCodes();
    } else if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeTab]);

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
    if (!newQuestionnaire.title || !newQuestionnaire.deadline || !newQuestionnaire.cpvCodeId) {
      showToast(t('msg.fillRequiredFields'), 'error');
      return;
    }

    if (newQuestionnaire.questions.length === 0) {
      showToast(t('msg.addAtLeastOneQuestion'), 'error');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: newQuestionnaire.title.trim(),
        description: newQuestionnaire.description?.trim() || '',
        deadline: newQuestionnaire.deadline,
        cpvCodeId: newQuestionnaire.cpvCodeId,
        questions: newQuestionnaire.questions.map((q, index) => {
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
            order: q.order !== undefined ? q.order : index
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
    
    if (!editingQuestionnaire.title || !editingQuestionnaire.deadline || !editingQuestionnaire.cpvCodeId) {
      showToast(t('msg.fillRequiredFields'), 'error');
      return;
    }

    if (editingQuestionnaire.questions.length === 0) {
      showToast(t('msg.addAtLeastOneQuestion'), 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare questions data - remove IDs and ensure proper structure for all question types
      const questionsData = editingQuestionnaire.questions.map((q, index) => {
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
          order: q.order !== undefined ? q.order : index
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

  // Fetch questionnaire responses
  const fetchQuestionnaireResponses = async (questionnaireId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/questionnaires/${questionnaireId}/responses`);
      setQuestionnaireResponses(response.data.responses || []);
      setViewingResponses(questionnaires.find(q => q.id === questionnaireId) || null);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedFetchResponses'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
        <div className="w-full mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                PrequaliQ
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <button
                onClick={() => setActiveTab('profile')}
                className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200/50 hover:from-primary-100 hover:to-blue-100 transition-all duration-200 cursor-pointer"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{t('nav.procuringEntity')}</p>
                </div>
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200 font-medium"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">{t('common.logout')}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="w-full mx-auto px-5 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-white/50 mb-6">
          <div className="border-b border-gray-200/50">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab('questionnaires')}
                className={`relative py-4 px-3 font-semibold text-sm flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'questionnaires'
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {activeTab === 'questionnaires' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-full"></span>
                )}
                <FileText className={activeTab === 'questionnaires' ? 'text-primary-600' : 'text-gray-400'} size={20} />
                {t('nav.questionnaires')}
              </button>
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`relative py-4 px-3 font-semibold text-sm flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'suppliers'
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {activeTab === 'suppliers' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-full"></span>
                )}
                <Search className={activeTab === 'suppliers' ? 'text-primary-600' : 'text-gray-400'} size={20} />
                {t('nav.searchSuppliers')}
              </button>
              <button
                onClick={() => setActiveTab('announcements')}
                className={`relative py-4 px-3 font-semibold text-sm flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'announcements'
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {activeTab === 'announcements' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-full"></span>
                )}
                <Bell className={activeTab === 'announcements' ? 'text-primary-600' : 'text-gray-400'} size={20} />
                {t('nav.announcementsTab')}
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`relative py-4 px-3 font-semibold text-sm flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'profile'
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {activeTab === 'profile' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-full"></span>
                )}
                <User className={activeTab === 'profile' ? 'text-primary-600' : 'text-gray-400'} size={20} />
                {t('nav.profile')}
              </button>
            </nav>
          </div>

          <div className="px-2 py-6">
            {/* Questionnaires Tab */}
            {activeTab === 'questionnaires' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('sections.questionnaireManagement')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('dashboard.createAndManageQuestionnaires')}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateQuestionnaire(true);
                      fetchCPVCodes();
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  >
                    <Plus size={20} />
                    {t('dashboard.createQuestionnaire')}
                  </button>
                </div>

                {questionnaires.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <FileText className="text-gray-400 mx-auto mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-700">{t('sections.noQuestionnairesFound')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('sections.createFirstQuestionnaire')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questionnaires.map((questionnaire) => (
                      <div
                        key={questionnaire.id}
                        className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{questionnaire.title}</h3>
                            {questionnaire.description && (
                              <p className="text-gray-600 mb-3">{questionnaire.description}</p>
                            )}
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Building2 size={16} />
                                {questionnaire.cpvCode?.code} - {questionnaire.cpvCode?.description}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={16} />
                                {t('columns.deadline')}: {new Date(questionnaire.deadline).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <FileText size={16} />
                                {questionnaire.questions?.length || 0} {t('sections.questionsCount')}
                              </span>
                              {questionnaire.responses && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle size={16} />
                                  {questionnaire.responses.length} responses
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setSelectedQuestionnaire(questionnaire)}
                              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2"
                            >
                              <Eye size={16} />
                              View
                            </button>
                            <button
                              onClick={() => {
                                try {
                                  console.log('Edit clicked for questionnaire:', questionnaire);
                                  
                                  // Prepare questionnaire for editing - ensure questions have proper structure
                                  const questionsForEdit = (questionnaire.questions || []).map((q: Question, index: number) => ({
                                    id: q.id, // Keep ID for reference but backend will ignore it
                                    questionText: q.questionText || '',
                                    questionType: q.questionType || 'text',
                                    options: Array.isArray(q.options) ? q.options : [],
                                    isRequired: q.isRequired !== undefined ? q.isRequired : true,
                                    requiresDocument: q.requiresDocument || false,
                                    documentType: q.documentType || '',
                                    order: q.order !== undefined ? q.order : index
                                  }));

                                  // Convert deadline to datetime-local format
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
                                    isActive: questionnaire.isActive !== undefined ? questionnaire.isActive : true
                                  };
                                  
                                  console.log('Setting questionnaire for edit:', qToEdit);
                                  setEditingQuestionnaire(qToEdit);
                                  fetchCPVCodes();
                                } catch (error: any) {
                                  console.error('Error preparing questionnaire for edit:', error);
                                  showToast(`${t('msg.errorPreparingQuestionnaire')}: ${error.message}`, 'error');
                                }
                              }}
                              className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2"
                            >
                              <Edit2 size={16} />
                              {t('buttons.editQuestionnaire')}
                            </button>
                            {questionnaire.responses && questionnaire.responses.length > 0 && (
                              <button
                                onClick={() => fetchQuestionnaireResponses(questionnaire.id)}
                                className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2"
                              >
                                <Users size={16} />
                                Responses ({questionnaire.responses.length})
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleQuestionnaireStatus(questionnaire.id, questionnaire.isActive ?? false)}
                              className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2 ${
                                questionnaire.isActive
                                  ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                                  : 'bg-green-50 hover:bg-green-100 text-green-700'
                              }`}
                            >
                              {questionnaire.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                              {questionnaire.isActive ? t('buttons.deactivate') : t('buttons.activate')}
                            </button>
                            {(!questionnaire.responses || questionnaire.responses.length === 0 || questionnaire.responses.every((r: any) => r.status === 'draft')) && (
                              <button
                                onClick={() => handleDeleteQuestionnaire(questionnaire.id)}
                                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('common.profile')} Management</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('dashboard.manageProfileEntity')}</p>
                  </div>
                  {!editingProfile && (
                    <button
                      onClick={() => setEditingProfile(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                    >
                      <Edit2 size={20} />
                      {t('actions.editProfile')}
                    </button>
                  )}
                </div>

                {loading && !profile ? (
                  <div className="text-center py-16">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                      <p className="mt-6 text-gray-600 font-medium">{t('dashboard.loadingProfile')}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Information */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-gray-200/50">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">{t('common.profile')} Information</h3>
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
                                {profileData.firstName || 'N/A'}
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
                                {profileData.lastName || 'N/A'}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.email')}</label>
                            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                              {profileData.email || 'N/A'}
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
                                {profileData.phone || 'N/A'}
                              </div>
                            )}
                          </div>
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
                                {profileData.entityName || 'N/A'}
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
                                {profileData.address || 'N/A'}
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
                                {profileData.city || 'N/A'}
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
                                {profileData.country || 'N/A'}
                              </div>
                            )}
                          </div>
                        </div>
                        {editingProfile && (
                          <div className="flex gap-3 mt-6">
                            <button
                              onClick={handleUpdateProfile}
                              disabled={loading}
                              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
                            >
                              <Save size={18} />
                              {t('actions.saveChanges')}
                            </button>
                            <button
                              onClick={() => {
                                setEditingProfile(false);
                                fetchProfile();
                              }}
                              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Documents */}
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-gray-200/50">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-gray-900">{t('sections.documents')}</h3>
                          <label className="cursor-pointer">
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
                          <div className="text-center py-8 text-gray-500">
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
                                    href={`${import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads'}/${doc.filePath.replace(/^.*[\\\/]/, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                                    title={t('sections.viewDownload')}
                                  >
                                    <Eye size={16} />
                                  </a>
                                  <button
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
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('sections.announcements')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('sections.viewAnnouncementsEntity')}</p>
                </div>
                {announcements.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <Bell className="text-gray-400 mx-auto mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-700">{t('sections.noAnnouncements')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('sections.checkBackLater')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="bg-gradient-to-br from-white to-orange-50/30 rounded-2xl p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300"
                      >
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{announcement.title}</h3>
                        <p className="text-gray-700 mb-4 whitespace-pre-wrap">{announcement.content}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                            {announcement.targetAudience === 'all' ? t('common.allUsers') : 
                             announcement.targetAudience === 'suppliers' ? t('common.suppliersOnly') : 
                             t('common.procuringEntitiesOnly')}
                          </span>
                          <span className="text-xs text-gray-500 font-medium">
                            {t('columns.expires')}: {new Date(announcement.expiryDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Suppliers Tab */}
            {activeTab === 'suppliers' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('sections.searchSuppliers')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('sections.searchSuppliersSubtitle')}</p>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="relative flex-1 min-w-[200px] max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={supplierSearch}
                      onChange={(e) => setSupplierSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchSuppliers(1)}
                      placeholder={t('placeholders.searchByNameEmailCompany')}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="w-full sm:w-72 min-w-0">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">{t('sections.filterByCPV')}</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <CPVSearchSelect
                          cpvCodes={cpvCodes}
                          value={supplierCpvFilter}
                          onChange={(id) => { setSupplierCpvFilter(id); fetchSuppliers(1); }}
                          placeholder={t('placeholders.allCPVCodes')}
                        />
                      </div>
                      {supplierCpvFilter && (
                        <button
                          type="button"
                          onClick={() => { setSupplierCpvFilter(''); fetchSuppliers(1); }}
                          className="text-sm text-gray-500 hover:text-primary-600 whitespace-nowrap"
                        >
                          {t('buttons.clear')}
                        </button>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => fetchSuppliers(1)}
                    className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shrink-0"
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
                    <p className="text-sm text-gray-500 mt-2">{t('sections.suppliersWillAppear')}</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {suppliers.map((supplier) => (
                        <button
                          key={supplier.id}
                          type="button"
                          onClick={() => setSelectedSupplierId(supplier.id)}
                          className="text-left bg-white rounded-xl border border-gray-200 p-5 hover:border-primary-400 hover:shadow-lg transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 truncate">{supplier.companyName}</h3>
                              <p className="text-sm text-gray-600 mt-0.5">
                                {supplier.user?.firstName} {supplier.user?.lastName}
                              </p>
                              <p className="text-sm text-gray-500 truncate">{supplier.user?.email}</p>
                              {supplier.city || supplier.country ? (
                                <p className="text-xs text-gray-400 mt-1">{[supplier.city, supplier.country].filter(Boolean).join(', ')}</p>
                              ) : null}
                            </div>
                            <span className="flex-shrink-0 px-2.5 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">
                              {supplier.submittedQuestionnaireCount || 0} submitted
                            </span>
                          </div>
                          {supplier.submittedQuestionnaires?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500 font-medium mb-1.5">{t('sections.submittedForCPV')}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {supplier.submittedQuestionnaires.map((q: any, idx: number) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary-50 text-primary-800 text-xs font-medium"
                                    title={q.description || q.code}
                                  >
                                    {q.code}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                    {suppliersPagination.totalPages > 1 && (
                      <div className="flex justify-center gap-2 pt-4">
                        <button
                          disabled={suppliersPagination.page <= 1}
                          onClick={() => fetchSuppliers(suppliersPagination.page - 1)}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <span className="px-4 py-2 text-gray-600">
                          Page {suppliersPagination.page} of {suppliersPagination.totalPages}
                        </span>
                        <button
                          disabled={suppliersPagination.page >= suppliersPagination.totalPages}
                          onClick={() => fetchSuppliers(suppliersPagination.page + 1)}
                          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Questionnaire Modal */}
      {showCreateQuestionnaire && (
        <CreateQuestionnaireModal
          questionnaire={newQuestionnaire}
          setQuestionnaire={setNewQuestionnaire}
          cpvCodes={cpvCodes}
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
          setQuestionnaire={setEditingQuestionnaire}
          cpvCodes={cpvCodes}
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
          responses={selectedSupplierDetail?.responses}
          loading={supplierDetailLoading}
          onClose={() => {
            setSelectedSupplierId(null);
            setSelectedSupplierDetail(null);
          }}
        />
      )}
    </div>
  );
};

// Date-only picker - custom calendar dropdown (no time, large and themed)
const DateOnlyPicker = ({
  value,
  onChange,
  placeholder = 'Select date'
}: {
  value: string;
  onChange: (dateStr: string) => void;
  placeholder?: string;
}) => {
  const { t } = useTranslation();
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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

  const displayLabel = value ? format(new Date(value + 'T12:00:00'), 'EEEE, d MMM yyyy') : placeholder;

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
      {open && (
        <div className="absolute z-20 mt-2 left-0 right-0 rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden p-4 min-w-[320px]">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              aria-label="Previous month"
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
              aria-label="Next month"
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
        </div>
      )}
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden py-1 max-h-64 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
};

// Searchable CPV Code selector - themed list with search
const CPVSearchSelect = ({
  cpvCodes,
  value,
  onChange,
  placeholder = 'Select CPV Code'
}: {
  cpvCodes: CPVCode[];
  value: string;
  onChange: (cpvCodeId: string) => void;
  placeholder?: string;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = cpvCodes.find((c) => c.id === value);
  const filtered = cpvCodes.filter(
    (c) =>
      !search ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected ? `${selected.code} – ${selected.description}` : placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100 bg-gray-50/80">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('placeholders.searchByCodeOrDescription')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto py-1">
              {cpvCodes.length === 0 ? (
                <p className="px-4 py-3 text-sm text-amber-700 bg-amber-50 rounded">No CPV codes loaded. Ensure the database is seeded (run seed-cpv-from-api) and check the browser console for errors.</p>
              ) : filtered.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-500">{t('sections.noCPVCodesMatch')}</p>
              ) : (
                filtered.map((cpv) => (
                  <button
                    key={cpv.id}
                    type="button"
                    onClick={() => {
                      onChange(cpv.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                      value === cpv.id
                        ? 'bg-primary-50 text-primary-800 font-medium'
                        : 'text-gray-700 hover:bg-primary-50/60'
                    }`}
                  >
                    <span className="font-medium text-gray-900">{cpv.code}</span>
                    <span className="text-gray-600"> – {cpv.description}</span>
                  </button>
                ))
              )}
            </div>
          </div>
      )}
    </div>
  );
};

// Create Questionnaire Modal Component
const CreateQuestionnaireModal = ({
  questionnaire,
  setQuestionnaire,
  cpvCodes,
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
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{t('actions.createQuestionnaire')}</h3>
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
            <h4 className="text-lg font-bold text-gray-900">{t('sections.basicInformation')}</h4>
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
                <CPVSearchSelect
                  cpvCodes={cpvCodes}
                  value={questionnaire.cpvCodeId || ''}
                  onChange={(cpvCodeId) => setQuestionnaire({ ...questionnaire, cpvCodeId })}
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
              <h4 className="text-lg font-bold text-gray-900">{t('sections.questionsSection')}</h4>
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
                      <span className="text-sm font-semibold text-gray-700">{t('sections.questionNumber', { n: index + 1 })}</span>
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
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
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
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{questionnaire.title}</h3>
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
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{question.questionType}</span>
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
// EXACT copy of CreateQuestionnaireModal - just with different title and deadline formatting
const EditQuestionnaireModal = ({
  questionnaire,
  setQuestionnaire,
  cpvCodes,
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
  console.log('EditQuestionnaireModal rendering with:', { 
    questionnaire, 
    hasAddQuestion: !!addQuestion, 
    hasUpdateQuestion: !!updateQuestion,
    hasAddOption: !!addOption,
    hasUpdateOption: !!updateOption,
    hasRemoveOption: !!removeOption
  });
  
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
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{t('actions.updateQuestionnaire')}</h3>
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
          {/* Basic Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-900">{t('sections.basicInformation')}</h4>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('columns.title')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={safeQuestionnaire.title}
                onChange={(e) => setQuestionnaire({ ...safeQuestionnaire, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
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
                <CPVSearchSelect
                  cpvCodes={cpvCodes}
                  value={safeQuestionnaire.cpvCodeId}
                  onChange={(cpvCodeId) => setQuestionnaire({ ...safeQuestionnaire, cpvCodeId })}
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
              <h4 className="text-lg font-bold text-gray-900">{t('sections.questionsSection')}</h4>
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
                      <span className="text-sm font-semibold text-gray-700">{t('sections.questionNumber', { n: index + 1 })}</span>
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
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={onSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
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
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{questionnaire.title}</h3>
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
        <div className="p-6 space-y-6">
          {responses.length === 0 ? (
            <div className="text-center py-16">
              <Users className="text-gray-400 mx-auto mb-4" size={48} />
              <p className="text-lg font-semibold text-gray-700">{t('sections.noResponsesYet')}</p>
              <p className="text-sm text-gray-500 mt-2">{t('sections.noResponsesHint')}</p>
            </div>
          ) : (
            responses.map((response) => (
              <div key={response.id} className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl p-6 border border-gray-200/50">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">
                      {response.supplier?.user?.firstName} {response.supplier?.user?.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">{response.supplier?.user?.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Submitted: {response.submittedAt ? new Date(response.submittedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                    Submitted
                  </span>
                </div>
                <div className="space-y-4">
                  {response.answers?.map((answer: any, _index: number) => {
                    const raw = answer.answerText ?? answer.answerValue ?? '';
                    const isDate = answer.question?.questionType === 'date';
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
                      <div key={answer.id} className="bg-gray-50 rounded-lg p-4">
                        <p className="font-semibold text-gray-900 mb-2">{answer.question?.questionText}</p>
                        <div className="mt-2">
                          {displayText && (
                            <p className="text-gray-700">{displayText}</p>
                          )}
                          {!displayText && !answer.document && (
                            <p className="text-gray-500 italic">No answer provided</p>
                          )}
                          {answer.document && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                              <FileText size={16} />
                              <a
                                href={`${import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads'}/${answer.document.filePath.replace(/^.*[\\\/]/, '')}`}
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
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads';

// Supplier Detail Modal – profile, submitted responses, answers, documents (download)
const SupplierDetailModal = ({
  supplierId: _supplierId,
  supplier,
  responses,
  loading,
  onClose
}: {
  supplierId: string | null;
  supplier: any;
  responses: any[];
  loading: boolean;
  onClose: () => void;
}) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const formatDateAnswer = (raw: string) => {
    if (!raw || typeof raw !== 'string') return raw;
    const s = raw.slice(0, 10);
    if (s.length < 10) return raw;
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-white to-primary-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg flex items-center justify-between z-10">
          <h3 className="text-xl font-bold text-gray-900">Supplier profile & responses</h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
            <XCircle size={24} />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-16">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-gray-600">Loading...</p>
            </div>
          ) : supplier ? (
            <div className="space-y-8">
              {/* Profile */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User size={20} />
                  Basic data
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Company</span><p className="font-medium text-gray-900">{supplier.companyName}</p></div>
                  <div><span className="text-gray-500">Contact</span><p className="font-medium text-gray-900">{supplier.user?.firstName} {supplier.user?.lastName}</p></div>
                  <div><span className="text-gray-500">Email</span><p className="font-medium text-gray-900">{supplier.user?.email}</p></div>
                  {supplier.user?.phone && <div><span className="text-gray-500">Phone</span><p className="font-medium text-gray-900">{supplier.user.phone}</p></div>}
                  {supplier.registrationNumber && <div><span className="text-gray-500">Registration No.</span><p className="font-medium text-gray-900">{supplier.registrationNumber}</p></div>}
                  {(supplier.address || supplier.city || supplier.country) && (
                    <div className="sm:col-span-2"><span className="text-gray-500">Address</span><p className="font-medium text-gray-900">{[supplier.address, supplier.city, supplier.country].filter(Boolean).join(', ')}</p></div>
                  )}
                  {supplier.cpvCodes?.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-gray-500 block mb-2">CPV codes</span>
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
                </div>
                {supplier.documents?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-gray-500 text-sm font-medium mb-2">Profile documents</p>
                    <div className="flex flex-wrap gap-2">
                      {supplier.documents.map((doc: any) => (
                        <a
                          key={doc.id}
                          href={`${UPLOADS_BASE}/${doc.filePath.replace(/^.*[\\\/]/, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50"
                        >
                          <FileText size={16} />
                          {doc.fileName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submitted responses */}
              <div>
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText size={20} />
                  Questionnaire responses
                </h4>
                {!responses?.length ? (
                  <p className="text-gray-500 text-sm">No submitted responses.</p>
                ) : (
                  <div className="space-y-6">
                    {responses.map((resp) => {
                      const q = resp.questionnaire;
                      const answers = (resp.answers || []).slice().sort((a: any, b: any) => (a.question?.order ?? 0) - (b.question?.order ?? 0));
                      return (
                        <div key={resp.id} className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="bg-primary-50/50 px-4 py-3 border-b border-gray-200">
                            <p className="font-semibold text-gray-900">{q?.title}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              {q?.cpvCode && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-primary-100 text-primary-800 text-xs font-medium">
                                  {q.cpvCode.code}
                                  {q.cpvCode.description && <span className="text-primary-600 ml-1">– {q.cpvCode.description}</span>}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                Submitted: {resp.submittedAt ? new Date(resp.submittedAt).toLocaleString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            {answers.map((ans: any) => {
                              const raw = ans.answerText ?? ans.answerValue ?? '';
                              const isDate = ans.question?.questionType === 'date';
                              const displayText = isDate && raw ? formatDateAnswer(String(raw)) : (raw ? String(raw) : '');
                              return (
                                <div key={ans.id} className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-sm font-medium text-gray-700 mb-1">{ans.question?.questionText}</p>
                                  {displayText && <p className="text-gray-900">{displayText}</p>}
                                  {ans.document && (
                                    <a
                                      href={`${UPLOADS_BASE}/${ans.document.filePath.replace(/^.*[\\\/]/, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 mt-2 text-sm text-blue-600 hover:underline"
                                    >
                                      <FileText size={14} />
                                      {ans.document.fileName} (download)
                                    </a>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No supplier data.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcuringEntityDashboard;
