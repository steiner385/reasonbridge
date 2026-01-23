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

  describe('hashOtp', () => {
    it('should hash OTP code using bcrypt', async () => {
      const otpService = new OtpService();
      const code = '123456';

      const hashedCode = await otpService.hashOtp(code);

      // Bcrypt hashes start with $2b$ or $2a$
      expect(hashedCode).toMatch(/^\$2[ab]\$/);
      expect(hashedCode.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same code', async () => {
      const otpService = new OtpService();
      const code = '123456';

      const hash1 = await otpService.hashOtp(code);
      const hash2 = await otpService.hashOtp(code);

      // Bcrypt uses salt, so same input produces different hashes
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('validateOtp', () => {
    it('should return true for correct OTP code', async () => {
      const otpService = new OtpService();
      const code = '123456';
      const hashedCode = await otpService.hashOtp(code);

      const isValid = await otpService.validateOtp(code, hashedCode);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect OTP code', async () => {
      const otpService = new OtpService();
      const code = '123456';
      const wrongCode = '654321';
      const hashedCode = await otpService.hashOtp(code);

      const isValid = await otpService.validateOtp(wrongCode, hashedCode);

      expect(isValid).toBe(false);
    });

    it('should return false for empty code', async () => {
      const otpService = new OtpService();
      const hashedCode = await otpService.hashOtp('123456');

      const isValid = await otpService.validateOtp('', hashedCode);

      expect(isValid).toBe(false);
    });
  });
});
