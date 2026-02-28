/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import Button from '../ui/Button';
import { useToast } from '../../contexts/ToastContext';

export interface ShareButtonProps {
  /**
   * The topic ID for constructing the share URL
   */
  topicId: string;

  /**
   * The response ID for constructing the share URL
   */
  responseId: string;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * ShareButton component for sharing response links.
 *
 * @remarks
 * - **Desktop**: Copies URL to clipboard and shows success toast
 * - **Mobile**: Uses Web Share API if available, falls back to clipboard
 * - **URL Format**: `/topics/:topicId#response-:responseId`
 * - **Accessibility**: 44px minimum touch target (WCAG 2.1 AA compliance)
 *
 * @param props - Component props
 * @returns Rendered share button
 *
 * @example
 * ```tsx
 * <ShareButton topicId="topic-123" responseId="response-456" />
 * ```
 */
const ShareButton: React.FC<ShareButtonProps> = ({ topicId, responseId, className = '' }) => {
  const toast = useToast();

  const getShareUrl = useCallback(() => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/topics/${topicId}#response-${responseId}`;
  }, [topicId, responseId]);

  const copyToClipboard = useCallback(async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  }, [getShareUrl, toast]);

  const handleShare = useCallback(async () => {
    const url = getShareUrl();

    // Check if Web Share API is available (typically on mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this response',
          url,
        });
        // Don't show toast on successful share - the native share dialog handles feedback
      } catch (error) {
        // User cancelled share or share failed
        // If user cancelled, no feedback needed
        // If share failed, fall back to clipboard
        if (error instanceof Error && error.name !== 'AbortError') {
          await copyToClipboard();
        }
      }
    } else {
      // Fallback to clipboard for desktop
      await copyToClipboard();
    }
  }, [getShareUrl, copyToClipboard]);

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleShare}
      className={`min-w-[44px] min-h-[44px] ${className}`}
      aria-label="Share response"
      title="Share response"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
        />
      </svg>
    </Button>
  );
};

export default ShareButton;
