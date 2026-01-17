import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { TopicsModule } from './topics/topics.module.js';
import { ResponsesModule } from './responses/responses.module.js';

@Module({
  imports: [PrismaModule, HealthModule, TopicsModule, ResponsesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
