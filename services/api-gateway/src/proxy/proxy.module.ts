import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthProxyController } from './auth-proxy.controller.js';
import { UsersProxyController } from './users-proxy.controller.js';
import { TopicsProxyController } from './topics-proxy.controller.js';
import { ProxyService } from './proxy.service.js';

@Module({
  imports: [
    // Note: ConfigModule is global (set in AppModule), no need to import here
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [AuthProxyController, UsersProxyController, TopicsProxyController],
  providers: [ProxyService],
  exports: [ProxyService],
})
export class ProxyModule {}
