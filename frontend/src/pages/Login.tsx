import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LogIn } from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Redirect based on role
      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'supplier') {
        navigate('/supplier');
      } else if (user.role === 'procuring_entity') {
        navigate('/procuring-entity');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
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
      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/60 relative z-10">
        <div className="text-center mb-4">
          <Link to="/" className="block">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2 hover:opacity-90 transition-opacity cursor-pointer">
              PrequaliQ
            </h1>
          </Link>
          <p className="text-gray-600 font-medium">{t('login.tagline')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-gradient-to-r from-red-50 to-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl shadow-sm">
              <p className="font-medium">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {t('login.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
              placeholder={t('login.placeholderEmail')}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 hover:border-gray-400"
              placeholder={t('login.placeholderPassword')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-save w-full py-3 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <LogIn size={20} />
            {loading ? t('login.loggingIn') : t('login.submit')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t('login.noAccount')}{' '}
            <a href="/register" className="text-primary-600 hover:text-primary-700 font-semibold hover:underline transition-colors">
              {t('login.registerHere')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
