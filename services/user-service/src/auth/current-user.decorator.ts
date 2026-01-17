import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from './jwt-auth.guard.js';

/**
 * Decorator to extract the current authenticated user from the request.
 * Use with @UseGuards(JwtAuthGuard) to ensure user is authenticated.
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
