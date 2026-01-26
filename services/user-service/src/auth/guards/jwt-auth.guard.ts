import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Authentication Guard
 *
 * Protects routes by requiring a valid JWT access token in the Authorization header.
 * Uses Passport's JWT strategy under the hood.
 *
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedResource(@Request() req) {
 *   return req.user; // JWT payload
 * }
 * ```
 *
 * Expected header format:
 * Authorization: Bearer <jwt_token>
 *
 * On successful authentication, the decoded JWT payload is attached to request.user
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Determines if the request can activate the route
   * Validates JWT token and attaches user to request
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  /**
   * Handles authentication errors and provides user-friendly messages
   */
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext): TUser {
    // If Passport strategy threw an error
    if (err) {
      throw err;
    }

    // If no user was found (token invalid, expired, or missing)
    if (!user) {
      const error = this.getErrorMessage(info);
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: error.message,
        details: {
          hint: 'Include valid JWT token in Authorization header',
          reason: error.reason,
        },
      });
    }

    return user;
  }

  /**
   * Extracts user-friendly error messages from Passport info
   */
  private getErrorMessage(info: any): { message: string; reason: string } {
    if (!info) {
      return {
        message: 'Authentication required',
        reason: 'NO_TOKEN',
      };
    }

    // Handle specific JWT errors
    if (info.name === 'TokenExpiredError') {
      return {
        message: 'Access token has expired',
        reason: 'TOKEN_EXPIRED',
      };
    }

    if (info.name === 'JsonWebTokenError') {
      return {
        message: 'Invalid access token',
        reason: 'INVALID_TOKEN',
      };
    }

    if (info.name === 'NotBeforeError') {
      return {
        message: 'Token not yet valid',
        reason: 'TOKEN_NOT_ACTIVE',
      };
    }

    if (info.message === 'No auth token') {
      return {
        message: 'No authentication token provided',
        reason: 'NO_TOKEN',
      };
    }

    // Generic error
    return {
      message: 'Authentication failed',
      reason: info.message || 'UNKNOWN',
    };
  }
}
