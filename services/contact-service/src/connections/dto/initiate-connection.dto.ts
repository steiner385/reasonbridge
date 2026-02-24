/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SocialProviderDto {
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
}

export class InitiateConnectionDto {
  @ApiProperty({ enum: SocialProviderDto })
  @IsEnum(SocialProviderDto)
  provider!: SocialProviderDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class InitiateConnectionResponseDto {
  @ApiProperty()
  authUrl!: string;

  @ApiProperty()
  state!: string;
}
