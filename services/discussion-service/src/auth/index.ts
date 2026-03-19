/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export { AuthModule } from './auth.module.js';
export { JwtAuthGuard, type JwtPayload } from './jwt-auth.guard.js';
export { OptionalAuthGuard } from './guards/optional-auth.guard.js';
export { CurrentUser } from './current-user.decorator.js';
