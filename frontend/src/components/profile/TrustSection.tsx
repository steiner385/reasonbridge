/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TrustSection - Profile section wrapper for trust score display
 *
 * Displays user's trust score with dimensional breakdown.
 * Supports collapsible behavior on mobile for better UX.
 *
 * @remarks
 * **Features:**
 * - Collapsible on mobile (< 768px) with animated expand/collapse
 * - Privacy-aware: shows restricted message for non-followers
 * - Uses TrustScoreBadge for actual display
 * - Accessible with ARIA attributes for expand/collapse
 */

import { useState, useEffect } from 'react';
import type { User } from '../../types/user';
import TrustScoreBadge from '../users/TrustScoreBadge';

export interface TrustSectionProps {
  /** User to display trust score for */
  user: User;
  /** Whether trust scores are visible (privacy check) */
  isVisible?: boolean;
  /** Privacy message to show when section is restricted */
  privacyMessage?: string;
  /** Whether to start expanded on mobile (default: false) */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Custom hook to detect mobile viewport
 */
function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isMobile;
}

/**
 * TrustSection component with collapsible mobile behavior
 */
export function TrustSection({
  user,
  isVisible = true,
  privacyMessage = 'Follow this user to see their detailed trust scores',
  defaultExpanded = false,
  className = '',
}: TrustSectionProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // On desktop, always show expanded
  const showContent = !isMobile || isExpanded;

  // Toggle handler for mobile
  const handleToggle = () => {
    if (isMobile) {
      setIsExpanded((prev) => !prev);
    }
  };

  // Privacy restricted state
  if (!isVisible) {
    return (
      <div className={`text-center py-4 text-gray-500 dark:text-gray-400 ${className}`}>
        <span className="text-2xl mb-2 block" aria-hidden="true">
          🔒
        </span>
        <p className="text-sm">{privacyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`${className}`} data-testid="trust-section">
      {/* Collapsible header on mobile */}
      {isMobile && (
        <button
          type="button"
          onClick={handleToggle}
          className="w-full flex items-center justify-between py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          aria-expanded={isExpanded}
          aria-controls="trust-content"
        >
          <span className="flex items-center gap-2">
            <span className="text-xl">⭐</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">Trust Score</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(
                ((user.trustScoreAbility + user.trustScoreBenevolence + user.trustScoreIntegrity) /
                  3) *
                  100,
              )}
              %
            </span>
          </span>
          <span
            className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            ▼
          </span>
        </button>
      )}

      {/* Content - conditionally rendered on mobile */}
      <div
        id="trust-content"
        className={`transition-all duration-300 overflow-hidden ${
          showContent ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <TrustScoreBadge
          user={user}
          showDimensions={true}
          showLabel={true}
          showVerification={true}
          size="md"
        />
      </div>
    </div>
  );
}

export default TrustSection;
