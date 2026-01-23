import { Module, forwardRef } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { CognitoService } from './cognito.service.js';
import { MockAuthService } from './mock-auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { MockJwtAuthGuard } from './mock-jwt-auth.guard.js';
import { UsersModule } from '../users/users.module.js';
import { AUTH_SERVICE } from './auth.interface.js';

/**
 * Provides either CognitoService or MockAuthService based on environment.
 * Use AUTH_MOCK=true or NODE_ENV=test to enable mock authentication.
 */
const authServiceProvider = {
  provide: AUTH_SERVICE,
  useFactory: (configService: ConfigService) => {
    const useMock =
      configService.get<string>('AUTH_MOCK') === 'true' ||
      configService.get<string>('NODE_ENV') === 'test';

    if (useMock) {
      return new MockAuthService(configService);
    }

    return new CognitoService(configService);
  },
  inject: [ConfigService],
};

/**
 * Provides either MockJwtAuthGuard or JwtAuthGuard based on environment.
 * Use AUTH_MOCK=true or NODE_ENV=test to use mock JWT verification.
 */
const jwtAuthGuardProvider = {
  provide: JwtAuthGuard,
  useFactory: (jwtService: JwtService, configService: ConfigService) => {
    const useMock =
      configService.get<string>('AUTH_MOCK') === 'true' ||
      configService.get<string>('NODE_ENV') === 'test';

    if (useMock) {
      return new MockJwtAuthGuard(jwtService, configService);
    }

    return new JwtAuthGuard(jwtService, configService);
  },
  inject: [JwtService, ConfigService],
};

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      // JWT verification is done using Cognito's public keys (or mock secret in test mode)
      // No secret needed as we verify against JWKS
      signOptions: { algorithm: 'RS256' },
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [
    authServiceProvider,
    jwtAuthGuardProvider,
    CognitoService,
    MockAuthService,
    MockJwtAuthGuard,
  ],
  exports: [
    AUTH_SERVICE,
    CognitoService,
    MockAuthService,
    JwtAuthGuard,
    MockJwtAuthGuard,
    JwtModule,
  ],
})
export class AuthModule {}
