/**
 * Response DTO for verification requests
 * Contains information about the initiated verification process
 */
export class VerificationResponseDto {
  /**
   * Unique identifier for this verification attempt
   * Used to correlate with confirmation/completion steps
   */
  verificationId!: string;

  /**
   * Type of verification initiated
   */
  type!: string;

  /**
   * When this verification request expires
   * Verification attempts must be completed before this time
   */
  expiresAt!: string; // ISO 8601 datetime

  /**
   * For phone verification: message indicating next steps
   * For government ID: session URL or redirect information
   */
  message?: string;

  /**
   * For government ID verification: URL where user should complete verification
   */
  sessionUrl?: string;
}

/**
 * DTO for verification record representation
 * Represents a completed or in-progress verification
 */
export class VerificationRecordDto {
  id!: string;
  userId!: string;
  type!: string;
  status!: string; // PENDING | VERIFIED | REJECTED | EXPIRED
  verifiedAt?: string; // ISO 8601 datetime
  expiresAt?: string; // ISO 8601 datetime
  createdAt!: string; // ISO 8601 datetime
}
