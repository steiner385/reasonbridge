import { IsString, IsNotEmpty, Matches, IsUUID, Length } from 'class-validator';

export class PhoneVerificationRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+\d{10,15}$/, {
    message: 'Phone number must be in E.164 format (+[country][number])',
  })
  phoneNumber: string;
}

export class PhoneVerificationVerifyDto {
  @IsUUID()
  @IsNotEmpty()
  verificationId: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/, {
    message: 'Code must be exactly 6 digits',
  })
  code: string;
}
