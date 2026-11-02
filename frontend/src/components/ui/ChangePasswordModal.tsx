import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

type Props = {
  open: boolean;
  onClose: () => void;
};

type Mode = 'change' | 'forgot' | 'forgotSent';

export function ChangePasswordModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('change');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMode('change');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotEmail(user?.email || '');
    setError('');
    setLoading(false);
  }, [open, user?.email]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const submitChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      await api.put('/auth/reset-password', { currentPassword, newPassword });
      showToast(t('changePassword.success'), 'success');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || t('changePassword.failed'));
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const email = forgotEmail.trim();
    if (!email) {
      setError(t('changePassword.emailRequired'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setMode('forgotSent');
      showToast(t('changePassword.forgotSentToast'), 'success');
    } catch (err: any) {
      setError(err.response?.data?.message || t('changePassword.forgotFailed'));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10080] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-password-title"
        className="relative w-full max-w-md rounded-xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="mt-0.5 rounded-md bg-primary-50 p-1.5 text-primary-800 shrink-0">
              <KeyRound size={16} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="change-password-title" className="text-base font-semibold text-foreground">
                {mode === 'change'
                  ? t('changePassword.title')
                  : mode === 'forgotSent'
                    ? t('changePassword.forgotSentTitle')
                    : t('changePassword.forgotTitle')}
              </h2>
              <p className="text-xs text-muted mt-0.5">
                {mode === 'change'
                  ? t('changePassword.subtitle')
                  : mode === 'forgotSent'
                    ? t('changePassword.forgotSentSubtitle')
                    : t('changePassword.forgotSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground"
            aria-label={t('common.close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {mode === 'change' ? (
            <form onSubmit={submitChange} className="space-y-3.5">
              <PasswordField
                id="current-password"
                label={t('changePassword.currentPassword')}
                value={currentPassword}
                onChange={setCurrentPassword}
                show={showCurrent}
                onToggleShow={() => setShowCurrent((v) => !v)}
                autoComplete="current-password"
              />
              <PasswordField
                id="new-password"
                label={t('changePassword.newPassword')}
                value={newPassword}
                onChange={setNewPassword}
                show={showNew}
                onToggleShow={() => setShowNew((v) => !v)}
                autoComplete="new-password"
              />
              <PasswordField
                id="confirm-password"
                label={t('changePassword.confirmPassword')}
                value={confirmPassword}
                onChange={setConfirmPassword}
                show={showConfirm}
                onToggleShow={() => setShowConfirm((v) => !v)}
                autoComplete="new-password"
              />

              <div className="pt-1">
                <button
                  type="button"
                  className="text-sm font-medium text-primary-800 hover:underline"
                  onClick={() => {
                    setError('');
                    setMode('forgot');
                  }}
                >
                  {t('changePassword.forgotLink')}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" className="btn-ghost" onClick={onClose}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? t('common.saving') : t('changePassword.submit')}
                </button>
              </div>
            </form>
          ) : null}

          {mode === 'forgot' ? (
            <form onSubmit={submitForgot} className="space-y-3.5">
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-muted mb-1.5">
                  {t('changePassword.email')}
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input-brand w-full"
                  autoComplete="email"
                />
              </div>
              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  className="text-sm font-medium text-muted hover:text-foreground"
                  onClick={() => {
                    setError('');
                    setMode('change');
                  }}
                >
                  {t('changePassword.backToChange')}
                </button>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn-ghost" onClick={onClose}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? t('common.submitting') : t('changePassword.sendLink')}
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {mode === 'forgotSent' ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground leading-relaxed">
                {t('changePassword.forgotSentBody', { email: forgotEmail })}
              </p>
              <div className="flex justify-end">
                <button type="button" className="btn-primary" onClick={onClose}>
                  {t('common.close')}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-muted mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input-brand w-full pr-10"
          autoComplete={autoComplete}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-foreground"
          aria-label={show ? t('login.hidePassword') : t('login.showPassword')}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
