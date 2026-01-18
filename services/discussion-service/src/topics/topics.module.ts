import { Module } from '@nestjs/common';
import { TopicsController } from './topics.controller.js';
import { TopicsService } from './topics.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CacheModule } from '../cache/cache.module.js';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
