import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import appleSignin from 'apple-signin-auth';
import { readFileSync } from 'fs';

/**
 * Apple OAuth Service
 *
 * Handles Apple Sign-In OAuth flow for user authentication.
 * Provides methods to generate authorization URLs and verify ID tokens.
 *
 * Environment variables required:
 * - APPLE_SERVICE_ID: Apple Services ID (Client ID)
 * - APPLE_TEAM_ID: Apple Team ID
 * - APPLE_KEY_ID: Apple Key ID for private key
 * - APPLE_PRIVATE_KEY_PATH: Path to Apple private key .p8 file
 * - APPLE_REDIRECT_URI: Callback URL for OAuth flow
 */
@Injectable()
export class AppleOAuthService {
  private readonly logger = new Logger(AppleOAuthService.name);
  private readonly serviceId: string;
  private readonly teamId: string;
  private readonly keyId: string;
  private readonly privateKey: string;
  private readonly redirectUri: string;

  constructor(private readonly configService: ConfigService) {
    this.serviceId = this.configService.getOrThrow<string>('APPLE_SERVICE_ID');
    this.teamId = this.configService.getOrThrow<string>('APPLE_TEAM_ID');
    this.keyId = this.configService.getOrThrow<string>('APPLE_KEY_ID');
    this.redirectUri = this.configService.getOrThrow<string>('APPLE_REDIRECT_URI');

    // Load private key from file
    const privateKeyPath = this.configService.getOrThrow<string>('APPLE_PRIVATE_KEY_PATH');
    try {
      this.privateKey = readFileSync(privateKeyPath, 'utf8');
      this.logger.log('Apple OAuth service initialized');
    } catch (error: any) {
      this.logger.error(`Failed to load Apple private key: ${error.message}`);
      throw new Error(`Apple OAuth configuration error: ${error.message}`);
    }
  }

  /**
   * Generate Apple OAuth authorization URL
   *
   * @param state - CSRF protection token
   * @returns Authorization URL for user to grant permissions
   */
  generateAuthUrl(state: string): string {
    this.logger.debug('Generating Apple OAuth authorization URL');

    // Apple Sign In authorization endpoint
    const baseUrl = 'https://appleid.apple.com/auth/authorize';
    const params = new URLSearchParams({
      client_id: this.serviceId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'name email', // Request name and email
      response_mode: 'form_post', // Apple recommends form_post
      state,
    });

    const authUrl = `${baseUrl}?${params.toString()}`;

    this.logger.log('Apple OAuth URL generated successfully');
    return authUrl;
  }

  /**
   * Verify Apple authorization code and extract user profile
   *
   * @param code - Authorization code from OAuth callback
   * @param user - Optional user data from first-time sign-in (Apple only sends this once)
   * @returns User profile information
   * @throws UnauthorizedException if verification fails
   */
  async verifyAndGetProfile(
    code: string,
    user?: { name?: { firstName?: string; lastName?: string }; email?: string },
  ): Promise<{
    email: string;
    emailVerified: boolean;
    name?: string;
    appleId: string;
  }> {
    try {
      this.logger.debug('Verifying Apple authorization code');

      // Get client secret (JWT signed with private key)
      const clientSecret = appleSignin.getClientSecret({
        clientID: this.serviceId,
        teamID: this.teamId,
        keyIdentifier: this.keyId,
        privateKey: this.privateKey,
        expAfter: 15777000, // 6 months in seconds
      });

      // Exchange code for tokens
      const tokenResponse = await appleSignin.getAuthorizationToken(code, {
        clientID: this.serviceId,
        clientSecret,
        redirectUri: this.redirectUri,
      });

      // Verify and decode ID token
      const claims = await appleSignin.verifyIdToken(tokenResponse.id_token, {
        audience: this.serviceId,
        ignoreExpiration: false,
      });

      if (!claims.email) {
        throw new UnauthorizedException('Email not provided by Apple');
      }

      // Construct full name if provided (only sent on first sign-in)
      let fullName: string | undefined;
      if (user?.name) {
        const firstName = user.name.firstName || '';
        const lastName = user.name.lastName || '';
        fullName = `${firstName} ${lastName}`.trim() || undefined;
      }

      this.logger.log(`Apple OAuth successful for email: ${claims.email}`);

      return {
        email: claims.email,
        emailVerified: claims.email_verified === 'true' || claims.email_verified === true,
        name: fullName,
        appleId: claims.sub,
      };
    } catch (error: any) {
      this.logger.error(`Apple OAuth verification failed: ${error.message}`, error.stack);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException({
        error: 'OAUTH_FAILED',
        message: 'Apple authentication failed',
        details: {
          provider: 'APPLE',
          hint: 'Authorization code may be invalid or expired',
        },
      });
    }
  }

  /**
   * Verify an Apple ID token directly (for mobile/SPA flows)
   *
   * @param idToken - Apple ID token from client
   * @returns User profile information
   * @throws UnauthorizedException if token is invalid
   */
  async verifyIdToken(idToken: string): Promise<{
    email: string;
    emailVerified: boolean;
    appleId: string;
  }> {
    try {
      this.logger.debug('Verifying Apple ID token');

      const claims = await appleSignin.verifyIdToken(idToken, {
        audience: this.serviceId,
        ignoreExpiration: false,
      });

      if (!claims.email) {
        throw new UnauthorizedException('Email not provided in ID token');
      }

      this.logger.log(`Apple ID token verified for email: ${claims.email}`);

      return {
        email: claims.email,
        emailVerified: claims.email_verified === 'true' || claims.email_verified === true,
        appleId: claims.sub,
      };
    } catch (error: any) {
      this.logger.error(`Apple ID token verification failed: ${error.message}`, error.stack);

      throw new UnauthorizedException({
        error: 'INVALID_TOKEN',
        message: 'Apple ID token verification failed',
        details: {
          provider: 'APPLE',
        },
      });
    }
  }

  /**
   * Generate CSRF state token
   * Should be stored in session/cache and verified on callback
   */
  generateStateToken(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36)
    );
  }
}
