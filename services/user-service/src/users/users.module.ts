import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BotDetectorService } from '../services/bot-detector.service.js';
import { FeedbackPreferencesService } from '../services/feedback-preferences.service.js';

@Module({
  imports: [forwardRef(() => AuthModule), PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, BotDetectorService, FeedbackPreferencesService],
  exports: [UsersService, BotDetectorService, FeedbackPreferencesService],
})
export class UsersModule {}
