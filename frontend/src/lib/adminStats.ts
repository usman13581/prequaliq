export type SupplierRow = {
  id: string;
  companyName: string;
  status: string;
  user?: { isActive?: boolean; email?: string; firstName?: string; lastName?: string };
  createdAt?: string;
};

export type EntityRow = {
  id: string;
  entityName: string;
  user?: { isActive?: boolean; email?: string; firstName?: string; lastName?: string };
  createdAt?: string;
};

export type AdminDashboardStats = {
  suppliers: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    requalification_required: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  };
  entities: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  };
  questionnaires: {
    total: number;
    active: number;
    overdue: number;
  };
  responses: {
    total: number;
    submitted: number;
    draft: number;
  };
  pendingSubmissions: number;
  recentSuppliers: SupplierRow[];
  recentEntities: EntityRow[];
};

export function statsFromSuppliers(suppliers: SupplierRow[]) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return {
    total: suppliers.length,
    pending: suppliers.filter((s) => s.status === 'pending').length,
    approved: suppliers.filter((s) => s.status === 'approved').length,
    rejected: suppliers.filter((s) => s.status === 'rejected').length,
    requalification_required: suppliers.filter((s) => s.status === 'requalification_required').length,
    active: suppliers.filter((s) => s.user?.isActive !== false).length,
    inactive: suppliers.filter((s) => s.user?.isActive === false).length,
    newThisMonth: suppliers.filter((s) => s.createdAt && new Date(s.createdAt) >= monthStart).length
  };
}

export function statsFromEntities(entities: EntityRow[]) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return {
    total: entities.length,
    active: entities.filter((e) => e.user?.isActive !== false).length,
    inactive: entities.filter((e) => e.user?.isActive === false).length,
    newThisMonth: entities.filter((e) => e.createdAt && new Date(e.createdAt) >= monthStart).length
  };
}
