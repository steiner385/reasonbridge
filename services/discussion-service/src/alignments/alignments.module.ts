import { Module } from '@nestjs/common';
import { AlignmentsController } from './alignments.controller.js';
import { AlignmentsService } from './alignments.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AlignmentsController],
  providers: [AlignmentsService],
  exports: [AlignmentsService],
})
export class AlignmentsModule {}
