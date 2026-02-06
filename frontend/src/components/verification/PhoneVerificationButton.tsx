/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PhoneVerificationButton - Trigger button for phone verification
 *
 * Opens the PhoneVerificationModal when clicked
 * Shows verification status (verified badge)
 */

import React, { useState } from 'react';
import Button from '../ui/Button';
import PhoneVerificationModal from './PhoneVerificationModal';

export interface PhoneVerificationButtonProps {
  /**
   * Whether the user's phone is already verified
   */
  isVerified?: boolean;

  /**
   * Callback when verification is successful
   */
  onVerificationSuccess?: () => void;

  /**
   * Button variant (defaults to 'primary')
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';

  /**
   * Whether the button is disabled
   */
  disabled?: boolean;

  /**
   * Custom button text (defaults to 'Verify Phone Number' or 'Phone Verified')
   */
  buttonText?: string;
}

const PhoneVerificationButton: React.FC<PhoneVerificationButtonProps> = ({
  isVerified = false,
  onVerificationSuccess,
  variant = 'primary',
  disabled = false,
  buttonText,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    onVerificationSuccess?.();
  };

  const getButtonText = () => {
    if (buttonText) return buttonText;
    return isVerified ? 'Phone Verified' : 'Verify Phone Number';
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant={isVerified ? 'outline' : variant}
        disabled={disabled}
        className={isVerified ? 'cursor-default' : ''}
      >
        {isVerified && (
          <svg
            className="w-5 h-5 mr-2 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {getButtonText()}
      </Button>

      <PhoneVerificationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default PhoneVerificationButton;
