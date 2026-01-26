import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService {
  private readonly SALT_ROUNDS = 10;

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
   * @throws Error if hashing fails
   */
  async hashOtp(code: string): Promise<string> {
    try {
      return await bcrypt.hash(code, this.SALT_ROUNDS);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to hash OTP: ${message}`);
    }
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

    try {
      return await bcrypt.compare(code, hashedCode);
    } catch (error) {
      // bcrypt.compare throws on malformed hash - treat as invalid
      return false;
    }
  }
}
