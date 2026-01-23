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
}
