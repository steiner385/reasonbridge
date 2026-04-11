/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/** Result of successful user authentication */
export interface AuthResult {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

/** Result of token refresh */
export interface RefreshResult {
  accessToken: string;
  idToken: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Interface for authentication services.
 * Both CognitoService and MockAuthService implement this interface.
 */
export interface IAuthService {
  signUp(email: string, password: string, displayName: string): Promise<{ userSub: string }>;

  authenticateUser(email: string, password: string): Promise<AuthResult>;

  refreshAccessToken(refreshToken: string): Promise<RefreshResult>;

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
