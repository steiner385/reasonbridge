/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SocialProviderDto } from '../../connections/dto/initiate-connection.dto.js';

export class ImportContactsDto {
  @ApiProperty({ enum: SocialProviderDto, required: false })
  @IsOptional()
  @IsEnum(SocialProviderDto)
  provider?: SocialProviderDto;
}

export class ImportContactsResponseDto {
  @ApiProperty()
  imported!: number;

  @ApiProperty()
  matched!: number;

  @ApiProperty()
  provider!: string;
}
