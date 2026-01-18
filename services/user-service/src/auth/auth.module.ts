import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { CognitoService } from './cognito.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Module({
  imports: [
    JwtModule.register({
      // JWT verification is done using Cognito's public keys
      // No secret needed as we verify against JWKS
      signOptions: { algorithm: 'RS256' },
    }),
  ],
  controllers: [AuthController],
  providers: [CognitoService, JwtAuthGuard],
  exports: [CognitoService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
