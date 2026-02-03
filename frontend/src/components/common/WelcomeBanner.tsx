import React, { useState, useEffect } from 'react';

const BANNER_DISMISSED_KEY = 'reasonbridge_welcome_banner_dismissed';

interface WelcomeBannerProps {
  /** Optional custom message */
  message?: string;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
}

/**
 * WelcomeBanner - Shows a welcome message to authenticated users redirected from landing page
 *
 * Features:
 * - Dismissible with X button
 * - Persists dismissed state to localStorage
 * - Styled with brand colors (primary/accent)
 * - Accessible with proper ARIA attributes
 */
export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  message = "Welcome back! You've been redirected from the homepage. Explore active discussions below.",
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Check if banner was previously dismissed
    const wasDismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (!wasDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    // Start closing animation
    setIsClosing(true);

    // After animation, hide and persist
    setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
      onDismiss?.();
    }, 200);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`bg-gradient-to-r from-primary-50 to-accent dark:from-primary-900/30 dark:to-accent/20 border border-primary-200 dark:border-primary-700 rounded-lg p-4 mb-6 transition-all duration-200 ${
        isClosing ? 'opacity-0 transform -translate-y-2' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-6 h-6 text-primary-500 dark:text-primary-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-primary-900 dark:text-primary-100">{message}</p>
            <p className="text-xs text-primary-700 dark:text-primary-300 mt-1">
              Find common ground with diverse perspectives on topics that matter.
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1 text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 hover:bg-primary-100 dark:hover:bg-primary-800/50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Dismiss welcome banner"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Storage key exported for testing purposes
export const WELCOME_BANNER_STORAGE_KEY = BANNER_DISMISSED_KEY;

export default WelcomeBanner;
