import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { HandlersModule } from './handlers/handlers.module.js';

@Module({
  imports: [PrismaModule, HealthModule, HandlersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
