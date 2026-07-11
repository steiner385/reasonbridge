/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@reason-bridge/common';

/**
 * Decorator to extract the current authenticated user from the request.
 * Use with @UseGuards(JwtAuthGuard) to ensure the user is authenticated.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
