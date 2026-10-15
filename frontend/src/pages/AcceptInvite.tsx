import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Logo } from '../components/ui/Logo';
import { StatusBadge } from '../components/questionnaires/QuestionnaireSlimRow';

export default function AcceptInvite() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError(t('departments.inviteInvalid'));
      return;
    }
    api
      .get('/org-invites/preview', { params: { token } })
      .then((res) => setPreview(res.data.invite))
      .catch(() => setError(t('departments.inviteInvalid')));
  }, [token, t]);

  const accept = async () => {
    if (!token || !user) return;
    setBusy(true);
    try {
      await api.post('/org-invites/accept', { token });
      showToast(t('departments.inviteAccepted'), 'success');
      if (user.role === 'supplier') navigate('/supplier');
      else if (user.role === 'procuring_entity') navigate('/procuring-entity');
      else navigate('/');
    } catch (err: any) {
      showToast(err.response?.data?.message || t('departments.inviteFailed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="font-website min-h-screen flex items-center justify-center p-4 relative">
      <div className="login-page-bg" aria-hidden="true" />
      <div className="auth-card relative z-10 max-w-md w-full p-6 space-y-4">
        <Logo />
        <h1 className="text-base font-bold text-foreground">{t('departments.acceptInviteTitle')}</h1>
        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : preview ? (
          <div className="text-sm text-muted space-y-1">
            <p>{t('departments.inviteFor')}: <strong className="text-foreground">{preview.email}</strong></p>
            <p className="flex items-center gap-2 flex-wrap">
              <span>{t('departments.roleMember')}:</span>
              <StatusBadge tone="blue">
                {preview.membershipRole === 'admin' ? t('departments.roleAdmin') : t('departments.roleMember')}
              </StatusBadge>
            </p>
            <p className="flex items-center gap-2 flex-wrap">
              <span>{t('common.status')}:</span>
              <StatusBadge
                tone={
                  preview.status === 'accepted'
                    ? 'green'
                    : preview.status === 'revoked'
                      ? 'red'
                      : 'yellow'
                }
              >
                {t(
                  preview.status === 'accepted'
                    ? 'departments.inviteStatus.accepted'
                    : preview.status === 'revoked'
                      ? 'departments.inviteStatus.revoked'
                      : preview.status === 'expired'
                        ? 'departments.inviteStatus.expired'
                        : 'departments.inviteStatus.pending'
                )}
              </StatusBadge>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted">{t('common.loading')}</p>
        )}

        {!authLoading && !user ? (
          <div className="space-y-2">
            <p className="text-sm text-muted">{t('departments.loginToAccept')}</p>
            <Link className="btn-save inline-flex px-4 py-2 rounded-xl text-sm font-semibold" to={`/login?redirect=${encodeURIComponent(`/accept-invite?token=${token}`)}`}>
              {t('login.submit')}
            </Link>
            <Link className="block text-sm text-primary-700 underline" to="/register">
              {t('register.submit')}
            </Link>
          </div>
        ) : null}

        {user && preview?.status === 'pending' ? (
          <button type="button" disabled={busy || !!error} className="btn-save px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50" onClick={accept}>
            {t('departments.acceptInvite')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
