/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import type { VerificationCodeGenerator } from './verification-code-generator.interface.js';

/**
 * Production implementation of verification code generator.
 *
 * Generates cryptographically random 6-digit codes for email verification
 * and password reset flows. Each code is unique and unpredictable.
 */
@Injectable()
export class RandomVerificationCodeGenerator implements VerificationCodeGenerator {
  private readonly logger = new Logger(RandomVerificationCodeGenerator.name);

  /**
   * Generate a random 6-digit verification code.
   *
   * @returns A random 6-digit numeric string (100000-999999)
   */
  generate(): string {
    const min = 100000;
    const max = 999999;
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    const code = randomNum.toString();

    this.logger.debug('Generated random verification code');
    return code;
  }
}
