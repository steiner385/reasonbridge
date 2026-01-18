import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

/**
 * DTO for requesting a verification
 * User specifies which type of verification they want to complete
 */
export class VerificationRequestDto {
  @IsEnum(['PHONE', 'GOVERNMENT_ID', 'VIDEO'])
  type!: 'PHONE' | 'GOVERNMENT_ID' | 'VIDEO';

  /**
   * Phone number for phone verification requests (E.164 format)
   * Required when type is PHONE, ignored for other types
   */
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,15}$/, {
    message: 'Phone number must be in E.164 format',
  })
  phoneNumber?: string;

  /**
   * Challenge type for video verification
   * Determines what the user must do in their video
   */
  @IsOptional()
  @IsEnum(['RANDOM_PHRASE', 'RANDOM_GESTURE', 'TIMESTAMP'])
  challengeType?: 'RANDOM_PHRASE' | 'RANDOM_GESTURE' | 'TIMESTAMP';
}
