/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CredentialReviewCard component
 * Feature 781: User Ranking System - Task 5.4
 *
 * @remarks
 * Displays an individual credential for admin review with:
 * - **Credential Type Badge**: Visual indicator of credential type
 * - **Category Tag**: Topic/domain the credential applies to
 * - **Document/Verification Links**: External links to proofs
 * - **Action Buttons**: Approve/Reject with processing states
 * - **Accessibility**: ARIA labels, keyboard navigation, external link indicators
 */

import Card, { CardBody } from '../ui/Card';
import Button from '../ui/Button';
import type { Credential, CredentialType } from '../../types/ranking';
import { CREDENTIAL_TYPE_LABELS } from '../../types/ranking';

/**
 * Props for CredentialReviewCard component
 */
export interface CredentialReviewCardProps {
  /** Credential to display */
  credential: Credential;
  /** Callback when approve button is clicked */
  onApprove: () => void;
  /** Callback when reject button is clicked */
  onReject: () => void;
  /** Whether the card is in processing state */
  isProcessing?: boolean;
}

/**
 * Get display label for credential type with shorter formatting
 */
const getCredentialTypeLabel = (type: CredentialType): string => {
  const shortLabels: Record<CredentialType, string> = {
    ACADEMIC_DOCTORATE: 'Doctorate',
    ACADEMIC_MASTERS: "Master's",
    ACADEMIC_BACHELORS: "Bachelor's",
    PROFESSIONAL_LICENSE: 'Professional License',
    INDUSTRY_CERTIFICATION: 'Certification',
    PUBLICATION: 'Publication',
  };
  return shortLabels[type] || CREDENTIAL_TYPE_LABELS[type];
};

/**
 * Get badge color classes for credential type
 */
const getTypeBadgeColors = (type: CredentialType): string => {
  const colors: Record<CredentialType, string> = {
    ACADEMIC_DOCTORATE:
      'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
    ACADEMIC_MASTERS:
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700',
    ACADEMIC_BACHELORS:
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
    PROFESSIONAL_LICENSE:
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700',
    INDUSTRY_CERTIFICATION:
      'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700',
    PUBLICATION:
      'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  };
  return colors[type];
};

/**
 * Format date for display
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Card component for displaying a single credential for admin review
 */
export function CredentialReviewCard({
  credential,
  onApprove,
  onReject,
  isProcessing = false,
}: CredentialReviewCardProps) {
  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      <CardBody className="p-4">
        {/* Header: Type Badge + Date */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-wrap gap-2">
            {/* Credential Type Badge */}
            <span
              className={`text-xs font-semibold px-2 py-1 rounded-full border ${getTypeBadgeColors(credential.type)}`}
            >
              {getCredentialTypeLabel(credential.type)}
            </span>

            {/* Category Tag */}
            <span className="text-xs font-medium px-2 py-1 rounded-full border bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600">
              {credential.tagName}
            </span>
          </div>

          {/* Created Date */}
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">
            {formatDate(credential.createdAt)}
          </span>
        </div>

        {/* Title and Institution */}
        <div className="mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {credential.title}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{credential.institution}</p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap gap-3 mb-4">
          {credential.documentUrl && (
            <a
              href={credential.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              View Document
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}

          {credential.verificationUrl && (
            <a
              href={credential.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Verify
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button
            size="sm"
            variant="primary"
            onClick={onApprove}
            disabled={isProcessing}
            aria-label={`Approve ${credential.title}`}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={isProcessing}
            aria-label={`Reject ${credential.title}`}
          >
            Reject
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default CredentialReviewCard;
