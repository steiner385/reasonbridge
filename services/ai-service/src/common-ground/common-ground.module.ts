import { Module } from '@nestjs/common';
import { CommonGroundSynthesizer } from './common-ground.synthesizer.js';
import { CommonGroundDetectorService } from '../services/common-ground-detector.service.js';
import { AiModule } from '../ai/ai.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';

/**
 * Common Ground Module
 *
 * Provides services for detecting common ground, misunderstandings,
 * and genuine disagreements in discussions.
 *
 * Exports:
 * - CommonGroundSynthesizer: Pattern-based common ground analysis
 * - CommonGroundDetectorService: AI-enhanced common ground detection
 */
@Module({
  imports: [AiModule, PrismaModule],
  providers: [CommonGroundSynthesizer, CommonGroundDetectorService],
  exports: [CommonGroundSynthesizer, CommonGroundDetectorService],
})
export class CommonGroundModule {}
