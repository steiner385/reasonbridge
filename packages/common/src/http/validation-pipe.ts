/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { ValidationPipe } from '@nestjs/common';
import type { ValidationPipeOptions } from '@nestjs/common';

/**
 * Standard global validation policy for reasonBridge backend services.
 *
 * @remarks
 * Historically services disagreed on unknown-field handling: user-service and
 * contact-service rejected unknown fields (400), discussion-service silently
 * stripped them, and several services had no global ValidationPipe at all. This
 * helper centralises a single, safer-for-consumers policy so a typo'd or extra
 * field is rejected with a clear 400 rather than being silently ignored.
 *
 * Policy:
 * - `whitelist: true` — strip properties without validation decorators.
 * - `forbidNonWhitelisted: true` — reject requests containing unknown fields.
 * - `transform: true` — transform plain payloads into DTO instances.
 *
 * **Do not apply to the API gateway:** its proxy controllers bind raw
 * `Record<string, any>` bodies with no DTO, so `whitelist: true` would strip
 * every field. The gateway forwards bodies verbatim and relies on downstream
 * services to validate.
 *
 * @param overrides - Optional ValidationPipe options merged over the defaults
 * @returns A configured {@link ValidationPipe} instance
 *
 * @example
 * ```typescript
 * app.useGlobalPipes(createValidationPipe());
 * ```
 */
export function createValidationPipe(overrides: ValidationPipeOptions = {}): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    ...overrides,
  });
}
