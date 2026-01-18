import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { QueueModule } from '../queue/queue.module.js';

@Module({
  imports: [QueueModule],
  controllers: [HealthController],
})
export class HealthModule {}
