import { Module } from '@nestjs/common';
import { ContentScreeningService } from './content-screening.service.js';

@Module({
  providers: [ContentScreeningService],
  exports: [ContentScreeningService],
})
export class ModerationModule {}
