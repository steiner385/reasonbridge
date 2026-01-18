import { IsEnum, IsString, Matches, ValidateIf } from 'class-validator';

/**
 * DTO for requesting a verification
 * User specifies which type of verification they want to complete
 */
export class VerificationRequestDto {
  @IsEnum(['PHONE', 'GOVERNMENT_ID'], {
    message: 'Verification type must be either PHONE or GOVERNMENT_ID',
  })
  type!: 'PHONE' | 'GOVERNMENT_ID';

  /**
   * Phone number for phone verification requests (E.164 format)
   * Required when type is PHONE, ignored for other types
   */
  @ValidateIf((obj) => obj.type === 'PHONE')
  @IsString()
  @Matches(/^\+\d{1,15}$/, {
    message: 'Phone number must be in E.164 format (e.g., +12125551234)',
  })
  phoneNumber?: string;
}
