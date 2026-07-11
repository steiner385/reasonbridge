/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Whether the service is running in test / E2E mode.
 *
 * @remarks
 * Test mode enables two sensitive behaviours in phone verification: persisting
 * the plaintext OTP (`otpPlaintext`) and exposing it through the `test-otp`
 * endpoint. It is gated on `NODE_ENV === 'test'` or `E2E_MODE === 'true'`.
 *
 * A production boot (`NODE_ENV === 'production'`) can never be test mode — a
 * stray `E2E_MODE=true` there is rejected at startup by
 * {@link assertTestModeSafe} (issue #1305), so this helper deliberately ignores
 * `E2E_MODE` when `NODE_ENV` is production as a defence-in-depth backstop.
 */
export function isTestMode(): boolean {
  if (process.env['NODE_ENV'] === 'production') {
    return false;
  }
  return process.env['NODE_ENV'] === 'test' || process.env['E2E_MODE'] === 'true';
}

/**
 * Fail-fast guard against a dangerous env combination (issue #1305).
 *
 * `E2E_MODE=true` enables plaintext-OTP persistence and the OTP-disclosure
 * endpoint, which must never be active in production. Rather than silently
 * ignoring the flag, refuse to boot so the misconfiguration is caught loudly.
 *
 * @throws {Error} When `NODE_ENV === 'production'` and `E2E_MODE === 'true'`
 */
export function assertTestModeSafe(): void {
  if (process.env['NODE_ENV'] === 'production' && process.env['E2E_MODE'] === 'true') {
    throw new Error(
      'Refusing to start: E2E_MODE=true is not allowed when NODE_ENV=production. ' +
        'It would enable plaintext OTP storage and the test-otp disclosure endpoint.',
    );
  }
}
