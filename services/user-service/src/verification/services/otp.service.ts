import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

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
}
