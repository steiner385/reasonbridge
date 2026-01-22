import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { ProxyModule } from './proxy/proxy.module.js';

@Module({
  imports: [HealthModule, ProxyModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
