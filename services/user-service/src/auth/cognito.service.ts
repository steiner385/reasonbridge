import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
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
        throw new UnauthorizedException('Email not verified. Please check your email for verification link.');
      }

      // Log unexpected errors but don't expose details to user
      console.error('Cognito authentication error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
