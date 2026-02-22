/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Link } from 'react-router-dom';

/**
 * Regulation type for privacy policy display
 */
export type RegulationType = 'COPPA' | 'GDPR' | 'AADC' | 'OSA' | 'GENERAL';

export interface PrivacyPolicySummaryProps {
  /**
   * The child's display name for personalized messaging
   */
  childName: string;

  /**
   * The applicable privacy regulation (COPPA, GDPR, AADC, OSA, etc.)
   */
  regulation: RegulationType;
}

/**
 * Age-appropriate privacy policy summary for parental consent pages
 *
 * @remarks
 * Displays a clear, accessible summary of data collection practices
 * tailored for parents reviewing child account consent. Shows:
 * - What data is collected about the child
 * - What the platform explicitly does NOT do
 * - Link to full children's privacy policy
 *
 * Supports dark mode and is fully responsive.
 *
 * @param props - Component props
 * @returns Rendered privacy summary component
 *
 * @example
 * ```tsx
 * <PrivacyPolicySummary
 *   childName="Alex"
 *   regulation="COPPA"
 * />
 * ```
 */
export function PrivacyPolicySummary({ childName, regulation }: PrivacyPolicySummaryProps) {
  const regulationLabels: Record<RegulationType, string> = {
    COPPA: "Children's Online Privacy Protection Act (COPPA)",
    GDPR: 'General Data Protection Regulation (GDPR)',
    AADC: "UK Age Appropriate Design Code (Children's Code)",
    OSA: 'Online Safety Act (OSA)',
    GENERAL: 'Applicable child privacy laws',
  };

  const regulationLabel = regulationLabels[regulation] || regulationLabels.GENERAL;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Privacy Summary for {childName}
      </h3>

      {/* What We Collect Section */}
      <section className="mb-6" aria-labelledby="collect-heading">
        <h4
          id="collect-heading"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"
        >
          <span
            className="w-5 h-5 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="w-3 h-3 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
          What We Collect About {childName}
        </h4>
        <ul className="space-y-2 ml-7">
          <CollectItem>Username and display name</CollectItem>
          <CollectItem>Age (to verify parental consent requirements)</CollectItem>
          <CollectItem>Parent/guardian email address</CollectItem>
          <CollectItem>Discussion activity (topics joined, responses posted)</CollectItem>
        </ul>
      </section>

      {/* What We Don't Do Section */}
      <section className="mb-6" aria-labelledby="dont-do-heading">
        <h4
          id="dont-do-heading"
          className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2"
        >
          <span
            className="w-5 h-5 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            <svg
              className="w-3 h-3 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
          What We DON&apos;T Do
        </h4>
        <ul className="space-y-2 ml-7">
          <DontDoItem>Show personalized advertising</DontDoItem>
          <DontDoItem>Share data with third parties for marketing</DontDoItem>
          <DontDoItem>Allow direct messages from other users</DontDoItem>
          <DontDoItem>Make child profiles visible to adults outside the platform</DontDoItem>
        </ul>
      </section>

      {/* Footer with regulation reference */}
      <footer className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          ReasonBridge complies with {regulationLabel} and other applicable child privacy
          regulations.
        </p>
        <Link
          to="/legal/privacy/children"
          className="inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline transition-colors"
        >
          Read our full Children&apos;s Privacy Policy
          <svg
            className="w-4 h-4 ml-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </Link>
      </footer>
    </div>
  );
}

/**
 * List item component for "What We Collect" section
 */
function CollectItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
      <svg
        className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

/**
 * List item component for "What We Don't Do" section
 */
function DontDoItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
      <svg
        className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

export default PrivacyPolicySummary;
