/**
 * FlagContentButton - Button to open the flag content modal
 *
 * A simple button that triggers the content flagging workflow.
 * Integrates with FlagContentModal to provide the full reporting experience.
 */

import React, { useState } from 'react';
import Button from '../ui/Button';
import FlagContentModal from './FlagContentModal';

export interface FlagContentButtonProps {
  /**
   * ID of the content to flag
   */
  contentId: string;

  /**
   * Type of content being flagged
   */
  contentType: 'response' | 'comment' | 'topic' | 'other';

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show as icon-only button
   */
  iconOnly?: boolean;

  /**
   * Optional callback when flag is successfully submitted
   */
  onSuccess?: () => void;

  /**
   * Custom tooltip text
   */
  tooltip?: string;

  /**
   * Custom className
   */
  className?: string;
}

const FlagContentButton: React.FC<FlagContentButtonProps> = ({
  contentId,
  contentType,
  size = 'sm',
  iconOnly = false,
  onSuccess,
  tooltip = 'Report this content',
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const flagIcon = (
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
        d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-7 7 7 7H12.5l-1-1H5a2 2 0 00-2 2m0 0v4m0 0h16"
      />
    </svg>
  );

  if (iconOnly) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-md p-1 ${className}`}
          title={tooltip}
          aria-label="Report content"
        >
          {flagIcon}
        </button>
        <FlagContentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          contentId={contentId}
          contentType={contentType}
          onSuccess={onSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="ghost"
        size={size}
        onClick={() => setIsModalOpen(true)}
        leftIcon={flagIcon}
        className={className}
        title={tooltip}
      >
        Report
      </Button>
      <FlagContentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contentId={contentId}
        contentType={contentType}
        onSuccess={onSuccess}
      />
    </>
  );
};

export default FlagContentButton;
