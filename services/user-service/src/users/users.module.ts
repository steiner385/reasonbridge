import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BotDetectorService } from '../services/bot-detector.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, BotDetectorService],
  exports: [UsersService, BotDetectorService],
})
export class UsersModule {}
