import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { CognitoService } from './cognito.service.js';

@Module({
  controllers: [AuthController],
  providers: [CognitoService],
  exports: [CognitoService],
})
export class AuthModule {}
