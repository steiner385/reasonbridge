/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  type InitiateAuthCommandInput,
  type AuthFlowType,
} from '@aws-sdk/client-cognito-identity-provider';

@Injectable()
export class CognitoService {
  private readonly cognitoClient: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');

    this.cognitoClient = new CognitoIdentityProviderClient({
      region,
    });

    this.userPoolId = this.configService.getOrThrow<string>('COGNITO_USER_POOL_ID');
    this.clientId = this.configService.getOrThrow<string>('COGNITO_CLIENT_ID');
  }

  async authenticateUser(email: string, password: string) {
    try {
      const params: InitiateAuthCommandInput = {
        AuthFlow: 'USER_PASSWORD_AUTH' as AuthFlowType,
        ClientId: this.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      };

      const command = new InitiateAuthCommand(params);
      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new UnauthorizedException('Authentication failed');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        idToken: response.AuthenticationResult.IdToken!,
        refreshToken: response.AuthenticationResult.RefreshToken!,
        expiresIn: response.AuthenticationResult.ExpiresIn!,
        tokenType: response.AuthenticationResult.TokenType || 'Bearer',
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle Cognito-specific errors
      const errorObj = error as { name?: string };
      if (errorObj.name === 'NotAuthorizedException') {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (errorObj.name === 'UserNotFoundException') {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (errorObj.name === 'UserNotConfirmedException') {
        throw new UnauthorizedException(
          'Email not verified. Please check your email for verification link.',
        );
      }

      // Log unexpected errors but don't expose details to user
      console.error('Cognito authentication error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const params: InitiateAuthCommandInput = {
        AuthFlow: 'REFRESH_TOKEN_AUTH' as AuthFlowType,
        ClientId: this.clientId,
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      };

      const command = new InitiateAuthCommand(params);
      const response = await this.cognitoClient.send(command);

      if (!response.AuthenticationResult) {
        throw new UnauthorizedException('Token refresh failed');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken!,
        idToken: response.AuthenticationResult.IdToken!,
        expiresIn: response.AuthenticationResult.ExpiresIn!,
        tokenType: response.AuthenticationResult.TokenType || 'Bearer',
      };
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle Cognito-specific errors
      const errorObj = error as { name?: string };
      if (errorObj.name === 'NotAuthorizedException') {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Log unexpected errors but don't expose details to user
      console.error('Cognito token refresh error:', error);
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  /**
   * Register a new user with Cognito
   * @param email - User's email address
   * @param password - User's password
   * @param displayName - User's display name
   * @returns The Cognito user sub (unique identifier)
   */
  async signUp(email: string, password: string, displayName: string): Promise<{ userSub: string }> {
    try {
      const command = new SignUpCommand({
        ClientId: this.clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          {
            Name: 'email',
            Value: email,
          },
          {
            Name: 'name',
            Value: displayName,
          },
        ],
      });

      const response = await this.cognitoClient.send(command);

      if (!response.UserSub) {
        throw new Error('Registration failed: No user sub returned');
      }

      return {
        userSub: response.UserSub,
      };
    } catch (error: unknown) {
      // Handle Cognito-specific errors
      const errorObj = error as { name?: string; message?: string };

      if (errorObj.name === 'UsernameExistsException') {
        throw new ConflictException('An account with this email already exists');
      }

      if (errorObj.name === 'InvalidPasswordException') {
        throw new UnauthorizedException(errorObj.message || 'Password does not meet requirements');
      }

      if (errorObj.name === 'InvalidParameterException') {
        throw new UnauthorizedException(errorObj.message || 'Invalid registration parameters');
      }

      // Log unexpected errors but don't expose details to user
      console.error('Cognito sign up error:', error);
      throw new Error('Registration failed. Please try again.');
    }
  }

  /**
   * Confirm user sign-up with verification code
   * @param email - User's email address
   * @param code - Verification code sent to user's email
   */
  async confirmSignUp(email: string, code: string): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.clientId,
        Username: email,
        ConfirmationCode: code,
      });
      await this.cognitoClient.send(command);
    } catch (error: unknown) {
      const errorObj = error as { name?: string; message?: string };
      if (errorObj.name === 'CodeMismatchException') {
        throw new UnauthorizedException('Invalid verification code');
      }
      if (errorObj.name === 'ExpiredCodeException') {
        throw new UnauthorizedException('Verification code has expired');
      }
      throw new UnauthorizedException('Email verification failed');
    }
  }

  /**
   * Alias for authenticateUser (backward compatibility)
   */
  async initiateAuth(email: string, password: string) {
    return this.authenticateUser(email, password);
  }

  /**
   * Resend verification code to user's email
   * @param email - User's email address
   */
  async resendCode(email: string): Promise<void> {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.clientId,
        Username: email,
      });
      await this.cognitoClient.send(command);
    } catch (error: unknown) {
      const errorObj = error as { name?: string };
      if (errorObj.name === 'UserNotFoundException') {
        throw new UnauthorizedException('User not found');
      }
      throw new Error('Failed to resend verification code');
    }
  }
}
