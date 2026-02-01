/**
 * DTOs for demo persona details endpoint
 *
 * Provides detailed persona information for demo environment exploration.
 */

import { IsOptional, IsString, IsEnum } from 'class-validator';

/**
 * Moral Foundation Theory profile scores
 */
export class MoralFoundationProfileDto {
  /** Care/Harm foundation (0-1) */
  care!: number;

  /** Fairness/Cheating foundation (0-1) */
  fairness!: number;

  /** Loyalty/Betrayal foundation (0-1) */
  loyalty!: number;

  /** Authority/Subversion foundation (0-1) */
  authority!: number;

  /** Sanctity/Degradation foundation (0-1) */
  sanctity!: number;

  /** Liberty/Oppression foundation (0-1) */
  liberty!: number;
}

/**
 * Trust score breakdown
 */
export class TrustScoreDto {
  /** Ability component (0-1) */
  ability!: number;

  /** Benevolence component (0-1) */
  benevolence!: number;

  /** Integrity component (0-1) */
  integrity!: number;

  /** Composite trust score (0-1) */
  composite!: number;
}

/**
 * Activity statistics for a demo persona
 */
export class ActivityStatsDto {
  /** Number of topics created */
  topicsCreated!: number;

  /** Number of responses written */
  responsesWritten!: number;

  /** Number of alignments recorded */
  alignmentsRecorded!: number;

  /** Activity level classification */
  activityLevel!: 'low' | 'medium' | 'high' | 'very_high';
}

/**
 * Query parameters for demo personas request
 */
export class GetDemoPersonasQueryDto {
  @IsOptional()
  @IsString()
  @IsEnum(['admin', 'moderator', 'power_user', 'regular_user', 'new_user'])
  role?: string;
}

/**
 * Full details for a demo persona
 */
export class DemoPersonaDto {
  /** Unique identifier */
  id!: string;

  /** Display name */
  displayName!: string;

  /** Email address */
  email!: string;

  /** Role classification */
  role!: 'admin' | 'moderator' | 'power_user' | 'regular_user' | 'new_user';

  /** Role display label */
  roleLabel!: string;

  /** Brief description of persona purpose */
  description!: string;

  /** Verification level */
  verificationLevel!: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN';

  /** Trust score breakdown */
  trustScore!: TrustScoreDto;

  /** Moral Foundation Theory profile */
  moralFoundationProfile!: MoralFoundationProfileDto;

  /** Activity statistics */
  activityStats!: ActivityStatsDto;

  /** Features/capabilities available to this persona */
  capabilities!: string[];
}

/**
 * Response containing demo personas
 */
export class DemoPersonasResponseDto {
  /** List of demo personas */
  personas!: DemoPersonaDto[];

  /** Total number of personas */
  count!: number;

  /** Explanation of persona purposes */
  description!: string;
}
