import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Logo } from '../components/ui/Logo';

const REMEMBER_KEY = 'prequaliq_remember_login';

/** Remember email only — never store passwords (rule 01). */
function loadRememberedEmail(): { email: string; remember: boolean } {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return { email: '', remember: false };
    const data = JSON.parse(raw) as { email?: string; password?: string };
    // Migrate away from legacy entries that stored a password (base64 or otherwise)
    if (data.password) {
      const emailOnly = { email: (data.email || '').trim() };
      if (emailOnly.email) {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify(emailOnly));
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      return { email: emailOnly.email, remember: !!emailOnly.email };
    }
    return {
      email: data.email || '',
      remember: !!data.email
    };
  } catch {
    localStorage.removeItem(REMEMBER_KEY);
    return { email: '', remember: false };
  }
}

const Login = () => {
  const { t } = useTranslation();
  const remembered = loadRememberedEmail();
  const [email, setEmail] = useState(remembered.email);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(remembered.remember);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const stored = loadRememberedEmail();
    if (stored.remember) {
      setEmail(stored.email);
      setRemember(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);

      if (remember) {
        localStorage.setItem(
          REMEMBER_KEY,
          JSON.stringify({ email: email.trim() })
        );
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const redirect = searchParams.get('redirect');
      if (redirect && redirect.startsWith('/')) {
        navigate(redirect);
        return;
      }

      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'supplier') {
        navigate('/supplier');
      } else if (user.role === 'procuring_entity') {
        navigate('/procuring-entity');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t('msg.loginFailed');
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-website min-h-screen flex items-center justify-center p-4 relative">
      {/* Mature, professional procurement-themed background */}
      <div className="login-page-bg" aria-hidden="true">
        {/* Document / questionnaire - subtle */}
        <div className="login-page-graphic login-float-1 w-24 h-24 top-[12%] left-[8%]">
          <svg viewBox="0 0 24 24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M9 15h6" />
            <path d="M9 11h6" />
            <path d="M9 19h2" />
          </svg>
        </div>

        {/* Building / supplier - corporate */}
        <div className="login-page-graphic login-float-2 w-20 h-20 top-[20%] right-[12%]">
          <svg viewBox="0 0 24 24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
            <path d="M9 9v.01" />
            <path d="M9 12v.01" />
            <path d="M9 15v.01" />
            <path d="M9 18v.01" />
          </svg>
        </div>

        {/* Checklist / approved shortlist */}
        <div className="login-page-graphic login-float-3 w-28 h-28 bottom-[28%] left-[6%]">
          <svg viewBox="0 0 24 24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>

        {/* Contract / agreement */}
        <div className="login-page-graphic login-float-4 bottom-[18%] right-[10%]" style={{ width: '5rem', height: '5rem' }}>
          <svg viewBox="0 0 24 24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <path d="M14 2v6h6" />
            <path d="m9 15 2 2 4-4" />
          </svg>
        </div>

        {/* Search / shortlisting - subtle */}
        <div className="login-page-graphic login-float-5 w-20 h-20 top-[50%] left-[15%]">
          <svg viewBox="0 0 24 24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>

        {/* Briefcase / procurement */}
        <div className="login-page-graphic login-float-6 w-22 h-22 bottom-[38%] right-[18%]" style={{ width: '5.5rem', height: '5.5rem' }}>
          <svg viewBox="0 0 24 24" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            <rect width="20" height="14" x="2" y="6" rx="2" />
          </svg>
        </div>

        {/* Network / connection - very subtle */}
        <div className="login-page-graphic login-float-7 w-18 h-18 top-[38%] right-[22%]" style={{ width: '4.5rem', height: '4.5rem', opacity: 0.06 }}>
          <svg viewBox="0 0 24 24" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="2.5" />
            <circle cx="5" cy="5" r="1.5" />
            <circle cx="19" cy="5" r="1.5" />
            <circle cx="5" cy="19" r="1.5" />
            <circle cx="19" cy="19" r="1.5" />
            <path d="M12 9.5v5" />
            <path d="M9.5 12h5" />
            <path d="M7.5 7.5l9 9" />
            <path d="M16.5 7.5l-9 9" />
          </svg>
        </div>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="auth-card">
        <div className="flex justify-center mb-6">
          <Logo to="/login" subtitle={t('login.tagline')} size="lg" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl shadow-sm">
              <p className="font-medium">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-muted mb-2">
              {t('login.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-brand"
              placeholder={t('login.placeholderEmail')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-muted mb-2">
              {t('login.password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-brand pr-12"
                placeholder={t('login.placeholderPassword')}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => {
                const next = e.target.checked;
                setRemember(next);
                if (!next) localStorage.removeItem(REMEMBER_KEY);
              }}
              className="w-4 h-4 rounded border-border accent-accent"
            />
            <span className="text-sm text-muted">{t('login.rememberEmail')}</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="btn-save w-full py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-accent hover:shadow-lg transition-all duration-300"
          >
            <LogIn size={20} />
            {loading ? t('login.loggingIn') : t('login.submit')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted">
            {t('login.noAccount')}{' '}
            <a href="/register" className="text-accent hover:text-accent-hover font-semibold hover:underline transition-colors">
              {t('login.registerHere')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
