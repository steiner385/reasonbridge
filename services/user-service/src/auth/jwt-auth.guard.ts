import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as jwksClient from 'jwks-rsa';

export interface JwtPayload {
  sub: string; // Cognito user ID (cognitoSub)
  email: string;
  'cognito:username': string;
  exp: number;
  iat: number;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly jwksClient?: jwksClient.JwksClient;
  private readonly userPoolId?: string;
  private readonly region: string;
  private readonly useMockAuth: boolean;
  private readonly jwtSecret?: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.useMockAuth =
      this.configService.get<string>('AUTH_MOCK') === 'true' ||
      this.configService.get<string>('NODE_ENV') === 'test';

    if (this.useMockAuth) {
      // Mock mode - use simple JWT secret
      this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'mock-jwt-secret-for-testing');
    } else {
      // Production mode - use Cognito JWKS
      this.userPoolId = this.configService.getOrThrow<string>('COGNITO_USER_POOL_ID');
      this.jwksClient = jwksClient.default({
        jwksUri: `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}/.well-known/jwks.json`,
        cache: true,
        cacheMaxAge: 86400000, // 24 hours in milliseconds
      });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      let payload: JwtPayload;

      if (this.useMockAuth) {
        // Mock mode - verify with simple JWT secret
        payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.jwtSecret,
          algorithms: ['HS256'],
        });
      } else {
        // Production mode - verify with Cognito JWKS
        const decodedToken = this.jwtService.decode(token, { complete: true }) as {
          header: { kid: string };
          payload: JwtPayload;
        };

        if (!decodedToken || !decodedToken.header.kid) {
          throw new UnauthorizedException('Invalid token format');
        }

        const key = await this.jwksClient!.getSigningKey(decodedToken.header.kid);
        const signingKey = key.getPublicKey();

        payload = this.jwtService.verify<JwtPayload>(token, {
          publicKey: signingKey,
          algorithms: ['RS256'],
        });
      }

      // Attach the payload to the request object for use in controllers
      request.user = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log for debugging but don't expose details
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
