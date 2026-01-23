import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { CognitoService } from './cognito.service.js';
import { MockAuthService } from './mock-auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
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

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      // JWT verification is done using Cognito's public keys (or mock secret in test mode)
      // JwtAuthGuard handles both production (RS256/JWKS) and test (HS256/secret) modes
      signOptions: { algorithm: 'RS256' },
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController],
  providers: [authServiceProvider, CognitoService, MockAuthService, JwtAuthGuard],
  exports: [AUTH_SERVICE, CognitoService, MockAuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
