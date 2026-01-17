import { IsString, IsOptional, Length } from 'class-validator';

/**
 * DTO for updating user profile information
 * Only allows updating fields that users should be able to modify
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 50, { message: 'Display name must be between 1 and 50 characters' })
  displayName?: string;
}
