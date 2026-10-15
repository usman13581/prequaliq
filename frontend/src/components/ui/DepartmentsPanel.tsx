import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Building, Mail, Users } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useEntitlement } from '../../contexts/EntitlementContext';
import { QuestionnaireSlimRow, StatusBadge, RowActionButton } from '../questionnaires/QuestionnaireSlimRow';
import { useListPagination } from '../../hooks/useListPagination';
import { ListPagination } from './ListPagination';

type Department = {
  id: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
};

type OrgInvite = {
  id: string;
  email: string;
  membershipRole: string;
  status: string;
  department?: { id: string; name: string } | null;
  expiresAt?: string | null;
};

type OrgMember = {
  id: string;
  membershipRole: string;
  user?: { id: string; firstName?: string; lastName?: string; email?: string };
  department?: { id: string; name: string } | null;
};

function roleLabel(role: string, t: (key: string) => string) {
  return role === 'admin' || role === 'owner' ? t('departments.roleAdmin') : t('departments.roleMember');
}

export function DepartmentsPanel() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { enabled } = useEntitlement('platform.multi_org');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteDeptId, setInviteDeptId] = useState('');
  const [loading, setLoading] = useState(true);

  const pendingInvites = invites.filter((i) => i.status === 'pending');
  const deptPager = useListPagination(departments);
  const invitePager = useListPagination(pendingInvites);
  const memberPager = useListPagination(members);

  const load = async () => {
    try {
      setLoading(true);
      const [dRes, iRes, mRes] = await Promise.all([
        api.get('/departments/mine'),
        api.get('/org-invites/mine').catch(() => ({ data: { invites: [] } })),
        api.get('/org-invites/members').catch(() => ({ data: { members: [] } }))
      ]);
      setDepartments(dRes.data.departments || []);
      setInvites(iRes.data.invites || []);
      setMembers(mRes.data.members || []);
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedLoadDepartments'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center text-sm text-muted">
        {t('departments.notEnabled')}
      </div>
    );
  }

  const create = async () => {
    if (!name.trim()) return;
    try {
      await api.post('/departments/mine', { name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      showToast(t('msg.departmentCreated'), 'success');
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedCreateDepartment'), 'error');
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/departments/${id}`);
      showToast(t('msg.departmentDeleted'), 'success');
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('msg.failedDeleteDepartment'), 'error');
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    try {
      await api.post('/org-invites', {
        email: inviteEmail.trim(),
        membershipRole: inviteRole,
        departmentId: inviteDeptId || null
      });
      setInviteEmail('');
      showToast(t('departments.inviteSent'), 'success');
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('departments.inviteFailed'), 'error');
    }
  };

  const revokeInvite = async (id: string) => {
    try {
      await api.delete(`/org-invites/${id}`);
      showToast(t('departments.inviteRevoked'), 'success');
      load();
    } catch (error: any) {
      showToast(error.response?.data?.message || t('departments.inviteFailed'), 'error');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-foreground">{t('departments.title')}</h2>
        <p className="text-sm text-muted mt-0.5">{t('departments.nav')}</p>
      </div>

      {/* Compact create row */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-white rounded-lg border border-border px-3 py-2">
        <Building size={16} className="text-muted shrink-0 hidden sm:block" />
        <input
          className="input-brand flex-1 min-w-0 !py-1.5 !text-sm"
          placeholder={t('departments.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <input
          className="input-brand flex-1 min-w-0 !py-1.5 !text-sm"
          placeholder={t('departments.descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <button
          type="button"
          onClick={create}
          className="btn-save px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus size={14} />
          {t('departments.add')}
        </button>
      </div>

      <div className="space-y-1">
        {loading ? (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        ) : departments.length === 0 ? (
          <div className="text-center py-8 rounded-lg border border-dashed border-border text-sm text-muted">
            {t('departments.empty')}
          </div>
        ) : (
          <>
            {deptPager.paginatedItems.map((d) => (
              <QuestionnaireSlimRow
                key={d.id}
                compact
                title={d.name}
                description={d.description || undefined}
                meta={
                  <StatusBadge tone={d.isActive === false ? 'gray' : 'green'}>
                    {d.isActive === false ? t('common.inactive') : t('common.active')}
                  </StatusBadge>
                }
                trailing={
                  <RowActionButton variant="danger" onClick={() => remove(d.id)}>
                    <Trash2 size={12} />
                    {t('common.delete')}
                  </RowActionButton>
                }
              />
            ))}
            <ListPagination
              page={deptPager.page}
              pageSize={deptPager.pageSize}
              total={deptPager.total}
              onPageChange={deptPager.setPage}
              onPageSizeChange={deptPager.setPageSize}
              itemLabel={t('departments.nav').toLowerCase()}
            />
          </>
        )}
      </div>

      {/* Invite org users — compact */}
      <div className="space-y-2 pt-1">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Mail size={15} />
          {t('departments.inviteTitle')}
        </h3>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center bg-white rounded-lg border border-border px-3 py-2">
          <input
            className="input-brand flex-1 min-w-0 !py-1.5 !text-sm"
            type="email"
            placeholder={t('departments.inviteEmail')}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendInvite()}
          />
          <select
            className="input-brand sm:w-32 !py-1.5 !text-sm"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
          >
            <option value="member">{t('departments.roleMember')}</option>
            <option value="admin">{t('departments.roleAdmin')}</option>
          </select>
          <select
            className="input-brand sm:w-40 !py-1.5 !text-sm"
            value={inviteDeptId}
            onChange={(e) => setInviteDeptId(e.target.value)}
          >
            <option value="">{t('departments.noDepartment')}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={sendInvite}
            className="btn-save px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 shrink-0"
          >
            <Mail size={14} />
            {t('departments.sendInvite')}
          </button>
        </div>
        <div className="space-y-1">
          {pendingInvites.length === 0 ? (
            <p className="text-xs text-muted px-1 py-2">{t('departments.noPendingInvites')}</p>
          ) : (
            <>
              {invitePager.paginatedItems.map((inv) => (
                <QuestionnaireSlimRow
                  key={inv.id}
                  compact
                  title={inv.email}
                  description={inv.department?.name}
                  meta={
                    <>
                      <StatusBadge tone={inv.membershipRole === 'admin' ? 'blue' : 'gray'}>
                        {roleLabel(inv.membershipRole, t)}
                      </StatusBadge>
                      <StatusBadge tone="yellow">{t('departments.inviteStatus.pending')}</StatusBadge>
                    </>
                  }
                  trailing={
                    <RowActionButton variant="danger" onClick={() => revokeInvite(inv.id)}>
                      {t('departments.revoke')}
                    </RowActionButton>
                  }
                />
              ))}
              <ListPagination
                page={invitePager.page}
                pageSize={invitePager.pageSize}
                total={invitePager.total}
                onPageChange={invitePager.setPage}
                onPageSizeChange={invitePager.setPageSize}
                itemLabel={t('departments.inviteTitle').toLowerCase()}
              />
            </>
          )}
        </div>
      </div>

      {/* Members */}
      <div className="space-y-2 pt-1">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <Users size={15} />
          {t('departments.membersTitle')}
        </h3>
        <div className="space-y-1">
          {members.length === 0 ? (
            <p className="text-xs text-muted px-1 py-2">{t('departments.noMembers')}</p>
          ) : (
            <>
              {memberPager.paginatedItems.map((m) => (
                <QuestionnaireSlimRow
                  key={m.id}
                  compact
                  title={[m.user?.firstName, m.user?.lastName].filter(Boolean).join(' ') || m.user?.email || '—'}
                  description={m.user?.email}
                  meta={
                    <>
                      <StatusBadge tone={m.membershipRole === 'admin' || m.membershipRole === 'owner' ? 'blue' : 'gray'}>
                        {roleLabel(m.membershipRole, t)}
                      </StatusBadge>
                      {m.department ? <span>{m.department.name}</span> : null}
                    </>
                  }
                />
              ))}
              <ListPagination
                page={memberPager.page}
                pageSize={memberPager.pageSize}
                total={memberPager.total}
                onPageChange={memberPager.setPage}
                onPageSizeChange={memberPager.setPageSize}
                itemLabel={t('departments.membersTitle').toLowerCase()}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
