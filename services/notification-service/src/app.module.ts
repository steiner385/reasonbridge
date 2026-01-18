import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { HandlersModule } from './handlers/handlers.module.js';
import { GatewaysModule } from './gateways/gateways.module.js';

@Module({
  imports: [PrismaModule, HealthModule, HandlersModule, GatewaysModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
