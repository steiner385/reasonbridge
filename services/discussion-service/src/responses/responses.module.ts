import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CacheModule } from '../cache/cache.module.js';
import { ResponsesController } from './responses.controller.js';
import { ResponsesService } from './responses.service.js';
import { ContentModerationService } from './services/content-moderation.service.js';
import { CommonGroundTriggerService } from '../services/common-ground-trigger.service.js';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [ResponsesController],
  providers: [ResponsesService, ContentModerationService, CommonGroundTriggerService],
  exports: [ResponsesService, ContentModerationService],
})
export class ResponsesModule {}
