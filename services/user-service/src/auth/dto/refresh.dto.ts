import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class RefreshResponseDto {
  accessToken!: string;
  idToken!: string;
  expiresIn!: number;
  tokenType!: string;
}
