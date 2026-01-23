import { describe, it, expect } from 'vitest';
import { PhoneValidationService } from '../phone-validation.service';

describe('PhoneValidationService', () => {
  describe('validateE164', () => {
    it('should return true for valid US E.164 phone number', () => {
      const service = new PhoneValidationService();

      const isValid = service.validateE164('+12025550123');

      expect(isValid).toBe(true);
    });

    it('should return true for valid UK E.164 phone number', () => {
      const service = new PhoneValidationService();

      const isValid = service.validateE164('+442071234567');

      expect(isValid).toBe(true);
    });

    it('should return false for phone number without + prefix', () => {
      const service = new PhoneValidationService();

      const isValid = service.validateE164('15551234567');

      expect(isValid).toBe(false);
    });

    it('should return false for phone number with invalid country code', () => {
      const service = new PhoneValidationService();

      const isValid = service.validateE164('+0001234567');

      expect(isValid).toBe(false);
    });

    it('should return false for empty string', () => {
      const service = new PhoneValidationService();

      const isValid = service.validateE164('');

      expect(isValid).toBe(false);
    });

    it('should return false for non-numeric characters', () => {
      const service = new PhoneValidationService();

      const isValid = service.validateE164('+1 (555) 123-4567');

      expect(isValid).toBe(false);
    });

    it('should return false for null input', () => {
      const service = new PhoneValidationService();

      const isValid = service.validateE164(null as any);

      expect(isValid).toBe(false);
    });
  });
});
