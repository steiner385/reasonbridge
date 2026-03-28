/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interface for verification code generation strategy.
 *
 * This abstraction allows different implementations for production
 * (random codes) vs E2E testing (fixed predictable codes) without
 * polluting production code with test-specific logic.
 */
export interface VerificationCodeGenerator {
  /**
   * Generate a 6-digit verification code.
   *
   * @returns A 6-digit numeric string (e.g., "123456")
   */
  generate(): string;
}

/**
 * Injection token for the verification code generator.
 * Used by NestJS dependency injection to resolve the appropriate implementation.
 */
export const VERIFICATION_CODE_GENERATOR = Symbol('VERIFICATION_CODE_GENERATOR');
