import { Injectable } from '@nestjs/common';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

export interface PhoneValidationResult {
  isValid: boolean;
  e164?: string;
  error?: string;
}

@Injectable()
export class PhoneValidationService {
  /**
   * Validate and normalize phone number to E.164 format
   * @param phoneNumber - Phone number in any format
   * @returns Validation result with normalized E.164 format if valid
   */
  validatePhoneNumber(phoneNumber: string): PhoneValidationResult {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return {
        isValid: false,
        error: 'Phone number is required',
      };
    }

    try {
      // Check if valid phone number
      if (!isValidPhoneNumber(phoneNumber)) {
        return {
          isValid: false,
          error: 'Invalid phone number format',
        };
      }

      // Parse and normalize to E.164
      const parsed = parsePhoneNumber(phoneNumber);

      return {
        isValid: true,
        e164: parsed.format('E.164'),
      };
    } catch (error) {
      return {
        isValid: false,
        error: 'Failed to parse phone number',
      };
    }
  }

  /**
   * Mask phone number for privacy
   * Shows country code and last 4 digits, masks the rest
   * Example: +14155552671 -> +1 (***) ***-2671
   *
   * @param phoneNumber - Phone number to mask
   * @returns Masked phone number string
   */
  maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.trim() === '') {
      return '***';
    }

    try {
      const parsed = parsePhoneNumber(phoneNumber);
      const nationalNumber = parsed.nationalNumber;
      const countryCode = parsed.countryCallingCode;

      // Get last 4 digits
      const lastFour = nationalNumber.slice(-4);

      // Mask the rest based on length
      if (nationalNumber.length <= 4) {
        return `+${countryCode} ***`;
      } else if (nationalNumber.length <= 7) {
        return `+${countryCode} (***) ${lastFour}`;
      } else if (countryCode === '44') {
        // UK format: +44 (**) ****-4567
        return `+${countryCode} (**) ****-${lastFour}`;
      } else {
        // Default format (US and others): +1 (***) ***-2671
        return `+${countryCode} (***) ***-${lastFour}`;
      }
    } catch (error) {
      return '***';
    }
  }
}
