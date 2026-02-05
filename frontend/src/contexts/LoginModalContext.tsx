import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * LoginModalContext
 * Provides global login modal state and methods
 */

interface LoginModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const LoginModalContext = createContext<LoginModalContextType | undefined>(undefined);

export function useLoginModal() {
  const context = useContext(LoginModalContext);
  if (!context) {
    throw new Error('useLoginModal must be used within LoginModalProvider');
  }
  return context;
}

// Demo credentials
const DEMO_CREDENTIALS = [
  {
    name: 'Admin Adams',
    email: 'demo-admin@reasonbridge.demo',
    password: 'DemoAdmin2026!',
    role: 'Admin',
  },
  {
    name: 'Mod Martinez',
    email: 'demo-mod@reasonbridge.demo',
    password: 'DemoMod2026!',
    role: 'Moderator',
  },
  {
    name: 'Alice Anderson',
    email: 'demo-alice@reasonbridge.demo',
    password: 'DemoAlice2026!',
    role: 'Power User',
  },
  {
    name: 'Bob Builder',
    email: 'demo-bob@reasonbridge.demo',
    password: 'DemoBob2026!',
    role: 'Regular User',
  },
  {
    name: 'New User',
    email: 'demo-new@reasonbridge.demo',
    password: 'DemoNew2026!',
    role: 'New User',
  },
];

export function LoginModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const openModal = useCallback(() => {
    setIsOpen(true);
    setLoginError(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setLoginEmail('');
    setLoginPassword('');
    setLoginError(null);
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      await login(loginEmail, loginPassword);
      closeModal();

      // Redirect to original page or default to /topics
      const from = (location.state as { from?: string })?.from || '/topics';
      navigate(from);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDemoCredentialClick = (email: string, password: string) => {
    setLoginEmail(email);
    setLoginPassword(password);
    setLoginError(null);
  };

  return (
    <LoginModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}

      {/* Login Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3
                id="login-modal-title"
                className="text-2xl font-bold text-gray-900 dark:text-white"
              >
                Log In
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close login modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="mb-6">
              <div className="mb-4">
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your email"
                />
              </div>
              <div className="mb-4">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your password"
                />
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full px-6 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {loginLoading ? 'Logging in...' : 'Log In'}
              </button>
            </form>

            {/* Demo Credentials Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Quick Login with Demo Accounts
              </h4>
              <div className="space-y-2">
                {DEMO_CREDENTIALS.map((cred) => (
                  <button
                    key={cred.email}
                    type="button"
                    onClick={() => handleDemoCredentialClick(cred.email, cred.password)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{cred.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{cred.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded">
                      {cred.role}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
                Click a demo account to auto-fill credentials
              </p>
            </div>

            {/* Sign up link */}
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    navigate('/signup');
                  }}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Sign up free
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </LoginModalContext.Provider>
  );
}
