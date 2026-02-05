import React, { useState } from 'react';
import Button from '../ui/Button';
import type { CommonGroundAnalysis } from '../../types/common-ground';
import ShareModal from './ShareModal';

export interface ShareButtonProps {
  /**
   * The common ground analysis to share
   */
  analysis: CommonGroundAnalysis;

  /**
   * Button variant
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';

  /**
   * Button size
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom button text
   */
  label?: string;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to show icon
   */
  showIcon?: boolean;
}

const ShareButton: React.FC<ShareButtonProps> = ({
  analysis,
  variant = 'outline',
  size = 'md',
  label = 'Share',
  className = '',
  showIcon = true,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const shareIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        leftIcon={showIcon ? shareIcon : undefined}
        className={className}
        aria-label="Share common ground analysis"
        data-testid="share-button"
      >
        {label}
      </Button>

      <ShareModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} analysis={analysis} />
    </>
  );
};

export default ShareButton;
