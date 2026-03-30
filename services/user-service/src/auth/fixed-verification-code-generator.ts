/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import type { VerificationCodeGenerator } from './verification-code-generator.interface.js';

/**
 * E2E testing implementation of verification code generator.
 *
 * Returns a fixed, predictable code for automated testing scenarios.
 * This allows E2E tests to complete the full signup verification flow
 * without needing to intercept emails or SMS messages.
 *
 * @remarks
 * This implementation should ONLY be injected in E2E test environments.
 * The factory provider in auth.module.ts ensures this by checking
 * the E2E_VERIFICATION_CODE environment variable.
 */
@Injectable()
export class FixedVerificationCodeGenerator implements VerificationCodeGenerator {
  private readonly logger = new Logger(FixedVerificationCodeGenerator.name);
  private readonly fixedCode: string;

  /**
   * Create a fixed verification code generator.
   *
   * @param fixedCode - The fixed 6-digit code to return for all generations
   */
  constructor(fixedCode: string) {
    if (!/^\d{6}$/.test(fixedCode)) {
      throw new Error(`Invalid fixed verification code: must be exactly 6 digits`);
    }
    this.fixedCode = fixedCode;
    this.logger.warn('Using FIXED verification code generator - E2E mode only');
  }

  /**
   * Return the fixed verification code.
   *
   * @returns The configured fixed 6-digit code
   */
  generate(): string {
    this.logger.debug('Returning fixed E2E verification code');
    return this.fixedCode;
  }
}
