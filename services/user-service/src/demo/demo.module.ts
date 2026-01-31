import { Module } from '@nestjs/common';
import { DemoController } from './demo.controller.js';
import { DemoService } from './demo.service.js';
import { DemoResetService } from './demo-reset.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

/**
 * Module for demo content functionality
 * Provides landing page demo discussions, visitor session tracking,
 * and demo environment reset functionality.
 */
@Module({
  imports: [PrismaModule],
  controllers: [DemoController],
  providers: [DemoService, DemoResetService],
  exports: [DemoService, DemoResetService],
})
export class DemoModule {}
