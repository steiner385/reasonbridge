import { Module } from '@nestjs/common';
import { SimulatorController } from './simulator.controller.js';
import { SimulatorService } from './simulator.service.js';
import { AiModule } from '../ai/ai.module.js';

/**
 * Module for discussion simulator functionality
 */
@Module({
  imports: [AiModule],
  controllers: [SimulatorController],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
