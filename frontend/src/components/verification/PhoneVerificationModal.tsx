/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PhoneVerificationModal - Two-step phone verification workflow
 *
 * Step 1: User enters phone number -> sends OTP
 * Step 2: User enters 6-digit OTP code -> verifies
 */

import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import PhoneInput from './PhoneInput';
import OTPInput from './OTPInput';
import { requestPhoneVerification, verifyPhoneOTP } from '../../lib/api';

export interface PhoneVerificationModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;

  /**
   * Optional callback when verification is successful
   */
  onSuccess?: () => void;
}

type VerificationStep = 'phone' | 'otp' | 'success';

const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<VerificationStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhoneNumber('');
      setOtpCode('');
      setVerificationId('');
      setError(null);
      setExpiresAt(null);
    }
  }, [isOpen]);

  const handleRequestOTP = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await requestPhoneVerification(phoneNumber);
      setVerificationId(response.verificationId);
      setExpiresAt(response.expiresAt);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await verifyPhoneOTP(verificationId, otpCode);
      if (response.success) {
        setStep('success');
        // Close modal and trigger success callback after 2 seconds
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 2000);
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtpCode('');
    setError(null);
  };

  const getModalTitle = () => {
    switch (step) {
      case 'phone':
        return 'Verify Phone Number';
      case 'otp':
        return 'Enter Verification Code';
      case 'success':
        return 'Verification Complete';
      default:
        return 'Phone Verification';
    }
  };

  const getModalFooter = () => {
    if (step === 'success') {
      return null;
    }

    if (step === 'otp') {
      return (
        <div className="flex gap-3 w-full">
          <Button variant="outline" onClick={handleBack} disabled={isLoading}>
            Back
          </Button>
          <Button onClick={handleVerifyOTP} isLoading={isLoading} disabled={isLoading}>
            Verify Code
          </Button>
        </div>
      );
    }

    return (
      <div className="flex gap-3 w-full">
        <Button variant="outline" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleRequestOTP} isLoading={isLoading} disabled={isLoading}>
          Send Code
        </Button>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="md"
      showCloseButton={!isLoading && step !== 'success'}
      closeOnBackdropClick={!isLoading && step !== 'success'}
      closeOnEscape={!isLoading && step !== 'success'}
      footer={getModalFooter()}
    >
      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Step 1: Phone Number Entry */}
        {step === 'phone' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              We'll send a 6-digit verification code to your phone number via SMS.
            </p>
            <PhoneInput
              value={phoneNumber}
              onChange={setPhoneNumber}
              disabled={isLoading}
              placeholder="Enter your phone number"
            />
            <p className="text-xs text-gray-500">
              Standard SMS rates may apply. Code expires in 10 minutes.
            </p>
          </div>
        )}

        {/* Step 2: OTP Entry */}
        {step === 'otp' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Enter the 6-digit code sent to <strong>{phoneNumber}</strong>
            </p>
            <OTPInput value={otpCode} onChange={setOtpCode} length={6} />
            {expiresAt && (
              <p className="text-xs text-gray-500 text-center">
                Code expires at {new Date(expiresAt).toLocaleTimeString()}
              </p>
            )}
            <button
              type="button"
              onClick={handleBack}
              className="text-sm text-primary-600 hover:text-primary-700 underline"
              disabled={isLoading}
            >
              Change phone number
            </button>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 'success' && (
          <div className="text-center space-y-4 py-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Phone Number Verified!</h3>
              <p className="text-sm text-gray-600 mt-2">
                Your phone number has been successfully verified.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PhoneVerificationModal;
