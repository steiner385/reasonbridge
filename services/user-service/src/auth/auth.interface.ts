/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Interface for authentication services.
 * Both CognitoService and MockAuthService implement this interface.
 */
export interface IAuthService {
  signUp(email: string, password: string, displayName: string): Promise<{ userSub: string }>;

  authenticateUser(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
    tokenType: string;
  }>;

  refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    idToken: string;
    expiresIn: number;
    tokenType: string;
  }>;

  /**
   * Request a password reset for the given email.
   * Always succeeds silently (even for non-existent accounts) to prevent email enumeration.
   */
  requestPasswordReset(email: string): Promise<void>;

  /**
   * Reset the password using a verification code.
   * @throws UnauthorizedException if the code is invalid or expired
   * @throws BadRequestException if the new password is invalid
   */
  resetPassword(email: string, code: string, newPassword: string): Promise<void>;
}

export const AUTH_SERVICE = 'AUTH_SERVICE';
