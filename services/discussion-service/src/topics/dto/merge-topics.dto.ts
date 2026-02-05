import { IsArray, IsUUID, IsString, ArrayMinSize, Length } from 'class-validator';

/**
 * DTO for merging multiple topics into one
 * Feature 016: Topic Management (T009)
 *
 * Moderator-only operation
 */
export class MergeTopicsDto {
  /**
   * Source topic IDs to merge (will be archived after merge)
   * Minimum 1 source topic required
   */
  @IsArray()
  @ArrayMinSize(1, {
    message: 'At least 1 source topic is required',
  })
  @IsUUID('4', {
    each: true,
    message: 'Each source topic ID must be a valid UUID',
  })
  sourceTopicIds: string[];

  /**
   * Target topic ID (destination topic that will receive merged content)
   */
  @IsUUID('4', {
    message: 'Target topic ID must be a valid UUID',
  })
  targetTopicId: string;

  /**
   * Reason for merge (required for audit trail)
   */
  @IsString()
  @Length(20, 1000, {
    message: 'Merge reason must be between 20 and 1000 characters',
  })
  mergeReason: string;
}
