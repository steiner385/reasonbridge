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
}

export const AUTH_SERVICE = 'AUTH_SERVICE';
