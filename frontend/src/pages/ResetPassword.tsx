import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Logo } from '../components/ui/Logo';

export default function ResetPassword() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError(t('changePassword.invalidLink'));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('changePassword.minLength'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('changePassword.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password-with-token', { token, newPassword });
      setDone(true);
      showToast(t('changePassword.resetSuccess'), 'success');
    } catch (err: any) {
      setError(err.response?.data?.message || t('changePassword.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-website min-h-screen flex items-center justify-center p-4 relative">
      <div className="login-page-bg" aria-hidden="true" />
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="auth-card relative z-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <Logo to="/login" subtitle={t('login.tagline')} size="lg" />
        </div>

        <h1 className="text-lg font-semibold text-foreground mb-1">{t('changePassword.resetTitle')}</h1>
        <p className="text-sm text-muted mb-5">{t('changePassword.resetSubtitle')}</p>

        {!token ? (
          <div className="space-y-4">
            <p className="text-sm text-red-700">{t('changePassword.invalidLink')}</p>
            <Link to="/login" className="btn-primary inline-flex">
              {t('changePassword.backToLogin')}
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">{t('changePassword.resetSuccessBody')}</p>
            <button type="button" className="btn-primary w-full" onClick={() => navigate('/login')}>
              {t('changePassword.backToLogin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            ) : null}

            <div>
              <label htmlFor="reset-new" className="block text-sm font-medium text-muted mb-1.5">
                {t('changePassword.newPassword')}
              </label>
              <div className="relative">
                <input
                  id="reset-new"
                  type={showNew ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-brand w-full pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted"
                  aria-label={showNew ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-medium text-muted mb-1.5">
                {t('changePassword.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  id="reset-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-brand w-full pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted"
                  aria-label={showConfirm ? t('login.hidePassword') : t('login.showPassword')}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t('common.saving') : t('changePassword.submit')}
            </button>
            <p className="text-center text-sm text-muted">
              <Link to="/login" className="font-medium text-primary-800 hover:underline">
                {t('changePassword.backToLogin')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
