import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller.js';
import { DemoService } from './demo.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

/**
 * Module for demo content functionality
 * Provides landing page demo discussions and visitor session tracking
 */
@Module({
  imports: [PrismaModule],
  controllers: [DemoController],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
