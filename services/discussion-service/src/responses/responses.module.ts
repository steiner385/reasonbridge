import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ResponsesController } from './responses.controller.js';
import { ResponsesService } from './responses.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [ResponsesController],
  providers: [ResponsesService],
  exports: [ResponsesService],
})
export class ResponsesModule {}
