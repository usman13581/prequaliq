import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { LogOut, Users, Building2, Bell, Plus, CheckCircle, XCircle, Edit2, Trash2, Power, PowerOff, ChevronLeft, ChevronRight, User, Lock, Eye, EyeOff, Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { DateOnlyPicker } from '../../components/DateOnlyPicker';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

interface Supplier {
  id: string;
  companyName: string;
  status: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
}

interface ProcuringEntity {
  id: string;
  entityName: string;
  isActive?: boolean;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  expiryDate: string;
  targetAudience: string;
  cpvCodeId?: string | null;
  isActive?: boolean;
}

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [procuringEntities, setProcuringEntities] = useState<ProcuringEntity[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateSupplier, setShowCreateSupplier] = useState(false);
  const [showCreateEntity, setShowCreateEntity] = useState(false);
  const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingEntity, setEditingEntity] = useState<ProcuringEntity | null>(null);
  const [supplierPage, setSupplierPage] = useState(1);
  const [entityPage, setEntityPage] = useState(1);
  const itemsPerPage = 5;
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [resetPasswordSupplier, setResetPasswordSupplier] = useState<Supplier | null>(null);
  const [resetPasswordEntity, setResetPasswordEntity] = useState<ProcuringEntity | null>(null);

  // Fetch suppliers
  const fetchSuppliers = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.get('/admin/suppliers');
      setSuppliers(response.data.suppliers || []);
    } catch (error: any) {
      console.error('Error fetching suppliers:', error);
      if (showLoading) {
        showToast(error.response?.data?.message || t('msg.failedFetchSuppliers'), 'error');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fetch procuring entities
  const fetchProcuringEntities = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.get('/admin/procuring-entities');
      setProcuringEntities(response.data.procuringEntities || []);
    } catch (error: any) {
      console.error('Error fetching procuring entities:', error);
      if (showLoading) {
        showToast(error.response?.data?.message || t('msg.failedFetchEntities'), 'error');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await api.get('/announcements/all');
      const list = response?.data?.announcements;
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
      if (showLoading) {
        showToast(error.response?.data?.message || t('msg.failedFetchAnnouncements'), 'error');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Approve/Reject supplier
  const reviewSupplier = async (supplierId: string, action: 'approve' | 'reject') => {
    try {
      const rejectionReason = action === 'reject' 
        ? prompt('Enter rejection reason:') || 'No reason provided'
        : '';
      
      await api.put(`/admin/suppliers/${supplierId}/review`, { action, rejectionReason });
      showToast(action === 'approve' ? t('msg.supplierApproved') : t('msg.supplierRejected'), 'success');
      fetchSuppliers(false);
      // Reset to first page if current page becomes empty
      const currentPageStart = (supplierPage - 1) * itemsPerPage;
      if (currentPageStart >= suppliers.length - 1 && supplierPage > 1) {
        setSupplierPage(prev => Math.max(1, prev - 1));
      }
    } catch (error: any) {
      console.error('Error reviewing supplier:', error);
      showToast(error.response?.data?.message || t('msg.failedReviewSupplier'), 'error');
    }
  };

  // Toggle supplier active status
  const toggleSupplierStatus = async (supplierId: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/suppliers/${supplierId}/toggle-status`, { isActive: !currentStatus });
      showToast(!currentStatus ? t('msg.supplierActivated') : t('msg.supplierDeactivated'), 'success');
      fetchSuppliers(false);
    } catch (error: any) {
      console.error('Error toggling supplier status:', error);
      showToast(error.response?.data?.message || t('msg.failedToggleSupplier'), 'error');
    }
  };

  // Toggle procuring entity active status
  const toggleEntityStatus = async (entityId: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/procuring-entities/${entityId}/toggle-status`, { isActive: !currentStatus });
      showToast(!currentStatus ? t('msg.entityActivated') : t('msg.entityDeactivated'), 'success');
      fetchProcuringEntities(false);
    } catch (error: any) {
      console.error('Error toggling entity status:', error);
      showToast(error.response?.data?.message || t('msg.failedToggleEntity'), 'error');
    }
  };

  // Load all data on initial mount (without showing loading spinner)
  useEffect(() => {
    fetchSuppliers(false);
    fetchProcuringEntities(false);
    fetchAnnouncements(false);
  }, []);

  // Load data when tab changes (refresh current tab)
  useEffect(() => {
    if (activeTab === 'suppliers') {
      fetchSuppliers();
      setSupplierPage(1); // Reset to first page when switching tabs
    } else if (activeTab === 'entities') {
      fetchProcuringEntities();
      setEntityPage(1); // Reset to first page when switching tabs
    } else if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Navbar */}
      <nav className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-800 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">PQ</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  PrequaliQ
                </h1>
                <p className="text-xs text-gray-500 font-medium">{t('nav.adminDashboard')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <button
                onClick={() => setShowProfileModal(true)}
                className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200/50 hover:from-primary-100 hover:to-blue-100 transition-all duration-200 cursor-pointer"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{t('nav.administrator')}</p>
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

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t('nav.totalSuppliers')}</p>
                <p className="text-3xl font-bold text-gray-900">{suppliers.length}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {suppliers.filter(s => s.status === 'approved').length} {t('nav.approved')}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="text-white" size={28} />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t('nav.procuringEntities')}</p>
                <p className="text-3xl font-bold text-gray-900">{procuringEntities.length}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {procuringEntities.filter(e => e.user?.isActive).length} {t('nav.active')}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="text-white" size={28} />
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{t('nav.announcements')}</p>
                <p className="text-3xl font-bold text-gray-900">{announcements.length}</p>
                <p className="text-xs text-gray-500 mt-2">{t('nav.activeNotifications')}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Bell className="text-white" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
          {/* Modern Tab Navigation */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50/50 border-b border-gray-200/50">
            <nav className="flex space-x-1 px-6">
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`relative py-4 px-6 font-semibold text-sm flex items-center gap-2 transition-all duration-200 ${
                  activeTab === 'suppliers'
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {activeTab === 'suppliers' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-full"></span>
                )}
                <Users className={activeTab === 'suppliers' ? 'text-primary-600' : 'text-gray-400'} size={20} />
                {t('nav.suppliers')}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'suppliers'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {suppliers.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('entities')}
                className={`relative py-4 px-6 font-semibold text-sm flex items-center gap-2 transition-all duration-200 ${
                  activeTab === 'entities'
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {activeTab === 'entities' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-full"></span>
                )}
                <Building2 className={activeTab === 'entities' ? 'text-primary-600' : 'text-gray-400'} size={20} />
                {t('nav.entities')}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'entities'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {procuringEntities.length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('announcements')}
                className={`relative py-4 px-6 font-semibold text-sm flex items-center gap-2 transition-all duration-200 ${
                  activeTab === 'announcements'
                    ? 'text-primary-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {activeTab === 'announcements' && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-full"></span>
                )}
                <Bell className={activeTab === 'announcements' ? 'text-primary-600' : 'text-gray-400'} size={20} />
                {t('nav.announcements')}
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'announcements'
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {announcements.length}
                </span>
              </button>
            </nav>
          </div>

          <div className="px-3 py-6">
            {loading && (
              <div className="text-center py-16">
                <div className="inline-flex flex-col items-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="mt-6 text-gray-600 font-medium">{t('sections.loadingData')}</p>
                </div>
              </div>
            )}

            {!loading && activeTab === 'suppliers' && (
              <div className="px-3 py-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('sections.supplierManagement')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('sections.manageSuppliers')}</p>
                  </div>
                  <button
                    onClick={() => setShowCreateSupplier(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  >
                    <Plus size={20} />
                    {t('actions.createSupplier')}
                  </button>
                </div>

                {suppliers.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="text-gray-400" size={40} />
                    </div>
                    <p className="text-lg font-semibold text-gray-700">{t('sections.noSuppliersFound')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('sections.createSupplierOrWait')}</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-gray-200/50 shadow-inner">
                      <table className="min-w-full divide-y divide-gray-200/50">
                        <thead className="bg-gradient-to-r from-gray-50 to-blue-50/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('columns.companyName')}</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('columns.contact')}</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('columns.status')}</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('columns.actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200/50">
                          {suppliers
                            .slice((supplierPage - 1) * itemsPerPage, supplierPage * itemsPerPage)
                            .map((supplier) => (
                          <tr key={supplier.id} className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent transition-all duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                                  {supplier.companyName?.[0]?.toUpperCase()}
                                </div>
                                <div className="text-sm font-semibold text-gray-900">{supplier.companyName}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{supplier.user?.firstName} {supplier.user?.lastName}</div>
                              <div className="text-sm text-gray-500">{supplier.user?.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-2">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full w-fit shadow-sm ${
                                  supplier.status === 'approved' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                                  supplier.status === 'rejected' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' :
                                  'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                                }`}>
                                  {supplier.status.charAt(0).toUpperCase() + supplier.status.slice(1)}
                                </span>
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full w-fit shadow-sm ${
                                  supplier.user?.isActive 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                }`}>
                                  {supplier.user?.isActive ? `✓ ${t('common.active')}` : `✗ ${t('common.inactive')}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-2 items-center">
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await api.get(`/admin/suppliers/${supplier.id}`);
                                      setEditingSupplier(response.data.supplier);
                                    } catch (error: any) {
                                      showToast(error.response?.data?.message || t('msg.failedLoadSupplierDetails'), 'error');
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 font-medium text-xs shadow-sm hover:shadow"
                                  title="Edit Supplier"
                                >
                                  <Edit2 size={14} />
                                  {t('buttons.edit')}
                                </button>
                                {supplier.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => reviewSupplier(supplier.id, 'approve')}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all duration-200 font-medium text-xs shadow-sm hover:shadow"
                                    >
                                      <CheckCircle size={14} />
                                      {t('buttons.approve')}
                                    </button>
                                    <button
                                      onClick={() => reviewSupplier(supplier.id, 'reject')}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-all duration-200 font-medium text-xs shadow-sm hover:shadow"
                                    >
                                      <XCircle size={14} />
                                      {t('buttons.reject')}
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => toggleSupplierStatus(supplier.id, supplier.user?.isActive || false)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 font-medium text-xs shadow-sm hover:shadow ${
                                    supplier.user?.isActive
                                      ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                                      : 'bg-green-50 hover:bg-green-100 text-green-700'
                                  }`}
                                  title={supplier.user?.isActive ? 'Deactivate Supplier' : 'Activate Supplier'}
                                >
                                  {supplier.user?.isActive ? (
                                    <>
                                      <PowerOff size={14} />
                                      {t('buttons.deactivate')}
                                    </>
                                  ) : (
                                    <>
                                      <Power size={14} />
                                      {t('buttons.activate')}
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => setResetPasswordSupplier(supplier)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all duration-200 font-medium text-xs shadow-sm hover:shadow"
                                  title="Reset Password"
                                >
                                  <Key size={14} />
                                  {t('buttons.resetPassword')}
                                </button>
                              </div>
                            </td>
                          </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {suppliers.length > itemsPerPage && (
                      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                        <div className="text-sm text-gray-700">
                          Showing <span className="font-semibold">{(supplierPage - 1) * itemsPerPage + 1}</span> to{' '}
                          <span className="font-semibold">{Math.min(supplierPage * itemsPerPage, suppliers.length)}</span> of{' '}
                          <span className="font-semibold">{suppliers.length}</span> suppliers
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSupplierPage(prev => Math.max(1, prev - 1))}
                            disabled={supplierPage === 1}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
                          >
                            <ChevronLeft size={16} />
                            {t('buttons.previous')}
                          </button>
                          <div className="flex gap-1">
                            {Array.from({ length: Math.ceil(suppliers.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setSupplierPage(page)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                  supplierPage === page
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                                    : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setSupplierPage(prev => Math.min(Math.ceil(suppliers.length / itemsPerPage), prev + 1))}
                            disabled={supplierPage >= Math.ceil(suppliers.length / itemsPerPage)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
                          >
                            {t('buttons.next')}
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!loading && activeTab === 'entities' && (
              <div className="px-3 py-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('sections.entityManagement')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('sections.manageEntities')}</p>
                  </div>
                  <button
                    onClick={() => setShowCreateEntity(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  >
                    <Plus size={20} />
                    {t('actions.createEntity')}
                  </button>
                </div>

                {procuringEntities.length === 0 ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-purple-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-200 to-purple-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Building2 className="text-purple-400" size={40} />
                    </div>
                    <p className="text-lg font-semibold text-gray-700">{t('sections.noEntitiesFound')}</p>
                    <p className="text-sm text-gray-500 mt-2">{t('sections.createFirstEntity')}</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-xl border border-gray-200/50 shadow-inner">
                      <table className="min-w-full divide-y divide-gray-200/50">
                        <thead className="bg-gradient-to-r from-gray-50 to-purple-50/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('columns.entityName')}</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('columns.contact')}</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('columns.status')}</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">{t('columns.actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200/50">
                          {procuringEntities
                            .slice((entityPage - 1) * itemsPerPage, entityPage * itemsPerPage)
                            .map((entity) => (
                          <tr key={entity.id} className="hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-transparent transition-all duration-150">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                                  {entity.entityName?.[0]?.toUpperCase()}
                                </div>
                                <div className="text-sm font-semibold text-gray-900">{entity.entityName}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{entity.user?.firstName} {entity.user?.lastName}</div>
                              <div className="text-sm text-gray-500">{entity.user?.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-2">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full w-fit shadow-sm ${
                                  entity.user?.isActive 
                                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                                }`}>
                                  {entity.user?.isActive ? `✓ ${t('common.active')}` : `✗ ${t('common.inactive')}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-2 items-center">
                                <button
                                  onClick={async () => {
                                    try {
                                      const response = await api.get(`/admin/procuring-entities/${entity.id}`);
                                      setEditingEntity(response.data.procuringEntity);
                                    } catch (error: any) {
                                      showToast(error.response?.data?.message || t('msg.failedLoadEntityDetails'), 'error');
                                    }
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all duration-200 font-medium text-xs shadow-sm hover:shadow"
                                  title="Edit Entity"
                                >
                                  <Edit2 size={14} />
                                  {t('buttons.edit')}
                                </button>
                                <button
                                  onClick={() => toggleEntityStatus(entity.id, entity.user?.isActive || false)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 font-medium text-xs shadow-sm hover:shadow ${
                                    entity.user?.isActive
                                      ? 'bg-orange-50 hover:bg-orange-100 text-orange-700'
                                      : 'bg-green-50 hover:bg-green-100 text-green-700'
                                  }`}
                                  title={entity.user?.isActive ? 'Deactivate Entity' : 'Activate Entity'}
                                >
                                  {entity.user?.isActive ? (
                                    <>
                                      <PowerOff size={14} />
                                      {t('buttons.deactivate')}
                                    </>
                                  ) : (
                                    <>
                                      <Power size={14} />
                                      {t('buttons.activate')}
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => setResetPasswordEntity(entity)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-all duration-200 font-medium text-xs shadow-sm hover:shadow"
                                  title="Reset Password"
                                >
                                  <Key size={14} />
                                  {t('buttons.resetPassword')}
                                </button>
                              </div>
                            </td>
                          </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {procuringEntities.length > itemsPerPage && (
                      <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                        <div className="text-sm text-gray-700">
                          Showing <span className="font-semibold">{(entityPage - 1) * itemsPerPage + 1}</span> to{' '}
                          <span className="font-semibold">{Math.min(entityPage * itemsPerPage, procuringEntities.length)}</span> of{' '}
                          <span className="font-semibold">{procuringEntities.length}</span> entities
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEntityPage(prev => Math.max(1, prev - 1))}
                            disabled={entityPage === 1}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
                          >
                            <ChevronLeft size={16} />
                            {t('buttons.previous')}
                          </button>
                          <div className="flex gap-1">
                            {Array.from({ length: Math.ceil(procuringEntities.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setEntityPage(page)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                  entityPage === page
                                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                                    : 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setEntityPage(prev => Math.min(Math.ceil(procuringEntities.length / itemsPerPage), prev + 1))}
                            disabled={entityPage >= Math.ceil(procuringEntities.length / itemsPerPage)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1"
                          >
                            {t('buttons.next')}
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {!loading && activeTab === 'announcements' && (
              <div className="px-3 py-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('sections.announcementManagement')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('sections.manageAnnouncements')}</p>
                  </div>
                  <button
                    onClick={() => setShowCreateAnnouncement(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                  >
                    <Plus size={20} />
                    {t('dashboard.createAnnouncement')}
                  </button>
                </div>

                {(!announcements || announcements.length === 0) ? (
                  <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-orange-50/30 rounded-xl border-2 border-dashed border-gray-300">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-200 to-orange-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="text-orange-400" size={40} />
                    </div>
                    <p className="text-lg font-semibold text-gray-700">No announcements found</p>
                    <p className="text-sm text-gray-500 mt-2">Create your first announcement to notify users</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {(announcements || []).map((announcement) => {
                      const expiry = announcement?.expiryDate;
                      const isExpired = expiry ? new Date(expiry) < new Date() : false;
                      return (
                        <div key={announcement.id} className="group bg-gradient-to-br from-white to-orange-50/30 rounded-2xl p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-200/20 to-transparent rounded-full -mr-16 -mt-16"></div>
                          <div className="relative">
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Bell className="text-white" size={24} />
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingAnnouncement(announcement)}
                                  className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to delete this announcement?')) {
                                      api.delete(`/announcements/${announcement.id}`)
                                        .then(() => {
                                          showToast(t('msg.announcementDeleted'), 'success');
                                          fetchAnnouncements(false);
                                        })
                                        .catch((err: any) => showToast(err.response?.data?.message || t('msg.failedDeleteAnnouncement'), 'error'));
                                    }
                                  }}
                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                                <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                                  isExpired 
                                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' 
                                    : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                }`}>
                                  {isExpired ? t('common.expired') : t('common.active')}
                                </span>
                              </div>
                            </div>
                            <h3 className="font-bold text-xl text-gray-900 mb-2">{announcement?.title ?? 'Untitled'}</h3>
                            <p className="text-gray-600 mb-4 line-clamp-3">{announcement?.content ?? ''}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-gray-200/50">
                              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                                {announcement?.targetAudience === 'all' ? t('common.allUsers') : 
                                 announcement?.targetAudience === 'suppliers' ? t('common.suppliersOnly') : 
                                 t('nav.procuringEntities')}
                              </span>
                              <span className="text-xs text-gray-500 font-medium">
                                {t('columns.expires')}: {expiry ? new Date(expiry).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Supplier Modal */}
      {showCreateSupplier && (
        <CreateSupplierModal
          onClose={() => setShowCreateSupplier(false)}
          onSuccess={() => {
            setShowCreateSupplier(false);
            fetchSuppliers(false);
            // Go to last page to see the new supplier
            const totalPages = Math.ceil((suppliers.length + 1) / itemsPerPage);
            setSupplierPage(totalPages);
          }}
        />
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <EditSupplierModal
          supplier={editingSupplier}
          onClose={() => setEditingSupplier(null)}
          onSuccess={() => {
            setEditingSupplier(null);
            fetchSuppliers(false);
          }}
        />
      )}

      {/* Create Entity Modal */}
      {showCreateEntity && (
        <CreateEntityModal
          onClose={() => setShowCreateEntity(false)}
          onSuccess={() => {
            setShowCreateEntity(false);
            fetchProcuringEntities(false);
            // Go to last page to see the new entity
            const totalPages = Math.ceil((procuringEntities.length + 1) / itemsPerPage);
            setEntityPage(totalPages);
          }}
        />
      )}

      {/* Edit Entity Modal */}
      {editingEntity && (
        <EditEntityModal
          entity={editingEntity}
          onClose={() => setEditingEntity(null)}
          onSuccess={() => {
            setEditingEntity(null);
            fetchProcuringEntities(false);
          }}
        />
      )}

      {/* Create Announcement Modal */}
      {showCreateAnnouncement && (
        <CreateAnnouncementModal
          onClose={() => setShowCreateAnnouncement(false)}
          onSuccess={() => {
            setShowCreateAnnouncement(false);
            fetchAnnouncements(false);
          }}
        />
      )}

      {/* Edit Announcement Modal */}
      {editingAnnouncement && (
        <EditAnnouncementModal
          announcement={editingAnnouncement}
          onClose={() => setEditingAnnouncement(null)}
          onSuccess={() => {
            setEditingAnnouncement(null);
            fetchAnnouncements(false);
          }}
        />
      )}

      {/* Admin Profile Modal */}
      {showProfileModal && (
        <AdminProfileModal
          onClose={() => setShowProfileModal(false)}
        />
      )}

      {/* Reset Supplier Password Modal */}
      {resetPasswordSupplier && (
        <ResetPasswordModal
          type="supplier"
          name={`${resetPasswordSupplier.user?.firstName} ${resetPasswordSupplier.user?.lastName}`}
          id={resetPasswordSupplier.id}
          onClose={() => setResetPasswordSupplier(null)}
          onSuccess={() => {
            setResetPasswordSupplier(null);
            showToast(t('msg.supplierPasswordReset'), 'success');
          }}
        />
      )}

      {/* Reset Procuring Entity Password Modal */}
      {resetPasswordEntity && (
        <ResetPasswordModal
          type="procuring entity"
          name={`${resetPasswordEntity.user?.firstName} ${resetPasswordEntity.user?.lastName}`}
          id={resetPasswordEntity.id}
          onClose={() => setResetPasswordEntity(null)}
          onSuccess={() => {
            setResetPasswordEntity(null);
            showToast(t('msg.entityPasswordReset'), 'success');
          }}
        />
      )}
    </div>
  );
};

// Admin Profile Modal Component
const AdminProfileModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validatePasswordForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!passwordData.currentPassword || passwordData.currentPassword.trim() === '') {
      newErrors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword || passwordData.newPassword.trim() === '') {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!passwordData.confirmPassword || passwordData.confirmPassword.trim() === '') {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    console.log('Validation errors:', newErrors);
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    console.log('Form is valid:', isValid);
    return isValid;
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Form submitted, validating...');
    console.log('Password data:', {
      currentPassword: passwordData.currentPassword ? '***' : 'empty',
      newPassword: passwordData.newPassword ? '***' : 'empty',
      confirmPassword: passwordData.confirmPassword ? '***' : 'empty'
    });
    
    if (!validatePasswordForm()) {
      console.log('Validation failed:', errors);
      showToast(t('msg.fixFormErrors'), 'error');
      return;
    }
    
    setLoading(true);
    try {
      console.log('Sending reset password request to /auth/reset-password');
      console.log('Token available:', !!localStorage.getItem('token'));
      
      const response = await api.put('/auth/reset-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      console.log('Reset password response:', response.data);
      
      // Clear form data and errors
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setErrors({});
      
      // Show success message
      showToast(t('msg.passwordReset'), 'success');
      
      // Close the modal after showing success message
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error('Reset password error:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      // Handle different error scenarios
      let errorMessage = 'Failed to reset password';
      
      if (error.response?.status === 401) {
        // Wrong current password
        errorMessage = error.response.data?.message || 'Current password is incorrect';
        // Set error on current password field
        setErrors({ ...errors, currentPassword: errorMessage });
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        errorMessage = error.response.data.errors[0].msg || error.response.data.errors[0].message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-gradient-to-r from-white to-primary-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">Admin Profile</h3>
              <p className="text-sm text-gray-500 mt-1">Manage your profile and security settings</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XCircle size={24} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-2 font-semibold text-sm transition-all duration-200 relative ${
                activeTab === 'profile'
                  ? 'text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <User size={18} />
                Profile Information
              </div>
              {activeTab === 'profile' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`pb-3 px-2 font-semibold text-sm transition-all duration-200 relative ${
                activeTab === 'password'
                  ? 'text-primary-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock size={18} />
                Reset Password
              </div>
              {activeTab === 'password' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600 to-primary-800"></div>
              )}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="flex-1">
                  <h4 className="text-2xl font-bold text-gray-900">{user?.firstName} {user?.lastName}</h4>
                  <p className="text-gray-600 mt-1">{user?.email}</p>
                  <span className="inline-block mt-3 px-4 py-1.5 bg-gradient-to-r from-primary-100 to-blue-100 text-primary-700 text-sm font-semibold rounded-lg">
                    {t('nav.administrator')}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.firstName')}</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {user?.firstName || 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.lastName')}</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {user?.lastName || 'N/A'}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.emailAddress')}</label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {user?.email || 'N/A'}
                  </div>
                </div>
                {user?.phone && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.phoneNumber')}</label>
                    <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                      {user.phone}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordReset} className="space-y-5">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('forms.currentPassword')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, currentPassword: e.target.value });
                      if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' });
                    }}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                      errors.currentPassword ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder={t('placeholders.enterCurrentPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('forms.newPassword')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, newPassword: e.target.value });
                      if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                    }}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                      errors.newPassword ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder={t('placeholders.enterNewPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('forms.confirmPassword')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => {
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                    }}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                      errors.confirmPassword ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder={t('placeholders.confirmNewPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>
              
              <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/50">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Reset Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

// Create Supplier Modal Component
const CreateSupplierModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/admin/suppliers', formData);
      showToast(t('msg.supplierCreated'), 'success');
      onSuccess();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedCreateSupplier'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200/50 transform">
        <div className="sticky top-0 bg-gradient-to-r from-white to-blue-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">{t('actions.createNewSupplier')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('actions.fillSupplierInfo')}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('forms.firstName')} <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value });
                  if (errors.firstName) setErrors({ ...errors, firstName: '' });
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.firstName ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder={t('placeholders.enterFirstName')}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('forms.lastName')} <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value });
                  if (errors.lastName) setErrors({ ...errors, lastName: '' });
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.lastName ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder={t('placeholders.enterLastName')}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('forms.emailAddress')} <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.email ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
              placeholder={t('placeholders.supplierEmail')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{t('helpers.usedForLogin')}</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('forms.password')} <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.password ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
              placeholder={t('placeholders.minCharacters')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{t('helpers.minCharsRequired')}</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('forms.phoneNumber')} <span className="text-gray-400">({t('forms.optional')})</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
              placeholder={t('placeholders.phoneExample')}
            />
            <p className="mt-1 text-xs text-gray-500">{t('helpers.includeCountryCode')}</p>
          </div>

          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
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
                  <Plus size={18} />
                  {t('actions.createSupplier')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create Entity Modal Component
const CreateEntityModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    entityName: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.entityName.trim()) {
      newErrors.entityName = 'Entity name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/admin/procuring-entities', formData);
      showToast(t('msg.entityCreated'), 'success');
      onSuccess();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedCreateEntity'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{t('actions.createEntity')}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('actions.createEntityAccount')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="entityName" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('forms.entityName')} <span className="text-red-500">*</span>
            </label>
            <input
              id="entityName"
              type="text"
              required
              value={formData.entityName}
              onChange={(e) => {
                setFormData({ ...formData, entityName: e.target.value });
                if (errors.entityName) setErrors({ ...errors, entityName: '' });
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${
                errors.entityName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('placeholders.enterEntityName')}
            />
            {errors.entityName && (
              <p className="mt-1 text-sm text-red-600">{errors.entityName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('forms.firstName')} <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value });
                  if (errors.firstName) setErrors({ ...errors, firstName: '' });
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.firstName ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder={t('placeholders.enterFirstName')}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('forms.lastName')} <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value });
                  if (errors.lastName) setErrors({ ...errors, lastName: '' });
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.lastName ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder={t('placeholders.enterLastName')}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('forms.emailAddress')} <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.email ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
              placeholder={t('placeholders.entityEmail')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{t('helpers.usedForLogin')}</p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('forms.password')} <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (errors.password) setErrors({ ...errors, password: '' });
              }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.password ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
              placeholder={t('placeholders.minCharacters')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{t('helpers.minCharsRequired')}</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('forms.phoneNumber')} <span className="text-gray-400">({t('forms.optional')})</span>
            </label>
            <input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
              placeholder={t('placeholders.phoneExample')}
            />
            <p className="mt-1 text-xs text-gray-500">{t('helpers.includeCountryCode')}</p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('actions.creating')}
                </>
              ) : (
                <>
                  <Plus size={18} />
                  {t('actions.createEntity')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Create Announcement Modal Component
const CreateAnnouncementModal = ({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'all',
    expiryDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = t('validation.titleRequired');
    }
    
    if (!formData.content.trim()) {
      newErrors.content = t('validation.contentRequired');
    }
    
    if (!formData.expiryDate) {
      newErrors.expiryDate = t('validation.expiryRequired');
    } else {
      const expiry = new Date(formData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiry < today) {
        newErrors.expiryDate = t('validation.expiryMustBeFuture');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/announcements', formData);
      showToast(t('msg.announcementCreated'), 'success');
      onSuccess();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedCreateAnnouncement'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{t('dashboard.createAnnouncement')}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('dashboard.shareInfoWithUsers')}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('forms.announcementTitle')} <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: '' });
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${
                errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('placeholders.enterAnnouncementTitle')}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">
              {t('forms.announcementContent')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              required
              rows={6}
              value={formData.content}
              onChange={(e) => {
                setFormData({ ...formData, content: e.target.value });
                if (errors.content) setErrors({ ...errors, content: '' });
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none ${
                errors.content ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('placeholders.enterAnnouncementDetails')}
            />
            {errors.content && (
              <p className="mt-1 text-sm text-red-600">{errors.content}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{t('helpers.clearAndDetailed')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="targetAudience" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('forms.targetAudience')} <span className="text-red-500">*</span>
              </label>
              <select
                id="targetAudience"
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition bg-white"
              >
                <option value="all">{t('common.allUsers')}</option>
                <option value="suppliers">{t('common.suppliersOnly')}</option>
                <option value="procuring_entities">{t('common.procuringEntitiesOnly')}</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">{t('forms.whoShouldSee')}</p>
            </div>

            <div>
              <label htmlFor="expiryDate" className="block text-sm font-semibold text-gray-700 mb-2">
                {t('forms.expiryDate')} <span className="text-red-500">*</span>
              </label>
              <DateOnlyPicker
                id="expiryDate"
                value={formData.expiryDate}
                onChange={(dateStr) => {
                  setFormData({ ...formData, expiryDate: dateStr });
                  if (errors.expiryDate) setErrors({ ...errors, expiryDate: '' });
                }}
                minDate={minDate}
                placeholder={t('forms.selectExpiryDate')}
                error={!!errors.expiryDate}
                required
              />
              {errors.expiryDate && (
                <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">{t('forms.whenExpire')}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('actions.creating')}
                </>
              ) : (
                <>
                  <Plus size={18} />
                  {t('dashboard.createAnnouncement')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Announcement Modal Component
const EditAnnouncementModal = ({ announcement, onClose, onSuccess }: { announcement: Announcement; onClose: () => void; onSuccess: () => void }) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const safeExpiry = announcement?.expiryDate
    ? (typeof announcement.expiryDate === 'string'
        ? announcement.expiryDate.slice(0, 10)
        : new Date(announcement.expiryDate).toISOString().slice(0, 10))
    : '';
  const [formData, setFormData] = useState({
    title: announcement?.title ?? '',
    content: announcement?.content ?? '',
    targetAudience: announcement?.targetAudience || 'all',
    expiryDate: safeExpiry,
    isActive: announcement?.isActive !== false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      await api.put(`/announcements/${announcement.id}`, formData);
      showToast(t('msg.announcementUpdated'), 'success');
      onSuccess();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedUpdateAnnouncement'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">{t('actions.editAnnouncement')}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <XCircle size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">{t('actions.updateAnnouncementDetails')}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.announcementTitle')} <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => { setFormData({ ...formData, title: e.target.value }); setErrors({ ...errors, title: '' }); }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 ${errors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              placeholder={t('placeholders.enterAnnouncementTitle')}
            />
            {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.announcementContent')} <span className="text-red-500">*</span></label>
            <textarea
              rows={6}
              value={formData.content}
              onChange={(e) => { setFormData({ ...formData, content: e.target.value }); setErrors({ ...errors, content: '' }); }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 resize-none ${errors.content ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              placeholder={t('placeholders.enterAnnouncementDetailsShort')}
            />
            {errors.content && <p className="mt-1 text-sm text-red-600">{errors.content}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.targetAudience')} <span className="text-red-500">*</span></label>
              <select
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white"
              >
                <option value="all">{t('common.allUsers')}</option>
                <option value="suppliers">{t('common.suppliersOnly')}</option>
                <option value="procuring_entities">{t('common.procuringEntitiesOnly')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('forms.expiryDate')} <span className="text-red-500">*</span></label>
              <DateOnlyPicker
                value={formData.expiryDate}
                onChange={(dateStr) => { setFormData({ ...formData, expiryDate: dateStr }); setErrors({ ...errors, expiryDate: '' }); }}
                minDate={minDate}
                placeholder={t('forms.selectExpiryDate')}
                error={!!errors.expiryDate}
                required
              />
              {errors.expiryDate && <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-announcement-active"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="edit-announcement-active" className="text-sm font-medium text-gray-700">{t('common.activeVisible')}</label>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={loading} className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
              {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> {t('actions.updating')}</> : <>{t('actions.saveChanges')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Supplier Modal Component
const EditSupplierModal = ({ supplier, onClose, onSuccess }: { supplier: Supplier & { address?: string; city?: string; country?: string; turnover?: number; employeeCount?: number; yearEstablished?: number }; onClose: () => void; onSuccess: () => void }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    companyName: '',
    address: '',
    city: '',
    country: '',
    turnover: '',
    employeeCount: '',
    yearEstablished: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when supplier prop changes
  useEffect(() => {
    if (supplier) {
      setFormData({
        firstName: supplier?.user?.firstName || '',
        lastName: supplier?.user?.lastName || '',
        email: supplier?.user?.email || '',
        phone: supplier?.user?.phone || '',
        companyName: supplier?.companyName || '',
        address: supplier?.address || '',
        city: supplier?.city || '',
        country: supplier?.country || '',
        turnover: supplier?.turnover?.toString() || '',
        employeeCount: supplier?.employeeCount?.toString() || '',
        yearEstablished: supplier?.yearEstablished?.toString() || ''
      });
    }
  }, [supplier]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      // Prepare data for API - convert empty strings to null for optional fields
      const updateData: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        companyName: formData.companyName.trim()
      };

      // Add optional fields only if they have values
      if (formData.phone.trim()) updateData.phone = formData.phone.trim();
      if (formData.address.trim()) updateData.address = formData.address.trim();
      if (formData.city.trim()) updateData.city = formData.city.trim();
      if (formData.country.trim()) updateData.country = formData.country.trim();
      if (formData.turnover && !isNaN(parseFloat(formData.turnover))) {
        updateData.turnover = parseFloat(formData.turnover);
      }
      if (formData.employeeCount && !isNaN(parseInt(formData.employeeCount))) {
        updateData.employeeCount = parseInt(formData.employeeCount);
      }
      if (formData.yearEstablished && !isNaN(parseInt(formData.yearEstablished))) {
        updateData.yearEstablished = parseInt(formData.yearEstablished);
      }

      console.log('Updating supplier with data:', updateData);
      const response = await api.put(`/admin/suppliers/${supplier.id}`, updateData);
      console.log('Update response:', response.data);
      showToast(t('msg.supplierUpdated'), 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Update supplier error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update supplier';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">Edit Supplier</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Update supplier information</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="edit-firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value });
                  if (errors.firstName) setErrors({ ...errors, firstName: '' });
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.firstName ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="edit-lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value });
                  if (errors.lastName) setErrors({ ...errors, lastName: '' });
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.lastName ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="edit-email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.email ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-phone" className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              id="edit-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
            />
          </div>

          <div>
            <label htmlFor="edit-companyName" className="block text-sm font-semibold text-gray-700 mb-2">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-companyName"
              type="text"
              required
              value={formData.companyName}
              onChange={(e) => {
                setFormData({ ...formData, companyName: e.target.value });
                if (errors.companyName) setErrors({ ...errors, companyName: '' });
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${
                errors.companyName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label htmlFor="edit-city" className="block text-sm font-semibold text-gray-700 mb-2">
                City
              </label>
              <input
                id="edit-city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>
            <div>
              <label htmlFor="edit-country" className="block text-sm font-semibold text-gray-700 mb-2">
                Country
              </label>
              <input
                id="edit-country"
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>
            <div>
              <label htmlFor="edit-turnover" className="block text-sm font-semibold text-gray-700 mb-2">
                Turnover
              </label>
              <input
                id="edit-turnover"
                type="number"
                value={formData.turnover}
                onChange={(e) => setFormData({ ...formData, turnover: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="edit-employeeCount" className="block text-sm font-semibold text-gray-700 mb-2">
                Employee Count
              </label>
              <input
                id="edit-employeeCount"
                type="number"
                value={formData.employeeCount}
                onChange={(e) => setFormData({ ...formData, employeeCount: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>
            <div>
              <label htmlFor="edit-yearEstablished" className="block text-sm font-semibold text-gray-700 mb-2">
                Year Established
              </label>
              <input
                id="edit-yearEstablished"
                type="number"
                value={formData.yearEstablished}
                onChange={(e) => setFormData({ ...formData, yearEstablished: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
                placeholder="YYYY"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-address" className="block text-sm font-semibold text-gray-700 mb-2">
              Address
            </label>
            <textarea
              id="edit-address"
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Edit2 size={18} />
                  Update Supplier
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Edit Entity Modal Component
const EditEntityModal = ({ entity, onClose, onSuccess }: { entity: ProcuringEntity & { address?: string; city?: string; country?: string; companyId?: string }; onClose: () => void; onSuccess: () => void }) => {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    entityName: '',
    address: '',
    city: '',
    country: '',
    companyId: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Update form data when entity prop changes
  useEffect(() => {
    if (entity) {
      setFormData({
        firstName: entity?.user?.firstName || '',
        lastName: entity?.user?.lastName || '',
        email: entity?.user?.email || '',
        phone: entity?.user?.phone || '',
        entityName: entity?.entityName || '',
        address: entity?.address || '',
        city: entity?.city || '',
        country: entity?.country || '',
        companyId: entity?.companyId || ''
      });
    }
  }, [entity]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.entityName.trim()) {
      newErrors.entityName = 'Entity name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      // Prepare data for API - convert empty strings to null for optional fields
      const updateData: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        entityName: formData.entityName.trim()
      };

      // Add optional fields only if they have values
      if (formData.phone.trim()) updateData.phone = formData.phone.trim();
      if (formData.address.trim()) updateData.address = formData.address.trim();
      if (formData.city.trim()) updateData.city = formData.city.trim();
      if (formData.country.trim()) updateData.country = formData.country.trim();
      if (formData.companyId) updateData.companyId = formData.companyId;

      console.log('Updating entity with data:', updateData);
      const response = await api.put(`/admin/procuring-entities/${entity.id}`, updateData);
      console.log('Update response:', response.data);
      showToast(t('msg.entityUpdated'), 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Update entity error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update procuring entity';
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto transform">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">Edit Procuring Entity</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle size={24} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Update procuring entity information</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="edit-entity-name" className="block text-sm font-semibold text-gray-700 mb-2">
              Entity Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-entity-name"
              type="text"
              required
              value={formData.entityName}
              onChange={(e) => {
                setFormData({ ...formData, entityName: e.target.value });
                if (errors.entityName) setErrors({ ...errors, entityName: '' });
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition ${
                errors.entityName ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            {errors.entityName && (
              <p className="mt-1 text-sm text-red-600">{errors.entityName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="edit-entity-firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-entity-firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => {
                  setFormData({ ...formData, firstName: e.target.value });
                  if (errors.firstName) setErrors({ ...errors, firstName: '' });
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.firstName ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="edit-entity-lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-entity-lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => {
                  setFormData({ ...formData, lastName: e.target.value });
                  if (errors.lastName) setErrors({ ...errors, lastName: '' });
                }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.lastName ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="edit-entity-email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-entity-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.email ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-entity-phone" className="block text-sm font-semibold text-gray-700 mb-2">
              Phone Number <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              id="edit-entity-phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="edit-entity-city" className="block text-sm font-semibold text-gray-700 mb-2">
                City
              </label>
              <input
                id="edit-entity-city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>
            <div>
              <label htmlFor="edit-entity-country" className="block text-sm font-semibold text-gray-700 mb-2">
                Country
              </label>
              <input
                id="edit-entity-country"
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-entity-address" className="block text-sm font-semibold text-gray-700 mb-2">
              Address
            </label>
            <textarea
              id="edit-entity-address"
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Edit2 size={18} />
                  Update Entity
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Reset Password Modal Component (Admin)
const ResetPasswordModal = ({
  type,
  name,
  id,
  onClose,
  onSuccess
}: {
  type: 'supplier' | 'procuring entity';
  name: string;
  id: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { showToast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newPassword || newPassword.trim() === '') {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword || confirmPassword.trim() === '') {
      newErrors.confirmPassword = 'Please confirm the new password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      const endpoint = type === 'supplier' 
        ? `/admin/suppliers/${id}/reset-password`
        : `/admin/procuring-entities/${id}/reset-password`;
      
      await api.put(endpoint, { newPassword });
      showToast(type === 'supplier' ? t('msg.supplierPasswordReset') : t('msg.entityPasswordReset'), 'success');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      onSuccess();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedResetPassword'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full transform">
        <div className="sticky top-0 bg-gradient-to-r from-white to-purple-50/30 border-b border-gray-200/50 px-6 py-5 backdrop-blur-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">Reset Password</h3>
              <p className="text-sm text-gray-500 mt-1">Reset password for {name}</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            >
              <XCircle size={24} />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleResetPassword} className="p-6 space-y-5">
          <div>
            <label htmlFor="reset-newPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="reset-newPassword"
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                }}
                className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.newPassword ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Enter new password (min. 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="reset-confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm New Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="reset-confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                }}
                className={`w-full px-4 py-3 pr-12 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 ${
                  errors.confirmPassword ? 'border-red-400 bg-red-50/50' : 'border-gray-300 hover:border-gray-400'
                }`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>
          
          <div className="flex gap-3 justify-end pt-6 border-t border-gray-200/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Resetting...
                </>
              ) : (
                <>
                  <Key size={18} />
                  Reset Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;
