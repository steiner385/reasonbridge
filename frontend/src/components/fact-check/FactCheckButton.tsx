/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import Button from '../ui/Button';
import { factCheckService } from '../../services/factCheckService';
import type { FactCheckResult, FactCheckStatus } from '../../types/factCheck';

/**
 * Search/magnifying glass icon for fact-check button
 */
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
    />
  </svg>
);

export interface FactCheckButtonProps {
  /** Response ID to check */
  responseId: string;
  /** Content of the response to extract claims from */
  content: string;
  /** Called when fact-check results are available */
  onResults?: (results: FactCheckResult[]) => void;
  /** Called when fact-check status changes */
  onStatusChange?: (status: FactCheckStatus) => void;
  /** Whether to show compact version */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
}

/**
 * Button to request fact-check for a response
 *
 * T258: Create fact-check request button
 *
 * Extracts claims from response content and sends them to the
 * fact-check service. Results are displayed as "Related Context"
 * without rendering verdicts (per FR-012b).
 */
const FactCheckButton: React.FC<FactCheckButtonProps> = ({
  responseId,
  content,
  onResults,
  onStatusChange,
  compact = false,
  className = '',
  disabled = false,
}) => {
  const [status, setStatus] = useState<FactCheckStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const updateStatus = useCallback(
    (newStatus: FactCheckStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange],
  );

  const handleClick = useCallback(async () => {
    if (status === 'loading') return;

    setError(null);
    updateStatus('loading');

    try {
      // Extract claims from content
      const claims = factCheckService.extractClaims(content);

      if (claims.length === 0) {
        updateStatus('no-results');
        onResults?.([]);
        return;
      }

      // Check claims with API
      const response = await factCheckService.checkClaims(responseId, claims);

      if (response.results.length === 0) {
        updateStatus('no-results');
      } else {
        updateStatus('success');
      }

      onResults?.(response.results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check facts';
      setError(errorMessage);
      updateStatus('error');
    }
  }, [content, responseId, status, updateStatus, onResults]);

  const isLoading = status === 'loading';
  const hasChecked = status === 'success' || status === 'no-results';

  // Determine button text and variant based on status
  const getButtonText = () => {
    if (isLoading) return compact ? '' : 'Checking...';
    if (status === 'error') return compact ? '' : 'Retry';
    if (hasChecked) return compact ? '' : 'Check Again';
    return compact ? '' : 'Find Context';
  };

  const getButtonVariant = (): 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' => {
    if (status === 'error') return 'danger';
    if (hasChecked) return 'outline';
    return 'secondary';
  };

  return (
    <div className={`inline-flex flex-col items-start ${className}`}>
      <Button
        variant={getButtonVariant()}
        size={compact ? 'sm' : 'md'}
        onClick={handleClick}
        disabled={disabled || isLoading}
        isLoading={isLoading}
        leftIcon={!isLoading && <SearchIcon className="h-4 w-4" />}
        aria-label={compact ? 'Find related context for this response' : undefined}
        title={compact ? 'Find related context' : undefined}
      >
        {getButtonText()}
      </Button>

      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {status === 'no-results' && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No related context found</p>
      )}
    </div>
  );
};

export default FactCheckButton;
