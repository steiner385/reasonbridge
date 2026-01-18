import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CommonGroundNotificationHandler } from './common-ground-notification.handler.js';

/**
 * Module for event handlers
 */
@Module({
  imports: [PrismaModule],
  providers: [CommonGroundNotificationHandler],
  exports: [CommonGroundNotificationHandler],
})
export class HandlersModule {}
