import { describe, it, expect } from 'vitest';
import { OtpService } from '../otp.service';

describe('OtpService', () => {
  describe('generateOtp', () => {
    it('should generate a 6-digit numeric code', () => {
      const otpService = new OtpService();
      const code = otpService.generateOtp();

      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
      expect(parseInt(code, 10)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(code, 10)).toBeLessThanOrEqual(999999);
    });

    it('should generate unique codes on multiple calls', () => {
      const otpService = new OtpService();
      const codes = new Set<string>();

      // Generate 100 codes
      for (let i = 0; i < 100; i++) {
        codes.add(otpService.generateOtp());
      }

      // Should have high uniqueness (allow small collision rate)
      expect(codes.size).toBeGreaterThan(95);
    });
  });
});
