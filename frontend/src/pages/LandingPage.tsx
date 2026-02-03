import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import { authService } from '../services/authService';

// Demo credentials for quick login
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

interface Topic {
  id: string;
  title: string;
  description: string;
  participantCount: number;
  responseCount: number;
  createdAt: string;
  status: string;
}

interface TopicsResponse {
  data: Topic[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * LandingPage component - Main entry point for unauthenticated users
 * Showcases real discussions from the platform
 */
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Redirect authenticated users to /topics?welcome=true
  useAuthRedirect();

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/topics?limit=5&sortBy=participantCount&sortOrder=desc');
        if (!response.ok) {
          throw new Error('Failed to fetch topics');
        }
        const data: TopicsResponse = await response.json();
        setTopics(data.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load topics');
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  const handleJoinClick = () => {
    setShowJoinModal(true);
  };

  const handleSignup = () => {
    navigate('/signup');
  };

  const handleLogin = () => {
    setShowLoginModal(true);
    setLoginError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      await authService.login({ email: loginEmail, password: loginPassword });
      setShowLoginModal(false);
      navigate('/topics?welcome=true');
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ReasonBridge</h1>
              <span className="px-2 py-1 text-xs font-semibold text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50 rounded">
                Beta
              </span>
            </Link>
            <nav className="flex items-center gap-3">
              <button
                onClick={handleLogin}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              >
                Log In
              </button>
              <button
                onClick={handleSignup}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign Up Free
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Find Common Ground Through Thoughtful Discussion
              </h2>
              <p className="text-xl md:text-2xl mb-8 text-white">
                Experience AI-powered rational discourse that helps diverse perspectives discover
                shared values and understanding
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={handleSignup}
                  className="px-8 py-4 text-lg font-semibold bg-white text-blue-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => {
                    const topicsSection = document.getElementById('topics-section');
                    topicsSection?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-8 py-4 text-lg font-semibold bg-transparent border-2 border-white text-white hover:bg-white hover:text-blue-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                >
                  See How It Works
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Value Propositions */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
              Why ReasonBridge?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  AI-Guided Insight
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Our AI analyzes discussions in real-time to identify common ground, highlight
                  agreement, and suggest productive paths forward
                </p>
              </div>

              {/* Feature 2 */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Diverse Perspectives
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  Engage with people across the political spectrum in structured, proposition-based
                  discussions that encourage understanding
                </p>
              </div>

              {/* Feature 3 */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Proven Results
                </h4>
                <p className="text-gray-600 dark:text-gray-400">
                  70%+ of discussions find meaningful common ground. Join thousands discovering
                  shared values across differences
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Topics Section */}
        <section id="topics-section" className="py-16 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Current Discussions
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Explore active conversations on topics that matter
              </p>
            </div>

            {/* Topics List */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
                <p className="text-red-700 dark:text-red-300">Unable to load topics: {error}</p>
              </div>
            )}

            {!loading && !error && topics.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400">No topics available yet</p>
              </div>
            )}

            {!loading && !error && topics.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(topic.createdAt)}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 dark:text-blue-200 dark:bg-blue-900/50 rounded">
                        {topic.status}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {topic.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {topic.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <span>{topic.participantCount} participants</span>
                      <span>•</span>
                      <span>{topic.responseCount} responses</span>
                    </div>
                    <button
                      onClick={handleJoinClick}
                      className="w-full px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Join Discussion
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* No-JS Fallback */}
            <noscript>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mt-8">
                <h4 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                  JavaScript Required
                </h4>
                <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                  This page requires JavaScript to load topics. Please enable JavaScript in your
                  browser, or{' '}
                  <a href="/signup" className="underline font-semibold">
                    sign up directly
                  </a>{' '}
                  to get started.
                </p>
              </div>
            </noscript>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-blue-600 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl font-bold mb-4">Ready to Join the Conversation?</h3>
            <p className="text-xl text-white mb-8">
              Create your free account in 30 seconds. No credit card required.
            </p>
            <button
              onClick={handleSignup}
              className="px-8 py-4 text-lg font-semibold bg-white text-blue-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
            >
              Get Started Free →
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              © 2026 ReasonBridge. Building bridges through rational discussion.
            </p>
          </div>
        </div>
      </footer>

      {/* Join Modal */}
      {showJoinModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowJoinModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="join-modal-title"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="join-modal-title"
              className="text-2xl font-bold text-gray-900 dark:text-white mb-4"
            >
              Join to Participate
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a free account to join discussions, share your perspective, and discover common
              ground with others.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleSignup}
                className="w-full px-6 py-3 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Sign Up Free
              </button>
              <button
                onClick={handleLogin}
                className="w-full px-6 py-3 text-lg font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Log In
              </button>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors focus:outline-none"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowLoginModal(false)}
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
                onClick={() => setShowLoginModal(false)}
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
                  <p className="text-sm text-red-700 dark:text-red-300">{loginError}</p>
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
                    setShowLoginModal(false);
                    handleSignup();
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
    </div>
  );
};
