import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InteractiveDemo } from '../components/demo/InteractiveDemo';

/**
 * LandingPage component - Main entry point for unauthenticated users
 * Showcases platform value through interactive demo discussions
 * Provides progressive enhancement with no-JS fallback
 */
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [showJoinModal, setShowJoinModal] = useState(false);

  const handleJoinClick = () => {
    setShowJoinModal(true);
  };

  const handleSignup = () => {
    navigate('/signup');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">uniteDiscord</h1>
              <span className="px-2 py-1 text-xs font-semibold text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 rounded">
                Beta
              </span>
            </div>
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

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Find Common Ground Through Thoughtful Discussion
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
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
                  const demoSection = document.getElementById('demo-section');
                  demoSection?.scrollIntoView({ behavior: 'smooth' });
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
            Why uniteDiscord?
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
                70%+ of discussions find meaningful common ground. Join thousands discovering shared
                values across differences
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo-section" className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              See Real Discussions in Action
            </h3>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Explore actual conversations where people found common ground on complex topics
            </p>
          </div>

          {/* Interactive Demo Component */}
          <InteractiveDemo onJoinClick={handleJoinClick} />

          {/* No-JS Fallback */}
          <noscript>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mt-8">
              <h4 className="text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-2">
                JavaScript Required
              </h4>
              <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                The interactive demo requires JavaScript to be enabled. Please enable JavaScript in
                your browser to experience the full demo, or{' '}
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
          <p className="text-xl text-blue-100 mb-8">
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

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm">
              © 2026 uniteDiscord. Building bridges through rational discussion.
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
    </div>
  );
};
