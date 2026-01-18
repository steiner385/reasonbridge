import { IsNumber, Min, Max, IsOptional } from 'class-validator';

/**
 * TrustScoresDto - Mayer's ABI Model (Ability, Benevolence, Integrity)
 *
 * Represents the three-dimensional trust model used to assess user credibility:
 * - Ability: Quality and accuracy of user's contributions
 * - Benevolence: Helpfulness and constructive engagement
 * - Integrity: Behavioral consistency, account age, and verification status
 *
 * Each dimension is a decimal value from 0 to 1 (0-100% when displayed as percentage)
 *
 * @see https://en.wikipedia.org/wiki/Trust_(social_science)#Mayer's_Model_of_Trust
 */
export class TrustScoresDto {
  /**
   * Ability dimension: Quality of contributions, accuracy of claims
   * Range: 0.00 - 1.00
   * Calculated from user's historical contributions and community feedback
   */
  @IsNumber()
  @Min(0, { message: 'ability score must be between 0 and 1' })
  @Max(1, { message: 'ability score must be between 0 and 1' })
  ability!: number;

  /**
   * Benevolence dimension: Helpfulness ratings, constructive engagement
   * Range: 0.00 - 1.00
   * Calculated from user interactions, feedback received, and participation quality
   */
  @IsNumber()
  @Min(0, { message: 'benevolence score must be between 0 and 1' })
  @Max(1, { message: 'benevolence score must be between 0 and 1' })
  benevolence!: number;

  /**
   * Integrity dimension: Behavioral consistency, account age, verification status
   * Range: 0.00 - 1.00
   * Calculated from account history, verification level, and consistency patterns
   */
  @IsNumber()
  @Min(0, { message: 'integrity score must be between 0 and 1' })
  @Max(1, { message: 'integrity score must be between 0 and 1' })
  integrity!: number;

  /**
   * Create TrustScoresDto from raw trust score values
   * @param ability - Ability score (0-1)
   * @param benevolence - Benevolence score (0-1)
   * @param integrity - Integrity score (0-1)
   */
  constructor(ability: number, benevolence: number, integrity: number) {
    this.ability = ability;
    this.benevolence = benevolence;
    this.integrity = integrity;
  }

  /**
   * Calculate overall trust score as average of three dimensions
   * @returns Average trust score (0-1)
   */
  getOverallScore(): number {
    return (this.ability + this.benevolence + this.integrity) / 3;
  }

  /**
   * Convert trust scores to percentage format (0-100)
   * @returns Object with ability, benevolence, integrity as percentages
   */
  toPercentages(): {
    ability: number;
    benevolence: number;
    integrity: number;
    overall: number;
  } {
    return {
      ability: Math.round(this.ability * 100),
      benevolence: Math.round(this.benevolence * 100),
      integrity: Math.round(this.integrity * 100),
      overall: Math.round(this.getOverallScore() * 100),
    };
  }

  /**
   * Get human-readable trust level based on overall score
   * @returns Trust level string (very_low, low, medium, high, very_high)
   */
  getTrustLevel(): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    const overall = this.getOverallScore();
    if (overall >= 0.8) return 'very_high';
    if (overall >= 0.6) return 'high';
    if (overall >= 0.4) return 'medium';
    if (overall >= 0.2) return 'low';
    return 'very_low';
  }

  /**
   * Check if scores indicate a trustworthy user (overall score >= 0.6)
   * @returns true if overall score >= 0.6, false otherwise
   */
  isTrustworthy(): boolean {
    return this.getOverallScore() >= 0.6;
  }
}

/**
 * TrustScoreUpdateDto - Used for updating trust scores
 * Allows partial updates of trust dimensions
 */
export class TrustScoreUpdateDto {
  /**
   * Ability dimension: Quality of contributions, accuracy of claims
   * Range: 0.00 - 1.00
   */
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'ability score must be between 0 and 1' })
  @Max(1, { message: 'ability score must be between 0 and 1' })
  ability!: number | undefined;

  /**
   * Benevolence dimension: Helpfulness ratings, constructive engagement
   * Range: 0.00 - 1.00
   */
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'benevolence score must be between 0 and 1' })
  @Max(1, { message: 'benevolence score must be between 0 and 1' })
  benevolence!: number | undefined;

  /**
   * Integrity dimension: Behavioral consistency, account age, verification status
   * Range: 0.00 - 1.00
   */
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'integrity score must be between 0 and 1' })
  @Max(1, { message: 'integrity score must be between 0 and 1' })
  integrity!: number | undefined;
}

/**
 * TrustScoreResponseDto - Response DTO for trust score endpoint
 * Includes additional metadata about the trust calculation
 */
export class TrustScoreResponseDto extends TrustScoresDto {
  /**
   * User ID that these trust scores belong to
   */
  userId!: string;

  /**
   * Verification level of the user (BASIC, ENHANCED, VERIFIED_HUMAN)
   */
  verificationLevel!: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN';

  /**
   * Overall trust score (average of three dimensions)
   */
  overall!: number;

  /**
   * Human-readable trust level
   */
  trustLevel!: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';

  /**
   * Whether the user is considered trustworthy (overall >= 0.6)
   */
  trustworthy!: boolean;

  /**
   * Timestamp when scores were last calculated/updated
   */
  updatedAt!: Date;

  /**
   * Brief reasoning or description of trust scores
   */
  description?: string | undefined;

  constructor(
    userId: string,
    ability: number,
    benevolence: number,
    integrity: number,
    verificationLevel: 'BASIC' | 'ENHANCED' | 'VERIFIED_HUMAN',
    updatedAt: Date,
    description?: string,
  ) {
    super(ability, benevolence, integrity);
    this.userId = userId;
    this.verificationLevel = verificationLevel;
    this.overall = this.getOverallScore();
    this.trustLevel = this.getTrustLevel();
    this.trustworthy = this.isTrustworthy();
    this.updatedAt = updatedAt;
    this.description = description;
  }
}
