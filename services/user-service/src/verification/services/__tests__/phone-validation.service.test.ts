import { describe, it, expect, beforeEach } from 'vitest';
import { PhoneValidationService } from '../phone-validation.service';

describe('PhoneValidationService', () => {
  let service: PhoneValidationService;

  beforeEach(() => {
    service = new PhoneValidationService();
  });

  describe('validatePhoneNumber', () => {
    it('should accept valid E.164 format', () => {
      const validPhones = [
        '+14155552671', // US
        '+442071234567', // UK
        '+33123456789', // France
        '+81312345678', // Japan
      ];

      validPhones.forEach((phone) => {
        const result = service.validatePhoneNumber(phone);
        expect(result.isValid).toBe(true);
        expect(result.e164).toBe(phone);
      });
    });

    it('should reject invalid formats', () => {
      const invalidPhones = [
        '5551234567', // Missing country code
        '555-123-4567', // Not E.164
        '+1555', // Too short
        'invalid', // Not a number
        '', // Empty
      ];

      invalidPhones.forEach((phone) => {
        const result = service.validatePhoneNumber(phone);
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    it('should normalize phone numbers to E.164', () => {
      const result = service.validatePhoneNumber('+1 (415) 555-2671');

      expect(result.isValid).toBe(true);
      expect(result.e164).toBe('+14155552671');
    });
  });
});
