/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import type { VerificationCodeGenerator } from './verification-code-generator.interface.js';
import { VERIFICATION_CODE } from '../constants/index.js';

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
    const randomNum =
      Math.floor(Math.random() * (VERIFICATION_CODE.MAX_VALUE - VERIFICATION_CODE.MIN_VALUE + 1)) +
      VERIFICATION_CODE.MIN_VALUE;
    const code = randomNum.toString();

    this.logger.debug('Generated random verification code');
    return code;
  }
}
