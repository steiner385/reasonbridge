/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

// Module
export { ExpertiseModule } from './expertise.module.js';

// Services
export { ExpertiseService } from './expertise.service.js';
export { ExpertiseCalculatorService } from './expertise-calculator.service.js';
export type { ExpertiseScoreInput } from './expertise-calculator.service.js';

// DTOs
export { TopicExpertiseDto } from './dto/topic-expertise.dto.js';
export type { ExpertiseLeaderboardOptions } from './dto/expertise-leaderboard-options.dto.js';
export { DEFAULT_EXPERTISE_LEADERBOARD_OPTIONS } from './dto/expertise-leaderboard-options.dto.js';
