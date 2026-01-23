import {
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from './jwt-auth.guard.js';

/**
 * Mock JWT authentication guard for E2E testing and local development.
 * Verifies JWT tokens signed with JWT_SECRET instead of Cognito JWKS.
 *
 * Enable by setting AUTH_MOCK=true or NODE_ENV=test
 */
@Injectable()
export class MockJwtAuthGuard implements CanActivate {
  private readonly jwtSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET', 'mock-jwt-secret-for-testing');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify the token with the mock JWT secret
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.jwtSecret,
        algorithms: ['HS256'],
      });

      // Attach the payload to the request object for use in controllers
      request.user = payload;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Log for debugging but don't expose details
      console.error('Mock JWT verification error:', error);
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
