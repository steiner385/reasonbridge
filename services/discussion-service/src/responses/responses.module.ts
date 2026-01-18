import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ResponsesController } from './responses.controller.js';
import { ResponsesService } from './responses.service.js';
import { ContentModerationService } from './services/content-moderation.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ResponsesController],
  providers: [ResponsesService, ContentModerationService],
  exports: [ResponsesService, ContentModerationService],
})
export class ResponsesModule {}
