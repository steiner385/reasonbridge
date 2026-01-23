import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  /**
   * Generate a 6-digit numeric OTP code
   * Uses cryptographically secure random number generation
   */
  generateOtp(): string {
    // Generate random number between 100000 and 999999
    const code = randomInt(100000, 1000000);
    return code.toString();
  }

  /**
   * Hash an OTP code using bcrypt
   * @param code - The 6-digit OTP code to hash
   * @returns Promise resolving to bcrypt hash
   */
  async hashOtp(code: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(code, saltRounds);
  }

  /**
   * Validate an OTP code against its hash
   * @param code - The OTP code to validate
   * @param hashedCode - The bcrypt hash to compare against
   * @returns Promise resolving to true if valid, false otherwise
   */
  async validateOtp(code: string, hashedCode: string): Promise<boolean> {
    if (!code || !hashedCode) {
      return false;
    }
    return bcrypt.compare(code, hashedCode);
  }
}
