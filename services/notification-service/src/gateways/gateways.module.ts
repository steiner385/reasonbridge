import { Module } from '@nestjs/common';
import { NotificationGateway } from './notification.gateway.js';

@Module({
  providers: [NotificationGateway],
  exports: [NotificationGateway],
})
export class GatewaysModule {}
