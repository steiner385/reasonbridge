import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AuthProxyController } from './auth-proxy.controller.js';
import { UsersProxyController } from './users-proxy.controller.js';
import { TopicsProxyController } from './topics-proxy.controller.js';
import { ProxyService } from './proxy.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AuthProxyController, UsersProxyController, TopicsProxyController],
  providers: [ProxyService],
})
export class ProxyModule {}
