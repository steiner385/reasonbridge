import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * Optional JWT Authentication Guard
 *
 * Similar to JwtAuthGuard but does NOT throw an error if token is missing or invalid.
 * Instead, it silently continues without attaching user to the request.
 *
 * This is useful for endpoints that provide enhanced features for authenticated users
 * but also allow anonymous access.
 *
 * Usage:
 * ```typescript
 * @UseGuards(OptionalAuthGuard)
 * @Get('public-or-private')
 * getData(@Request() req) {
 *   if (req.user) {
 *     // User is authenticated, provide personalized data
 *     return this.getPersonalizedData(req.user);
 *   } else {
 *     // Anonymous user, provide public data
 *     return this.getPublicData();
 *   }
 * }
 * ```
 *
 * Expected header format (optional):
 * Authorization: Bearer <jwt_token>
 *
 * If valid token is provided, decoded payload is attached to request.user
 * If token is missing/invalid, request.user is undefined
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  /**
   * Determines if the request can activate the route
   * Always returns true (never blocks the request)
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    // Call parent to attempt authentication
    // But we'll override handleRequest to not throw errors
    return super.canActivate(context) as boolean | Promise<boolean> | Observable<boolean>;
  }

  /**
   * Handles authentication result without throwing errors
   * Returns user if authentication succeeded, undefined otherwise
   */
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext): TUser | undefined {
    // If authentication succeeded, return the user
    if (user) {
      return user;
    }

    // If authentication failed, just return undefined without throwing
    // This allows the request to proceed as an anonymous request
    return undefined as any;
  }

  /**
   * Override to prevent errors from bubbling up
   * This ensures missing/invalid tokens don't stop request processing
   */
  getRequest(context: ExecutionContext): any {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();

    // Ensure we don't throw on missing Authorization header
    return request;
  }
}
