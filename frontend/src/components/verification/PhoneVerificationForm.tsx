/**
 * Phone Verification Form Component
 * Handles phone number input and verification request
 */

import { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import { useRequestVerification } from '../../hooks/useVerification';
import type { VerificationResponse } from '../../types/verification';
import { VerificationType } from '../../types/verification';

interface PhoneVerificationFormProps {
  onSuccess?: (response: VerificationResponse) => void;
  onError?: (error: Error) => void;
  className?: string;
}

export const PhoneVerificationForm: React.FC<PhoneVerificationFormProps> = ({
  onSuccess,
  onError,
  className = '',
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const requestVerification = useRequestVerification();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage('');
    setShowSuccessMessage(false);

    try {
      const response = await requestVerification.mutateAsync({
        type: VerificationType.PHONE,
        phoneNumber,
      });

      setPhoneNumber('');
      setSuccessMessage('Verification request sent! Check your phone for confirmation code.');
      setShowSuccessMessage(true);
      onSuccess?.(response);

      // Auto-dismiss message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
    }
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    // Basic E.164 format validation: +1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone.replace(/[-\s]/g, ''));
  };

  const isValid = isValidPhoneNumber(phoneNumber);

  return (
    <Card className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone Verification</h3>
        <p className="text-sm text-gray-600">
          Enter your phone number to receive a verification code via SMS
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            label="Phone Number"
            placeholder="+1 (212) 555-1234"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            helperText="Format: +1 (country code) (area) number. Example: +1 2125551234"
            error={phoneNumber && !isValidPhoneNumber(phoneNumber) ? 'Invalid phone number format' : ''}
            disabled={requestVerification.isPending}
            required
          />
        </div>

        {showSuccessMessage && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
            {successMessage}
          </div>
        )}

        {requestVerification.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {requestVerification.error instanceof Error
              ? requestVerification.error.message
              : 'Failed to send verification code. Please try again.'}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={!isValid || requestVerification.isPending}
            isLoading={requestVerification.isPending}
          >
            {requestVerification.isPending ? 'Sending...' : 'Send Verification Code'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
