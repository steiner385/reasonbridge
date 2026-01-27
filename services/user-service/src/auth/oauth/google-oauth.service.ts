import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

/**
 * Google OAuth Service
 *
 * Handles Google Sign-In OAuth flow for user authentication.
 * Provides methods to generate authorization URLs and verify ID tokens.
 *
 * Environment variables required:
 * - GOOGLE_OAUTH_CLIENT_ID: Google OAuth 2.0 Client ID
 * - GOOGLE_OAUTH_CLIENT_SECRET: Google OAuth 2.0 Client Secret
 * - GOOGLE_OAUTH_REDIRECT_URI: Callback URL for OAuth flow
 */
@Injectable()
export class GoogleOAuthService {
  private readonly logger = new Logger(GoogleOAuthService.name);
  private readonly oauth2Client: OAuth2Client;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_ID');
    this.clientSecret = this.configService.getOrThrow<string>('GOOGLE_OAUTH_CLIENT_SECRET');
    this.redirectUri = this.configService.getOrThrow<string>('GOOGLE_OAUTH_REDIRECT_URI');

    this.oauth2Client = new OAuth2Client(this.clientId, this.clientSecret, this.redirectUri);

    this.logger.log('Google OAuth service initialized');
  }

  /**
   * Generate Google OAuth authorization URL
   *
   * @param state - CSRF protection token
   * @returns Authorization URL for user to grant permissions
   */
  generateAuthUrl(state: string): string {
    this.logger.debug('Generating Google OAuth authorization URL');

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      state,
      prompt: 'consent', // Force consent screen to get refresh token
    });

    this.logger.log('Google OAuth URL generated successfully');
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens and user profile
   *
   * @param code - Authorization code from OAuth callback
   * @returns User profile information
   * @throws UnauthorizedException if code is invalid or expired
   */
  async verifyAndGetProfile(code: string): Promise<{
    email: string;
    emailVerified: boolean;
    name?: string;
    picture?: string;
    googleId: string;
  }> {
    try {
      this.logger.debug('Exchanging Google authorization code for tokens');

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      // Verify ID token and extract user info
      if (!tokens.id_token) {
        throw new UnauthorizedException('No ID token received from Google');
      }

      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google ID token payload');
      }

      this.logger.log(`Google OAuth successful for email: ${payload.email}`);

      return {
        email: payload.email,
        emailVerified: payload.email_verified || false,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub,
      };
    } catch (error: any) {
      this.logger.error(`Google OAuth verification failed: ${error.message}`, error.stack);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException({
        error: 'OAUTH_FAILED',
        message: 'Google authentication failed',
        details: {
          provider: 'GOOGLE',
          hint: 'Authorization code may be invalid or expired',
        },
      });
    }
  }

  /**
   * Verify a Google ID token directly (for mobile/SPA flows)
   *
   * @param idToken - Google ID token from client
   * @returns User profile information
   * @throws UnauthorizedException if token is invalid
   */
  async verifyIdToken(idToken: string): Promise<{
    email: string;
    emailVerified: boolean;
    name?: string;
    picture?: string;
    googleId: string;
  }> {
    try {
      this.logger.debug('Verifying Google ID token');

      const ticket = await this.oauth2Client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google ID token payload');
      }

      this.logger.log(`Google ID token verified for email: ${payload.email}`);

      return {
        email: payload.email,
        emailVerified: payload.email_verified || false,
        name: payload.name,
        picture: payload.picture,
        googleId: payload.sub,
      };
    } catch (error: any) {
      this.logger.error(`Google ID token verification failed: ${error.message}`, error.stack);

      throw new UnauthorizedException({
        error: 'INVALID_TOKEN',
        message: 'Google ID token verification failed',
        details: {
          provider: 'GOOGLE',
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
