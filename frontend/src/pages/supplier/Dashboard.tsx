import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { DateOnlyPicker } from '../../components/DateOnlyPicker';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { 
  LogOut, FileText, History, User, Upload, Plus, Edit2, Trash2, Eye, 
  Save, XCircle, Calendar, Building2, CheckCircle,
  Search, ChevronDown, Bell
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
  id: string;
  questionText: string;
  questionType: string;
  options?: string[];
  isRequired: boolean;
  requiresDocument: boolean;
  documentType?: string;
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
  questionnaire: Questionnaire;
  answers?: any[];
}

const SupplierDashboard = () => {
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
    companyName: '',
    registrationNumber: '',
    taxId: '',
    address: '',
    city: '',
    country: '',
    website: '',
    turnover: '',
    employeeCount: '',
    yearEstablished: ''
  });
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedCPVCodes, setSelectedCPVCodes] = useState<string[]>([]);
  const [cpvCodes, setCpvCodes] = useState<CPVCode[]>([]);
  const [cpvSearchTerm, setCpvSearchTerm] = useState('');
  const [showCPVSelector, setShowCPVSelector] = useState(false);
  
  // Announcements state
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Questionnaires state
  const [activeQuestionnaires, setActiveQuestionnaires] = useState<Questionnaire[]>([]);
  const [questionnaireHistory, setQuestionnaireHistory] = useState<QuestionnaireResponse[]>([]);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<Questionnaire | null>(null);
  const [questionnaireResponse, setQuestionnaireResponse] = useState<Record<string, any>>({});
  const [responseDocuments, setResponseDocuments] = useState<Record<string, File>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
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
        yearEstablished: supplier.yearEstablished?.toString() || ''
      });
      setDocuments(supplier.documents || []);
      setSelectedCPVCodes(supplier.cpvCodes?.map((cpv: CPVCode) => cpv.id) || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedFetchProfile'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch CPV codes
  const fetchCPVCodes = async () => {
    try {
      const response = await api.get('/cpv');
      setCpvCodes(response.data.cpvCodes || []);
    } catch (error: any) {
      console.error('Failed to fetch CPV codes:', error);
    }
  };

  // Fetch active questionnaires
  const fetchActiveQuestionnaires = async () => {
    try {
      setLoading(true);
      const response = await api.get('/supplier/questionnaires/active');
      setActiveQuestionnaires(response.data.questionnaires || []);
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to fetch questionnaires';
      showToast(msg, 'error');
      // If not approved, clear list so we show the empty state with hints
      if (error.response?.status === 403) {
        setActiveQuestionnaires([]);
      }
    } finally {
      setLoading(false);
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

  // Load existing response for questionnaire
  const loadQuestionnaireResponse = async (questionnaireId: string): Promise<void> => {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:167',message:'loadQuestionnaireResponse called',data:{questionnaireId},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('=== LOADING RESPONSE FOR QUESTIONNAIRE:', questionnaireId, '===');
      const response = await api.get(`/questionnaires/${questionnaireId}/responses`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:171',message:'API response received',data:{hasResponse:!!response.data.response,answersCount:response.data.response?.answers?.length||0,answers:response.data.response?.answers?.map((a:any)=>({questionId:a.questionId,answerText:a.answerText,answerValue:a.answerValue}))||[]},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.log('API Response received:', response.data);
      
      if (response.data.response) {
        const answers: Record<string, any> = {};
        console.log('Loading answers for questionnaire:', questionnaireId);
        console.log('Raw response data:', response.data.response);
        console.log('Answers from backend:', response.data.response.answers);
        console.log('Number of answers:', response.data.response.answers?.length || 0);
        
        if (response.data.response.answers && response.data.response.answers.length > 0) {
          response.data.response.answers.forEach((answer: any) => {
            console.log('Processing answer:', answer);
            console.log('Question ID:', answer.questionId);
            console.log('Answer text:', answer.answerText);
            console.log('Answer value:', answer.answerValue);
            console.log('Answer value type:', typeof answer.answerValue);
            
            // Handle different answer value formats
            let answerValue = answer.answerValue;
            
            // If answerValue is null/undefined, use answerText
            if (answerValue === null || answerValue === undefined) {
              answerValue = answer.answerText || '';
            } else if (typeof answerValue === 'object') {
              // If it's an object (JSONB), try to extract value or stringify
              if (Array.isArray(answerValue)) {
                answerValue = answerValue.join(',');
              } else if (answerValue.value !== undefined) {
                answerValue = answerValue.value;
              } else {
                answerValue = JSON.stringify(answerValue);
              }
            } else if (typeof answerValue !== 'string') {
              // Convert to string if not already
              answerValue = String(answerValue);
            }
            
            // Fallback to answerText if answerValue is empty
            if (!answerValue && answer.answerText) {
              answerValue = answer.answerText;
            }
            
            // Use questionId as key
            answers[answer.questionId] = {
              answerText: answer.answerText || answerValue || '',
              answerValue: answerValue || answer.answerText || '',
              documentId: answer.documentId || null,
              document: answer.document || null // Include document info
            };
            
            console.log(`✓ Set answer for question ${answer.questionId}:`, answers[answer.questionId]);
          });
        } else {
          console.log('No answers found in response');
        }
        
        console.log('=== ALL PROCESSED ANSWERS ===');
        console.log('Answer object:', answers);
        console.log('Answer keys:', Object.keys(answers));
        console.log('Number of answer keys:', Object.keys(answers).length);
        
        // Set answers directly - use functional update to ensure we merge correctly
        setQuestionnaireResponse((prev) => {
          const merged = { ...prev, ...answers };
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:233',message:'Setting questionnaireResponse state',data:{prevKeys:Object.keys(prev),mergedKeys:Object.keys(merged),answerCount:Object.keys(answers).length,answers:Object.keys(answers)},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.log('Setting questionnaire response state:', merged);
          return merged;
        });
        
        // Small delay to ensure state is set before continuing
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Update the selectedQuestionnaire to include the response status
        setSelectedQuestionnaire((prev) => {
          if (prev && prev.id === questionnaireId) {
            return {
              ...prev,
              responses: [{
                id: response.data.response.id,
                status: response.data.response.status,
                submittedAt: response.data.response.submittedAt
              }]
            };
          }
          return prev;
        });
        
        console.log('=== RESPONSE LOADED SUCCESSFULLY ===');
      } else {
        console.log('No response data found, starting fresh');
        // No existing response, start fresh
        setQuestionnaireResponse({});
        // Clear response status if no response exists
        setSelectedQuestionnaire((prev) => {
          if (prev && prev.id === questionnaireId) {
            return {
              ...prev,
              responses: []
            };
          }
          return prev;
        });
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:273',message:'loadQuestionnaireResponse error caught',data:{questionnaireId,errorStatus:error.response?.status,errorMessage:error.message,errorData:error.response?.data},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // 404 is normal if no response exists yet - start fresh
      if (error.response?.status === 404) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:276',message:'404 error - no response found',data:{questionnaireId},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        console.log('No existing response found (404) for questionnaire:', questionnaireId);
        setQuestionnaireResponse({});
        // Clear response status if no response exists
        setSelectedQuestionnaire((prev) => {
          if (prev && prev.id === questionnaireId) {
            return {
              ...prev,
              responses: []
            };
          }
          return prev;
        });
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:290',message:'Non-404 error loading response',data:{questionnaireId,errorStatus:error.response?.status,errorMessage:error.message},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        // Other errors - log but don't clear state
        console.error('Error loading response:', error);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfile();
      fetchCPVCodes();
    } else if (activeTab === 'questionnaires') {
      fetchActiveQuestionnaires();
    } else if (activeTab === 'history') {
      fetchQuestionnaireHistory();
    } else if (activeTab === 'announcements') {
      fetchAnnouncements();
    } else if (activeTab === 'documents') {
      fetchProfile();
    }
  }, [activeTab]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/announcements');
      setAnnouncements(response.data.announcements || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedFetchAnnouncements'), 'error');
      setAnnouncements([]);
    } finally {
      setLoading(false);
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
      if (profileData.turnover) updateData.turnover = parseFloat(profileData.turnover);
      if (profileData.employeeCount) updateData.employeeCount = parseInt(profileData.employeeCount);
      if (profileData.yearEstablished) updateData.yearEstablished = parseInt(profileData.yearEstablished);

      await api.put('/supplier/profile', updateData);
      showToast(t('msg.profileUpdated'), 'success');
      setEditingProfile(false);
      fetchProfile();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUpdateProfile'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update CPV codes
  const handleUpdateCPVCodes = async () => {
    try {
      setLoading(true);
      await api.put('/supplier/cpv-codes', { cpvCodeIds: selectedCPVCodes });
      showToast(t('msg.cpvUpdated'), 'success');
      setShowCPVSelector(false);
      fetchProfile();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUpdateCPV'), 'error');
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
      await api.post('/documents/supplier', formData, {
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
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await api.delete(`/documents/${documentId}`);
      showToast(t('msg.documentDeleted'), 'success');
      fetchProfile();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedDeleteDocument'), 'error');
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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:434',message:'Saving draft - answers prepared',data:{answersCount:answers.length,answers:answers.map((a:any)=>({questionId:a.questionId,answerText:a.answerText,answerValue:a.answerValue})),questionnaireResponseKeys:Object.keys(questionnaireResponse),questionnaireResponseCount:Object.keys(questionnaireResponse).length},timestamp:Date.now(),runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.log('Saving answers:', answers);
      console.log('Questionnaire response state:', questionnaireResponse);
      console.log('Selected questionnaire:', selectedQuestionnaire?.id);

      const saveResponse = await api.post(`/questionnaires/${selectedQuestionnaire.id}/responses`, {
        answers,
        status: 'draft'
      });

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:450',message:'Save draft response received',data:{responseId:saveResponse.data?.response?.id,responseStatus:saveResponse.data?.response?.status,answersCount:saveResponse.data?.response?.answers?.length||0},timestamp:Date.now(),runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.log('Save response from backend:', saveResponse.data);

      showToast(t('msg.savedAsDraft'), 'success');
      
      // Reload questionnaires to update status
      await fetchActiveQuestionnaires();
      
      // Close modal after saving
      setSelectedQuestionnaire(null);
      setQuestionnaireResponse({});
      setResponseDocuments({});
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
        status: 'submitted'
      });

      showToast(t('msg.questionnaireSubmitted'), 'success');
      
      // Reload questionnaires to update status
      await fetchActiveQuestionnaires();
      
      // Close modal after submitting
      setSelectedQuestionnaire(null);
      setQuestionnaireResponse({});
      setResponseDocuments({});
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

  const filteredCPVCodes = cpvCodes.filter(cpv =>
    cpv.code.toLowerCase().includes(cpvSearchTerm.toLowerCase()) ||
    cpv.description.toLowerCase().includes(cpvSearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
        <div className="w-full mx-auto px-2 sm:px-3 lg:px-4">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  PrequaliQ
                </h1>
                <p className="text-xs text-gray-500 font-medium">{t('nav.supplierPortal')}</p>
              </div>
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
                  <p className="text-xs text-gray-500">{t('nav.supplier')}</p>
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

      <div className="w-full mx-auto px-2 sm:px-3 py-8">
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
                {t('nav.activeQuestionnaires')}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`relative py-4 px-3 font-semibold text-sm flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {activeTab === 'history' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-full"></span>
                )}
                <History className={activeTab === 'history' ? 'text-primary-600' : 'text-gray-400'} size={20} />
                {t('nav.history')}
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
              <button
                onClick={() => setActiveTab('documents')}
                className={`relative py-4 px-3 font-semibold text-sm flex items-center gap-2 transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'documents'
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {activeTab === 'documents' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-full"></span>
                )}
                <Upload className={activeTab === 'documents' ? 'text-primary-600' : 'text-gray-400'} size={20} />
                {t('nav.documents')}
              </button>
            </nav>
          </div>

          <div className="px-2 py-6">
            {/* Active Questionnaires Tab */}
            {activeTab === 'questionnaires' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('sections.activeQuestionnaires')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('sections.respondToQuestionnaires')}</p>
                </div>

                {loading && activeQuestionnaires.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                      <p className="mt-6 text-gray-600 font-medium">{t('sections.loadingQuestionnaires')}</p>
                    </div>
                  </div>
                ) : activeQuestionnaires.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <FileText className="text-gray-400 mx-auto mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-700">{t('sections.noActiveQuestionnaires')}</p>
                    <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                      {t('sections.noActiveQuestionnairesHint')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeQuestionnaires.map((questionnaire) => {
                      const hasResponse = questionnaire.responses && questionnaire.responses.length > 0;
                      const isSubmitted = hasResponse && questionnaire.responses?.[0]?.status === 'submitted';
                      const isExpired = new Date(questionnaire.deadline) < new Date();

                      return (
                        <div
                          key={questionnaire.id}
                          className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-gray-900">{questionnaire.title}</h3>
                                {isSubmitted && (
                                  <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                    {t('common.submitted')}
                                  </span>
                                )}
                                {hasResponse && !isSubmitted && (
                                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                                    {t('common.draft')}
                                  </span>
                                )}
                                {isExpired && (
                                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                    {t('common.expired')}
                                  </span>
                                )}
                              </div>
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
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {!isExpired && !isSubmitted && (
                                <button
                                  onClick={async () => {
                                    // #region agent log
                                    fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:724',message:'Continue button clicked',data:{questionnaireId:questionnaire.id,hasResponse},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                    // #endregion
                                    // Load response first, then open modal
                                    await loadQuestionnaireResponse(questionnaire.id);
                                    // #region agent log
                                    fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:728',message:'After loadQuestionnaireResponse, before setSelectedQuestionnaire',data:{questionnaireId:questionnaire.id},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                    // #endregion
                                    // Set questionnaire after loading to ensure state is updated
                                    setSelectedQuestionnaire(questionnaire);
                                  }}
                                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2"
                                >
                                  {hasResponse ? <Edit2 size={16} /> : <Plus size={16} />}
                                  {hasResponse ? t('buttons.continue') : t('buttons.respond')}
                                </button>
                              )}
                              {isSubmitted && (
                                <button
                                  onClick={async () => {
                                    await loadQuestionnaireResponse(questionnaire.id);
                                    setSelectedQuestionnaire(questionnaire);
                                  }}
                                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2"
                                >
                                  <Eye size={16} />
                                  {t('buttons.view')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('sections.questionHistory')}</h2>
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
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <History className="text-gray-400 mx-auto mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-700">{t('sections.noHistoryFound')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('sections.submittedHistoryWillAppear')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questionnaireHistory.map((response) => (
                      <div
                        key={response.id}
                        className="bg-gradient-to-br from-white to-green-50/30 rounded-2xl p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {response.questionnaire?.title}
                            </h3>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center gap-1">
                                <Building2 size={16} />
                                {response.questionnaire?.cpvCode?.code} - {response.questionnaire?.cpvCode?.description}
                              </span>
                              {response.submittedAt && (
                                <span className="flex items-center gap-1">
                                  <Calendar size={16} />
                                  {t('columns.submittedAt')}: {new Date(response.submittedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                              {t('common.submitted')}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedQuestionnaire(response.questionnaire);
                              loadQuestionnaireResponse(response.questionnaire.id);
                            }}
                            className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 font-medium text-sm flex items-center gap-2"
                          >
                            <Eye size={16} />
                            {t('buttons.viewResponse')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Announcements Tab */}
            {activeTab === 'announcements' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('sections.announcements')}</h2>
                  <p className="text-sm text-gray-500 mt-1">{t('sections.viewAnnouncementsSupplier')}</p>
                </div>
                {loading && announcements.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                    <p className="mt-6 text-gray-600 font-medium">{t('sections.loadingAnnouncements')}</p>
                  </div>
                ) : announcements.length === 0 ? (
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
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-gray-200/50">
                          {announcement.cpvCode && (
                            <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-lg">
                              {announcement.cpvCode.code} – {announcement.cpvCode.description}
                            </span>
                          )}
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

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('common.profile')} Management</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('dashboard.manageProfile')}</p>
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
                                {profileData.companyName || 'N/A'}
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
                                {profileData.registrationNumber || 'N/A'}
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
                                {profileData.taxId || 'N/A'}
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
                                {profileData.website || 'N/A'}
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.turnover')}</label>
                            {editingProfile ? (
                              <input
                                type="number"
                                value={profileData.turnover}
                                onChange={(e) => setProfileData({ ...profileData, turnover: e.target.value })}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                                {profileData.turnover ? `$${parseFloat(profileData.turnover).toLocaleString()}` : 'N/A'}
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
                                {profileData.employeeCount || 'N/A'}
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
                                {profileData.yearEstablished || 'N/A'}
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
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {/* CPV Codes */}
                      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-gray-200/50">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-bold text-gray-900">CPV Codes</h3>
                          {!editingProfile && (
                            <button
                              onClick={() => {
                                setShowCPVSelector(true);
                                fetchCPVCodes();
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-all duration-200 font-medium text-sm"
                            >
                              <Edit2 size={16} />
                              Edit CPV Codes
                            </button>
                          )}
                        </div>
                        {profile?.cpvCodes && profile.cpvCodes.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {profile.cpvCodes.map((cpv: CPVCode) => (
                              <span
                                key={cpv.id}
                                className="px-3 py-1 bg-primary-100 text-primary-700 text-sm font-semibold rounded-lg"
                              >
                                {cpv.code} - {cpv.description}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No CPV codes selected</p>
                        )}
                      </div>
                    </div>

                    {/* Status Card */}
                    <div className="space-y-6">
                      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 border border-gray-200/50">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Status</h3>
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-600">Account Status</span>
                            <div className="mt-1">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                                profile?.status === 'approved' ? 'bg-green-100 text-green-700' :
                                profile?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {profile?.status?.charAt(0).toUpperCase() + profile?.status?.slice(1) || 'Pending'}
                              </span>
                            </div>
                          </div>
                          {profile?.status === 'rejected' && profile?.rejectionReason && (
                            <div>
                              <span className="text-sm text-gray-600">Rejection Reason</span>
                              <p className="mt-1 text-sm text-red-600">{profile.rejectionReason}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
                    <p className="text-sm text-gray-500 mt-1">Upload and manage your documents</p>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      onChange={handleDocumentUpload}
                      disabled={uploadingDoc}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                      <Upload size={20} />
                      {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                    </div>
                  </label>
                </div>

                {documents.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <Upload className="text-gray-400 mx-auto mb-4" size={48} />
                    <p className="text-lg font-semibold text-gray-700">No documents uploaded</p>
                    <p className="text-sm text-gray-500 mt-2">Upload your company documents here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-gradient-to-br from-white to-blue-50/30 rounded-xl p-4 border border-gray-200/50 hover:shadow-lg transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <FileText className="text-primary-600 flex-shrink-0 mt-1" size={24} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{doc.fileName}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {(doc.fileSize / 1024).toFixed(2)} KB
                              </p>
                              <p className="text-xs text-gray-500">
                                {doc.documentType}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 flex-shrink-0"
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

      {/* CPV Code Selector Modal */}
      {showCPVSelector && (
        <CPVSelectorModal
          cpvCodes={filteredCPVCodes}
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
          onClose={() => {
            setSelectedQuestionnaire(null);
            setQuestionnaireResponse({});
            setResponseDocuments({});
          }}
          onSaveDraft={handleSaveDraft}
          onSubmit={handleSubmitQuestionnaire}
          savingDraft={savingDraft}
          submitting={submitting}
          loadResponse={loadQuestionnaireResponse}
        />
      )}
    </div>
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
  loading
}: any) => {
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
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">Select CPV Codes</h3>
              <p className="text-sm text-gray-500 mt-1">Select the CPV codes that match your business categories</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XCircle size={24} />
            </button>
          </div>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search CPV codes..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cpvCodes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No CPV codes found</p>
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
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save CPV Codes
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
  loadResponse
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:1369',message:'Modal useEffect triggered',data:{questionnaireId:questionnaire.id,responseKeys:Object.keys(response),responseCount:Object.keys(response).length},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      console.log('Modal opened, loading response for questionnaire:', questionnaire.id);
      console.log('Current response state:', response);
      console.log('Response keys:', Object.keys(response));
      // Always load to ensure we have latest data
      setLoadingResponse(true);
      loadResponse(questionnaire.id).finally(() => {
        // Small delay to ensure state has updated
        setTimeout(() => {
          setLoadingResponse(false);
        }, 100);
      });
    } else {
      setLoadingResponse(false);
    }
  }, [questionnaire?.id]);

  // Check if response is submitted - if so, make it read-only
  const responseStatus = questionnaire.responses && questionnaire.responses.length > 0 
    ? questionnaire.responses[0].status 
    : null;
  const isSubmitted = responseStatus === 'submitted';
  const isExpired = new Date(questionnaire.deadline) < new Date();

  // Read-only if submitted OR expired
  const isReadOnly = isSubmitted || isExpired;

  // Debug: Log current response state
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:1398',message:'Response prop changed in modal',data:{questionnaireId:questionnaire?.id,responseKeys:Object.keys(response),responseCount:Object.keys(response).length,responseEntries:Object.entries(response).map(([k,v]:[string,any])=>({key:k,hasAnswerText:!!v?.answerText,hasAnswerValue:!!v?.answerValue}))},timestamp:Date.now(),runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.log('QuestionnaireResponseModal - Current response state:', response);
    console.log('Questionnaire ID:', questionnaire?.id);
    console.log('Response keys:', Object.keys(response));
    console.log('Response entries:', Object.entries(response));
    
    // If we have response data, stop loading
    if (Object.keys(response).length > 0) {
      setLoadingResponse(false);
    }
  }, [response, questionnaire?.id]);

  const renderQuestionInput = (question: Question) => {
    if (isReadOnly) {
      // Read-only view (submitted or expired)
      const answer = response[question.id];
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
            {formatted || 'No answer provided'}
          </div>
          {/* Document link is shown only in the "Upload Document" section below (when question.requiresDocument) to avoid showing it twice */}
          {answer?.document && !question.requiresDocument && (
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
      );
    }

    switch (question.questionType) {
      case 'text':
        const textAnswer = response[question.id];
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/ca10ee68-017d-4d11-84f2-160a915405c6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'Dashboard.tsx:1428',message:'Rendering text input',data:{questionId:question.id,hasAnswer:!!textAnswer,answerText:textAnswer?.answerText,answerValue:textAnswer?.answerValue,responseKeys:Object.keys(response)},timestamp:Date.now(),runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
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
            value={response[question.id]?.answerText || ''}
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
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
            required={question.isRequired}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={response[question.id]?.answerText || ''}
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
      case 'date': {
        // Date only (no time) - normalize in case backend returns ISO datetime
        const raw = response[question.id]?.answerText || response[question.id]?.answerValue || '';
        const dateOnly = typeof raw === 'string' && raw.length >= 10 ? raw.slice(0, 10) : raw;
        return (
          <DateOnlyPicker
            value={dateOnly}
            onChange={(val) => {
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
            placeholder="Select date"
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
                checked={response[question.id]?.answerValue === 'yes'}
                onChange={() => {
                  const currentAnswer = response[question.id] || {};
                  setResponse({ ...response, [question.id]: { ...currentAnswer, answerText: 'Yes', answerValue: 'yes' } });
                }}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                required={question.isRequired}
              />
              <span>Yes</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value="no"
                checked={response[question.id]?.answerValue === 'no'}
                onChange={() => {
                  const currentAnswer = response[question.id] || {};
                  setResponse({ ...response, [question.id]: { ...currentAnswer, answerText: 'No', answerValue: 'no' } });
                }}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                required={question.isRequired}
              />
              <span>No</span>
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
                  checked={response[question.id]?.answerValue === option}
                  onChange={() => {
                    const currentAnswer = response[question.id] || {};
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
        const selectedValues = response[question.id]?.answerValue?.split(',') || [];
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
                    const currentAnswer = response[question.id] || {};
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
              value={response[question.id]?.answerValue ?? response[question.id]?.answerText ?? ''}
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
              <option value="">Select an option</option>
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
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{questionnaire.title}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('columns.deadline')}: {new Date(questionnaire.deadline).toLocaleDateString()}
                {isExpired && <span className="text-red-600 ml-2">(Expired)</span>}
                {isSubmitted && <span className="text-green-600 ml-2">(Submitted)</span>}
                {responseStatus === 'draft' && <span className="text-yellow-600 ml-2">(Draft)</span>}
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
                <p className="mt-4 text-gray-600 font-medium">Loading your answers...</p>
              </div>
            </div>
          ) : (
            <>
              {questionnaire.description && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-gray-700">{questionnaire.description}</p>
                </div>
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
                  <div className="mt-3">
                    {renderQuestionInput(question)}
                  </div>
                  {question.requiresDocument && (
                    <div className="mt-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        {isReadOnly ? `Preview/Download ${question.documentType || 'document'}` : `Attach ${question.documentType || 'document'}`}
                      </label>
                      {isReadOnly ? (
                        <div>
                          {response[question.id]?.document ? (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <FileText size={16} />
                              <a 
                                href={`${import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads'}/${response[question.id].document.filePath.replace(/^.*[\\\/]/, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="hover:underline"
                              >
                                {response[question.id].document.fileName}
                              </a>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">No document uploaded</div>
                          )}
                        </div>
                      ) : (
                        <div>
                          {response[question.id]?.document ? (
                            <div className="mb-2 flex items-center gap-2 text-sm text-green-600">
                              <FileText size={16} />
                              <span>{response[question.id].document.fileName}</span>
                              <a 
                                href={`${import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5001/uploads'}/${response[question.id].document.filePath.replace(/^.*[\\\/]/, '')}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline"
                              >
                                View
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
                className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                {savingDraft ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save as Draft
                  </>
                )}
              </button>
              <button
                onClick={onSubmit}
                disabled={submitting || savingDraft}
                className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Submit
                  </>
                )}
              </button>
            </div>
          )}
          {isReadOnly && isSubmitted && (
            <div className="flex justify-end pt-6 border-t border-gray-200/50">
              <div className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-semibold">
                ✓ Submitted - This response is now read-only
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
