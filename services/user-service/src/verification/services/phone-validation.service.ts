import { Injectable } from '@nestjs/common';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

@Injectable()
export class PhoneValidationService {
  /**
   * Validate if a phone number is in valid E.164 format
   * E.164 format: +[country code][subscriber number]
   * Example: +15551234567
   *
   * @param phoneNumber - Phone number to validate
   * @returns true if valid E.164 format, false otherwise
   */
  validateE164(phoneNumber: string): boolean {
    if (!phoneNumber) {
      return false;
    }

    // E.164 must start with +
    if (!phoneNumber.startsWith('+')) {
      return false;
    }

    // E.164 can only contain + and digits
    if (!/^\+\d+$/.test(phoneNumber)) {
      return false;
    }

    // Use libphonenumber-js to validate the number
    try {
      return isValidPhoneNumber(phoneNumber);
    } catch (error) {
      return false;
    }
  }
}
