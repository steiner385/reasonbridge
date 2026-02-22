/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SocialProviderDto } from '../../connections/dto/initiate-connection.dto.js';

export class ContactResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  displayName!: string | null;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  isMatched!: boolean;

  @ApiProperty({ required: false })
  matchedUser?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };

  @ApiProperty()
  importedAt!: Date;
}

export class ContactListQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  matched?: boolean;

  @ApiProperty({ enum: SocialProviderDto, required: false })
  @IsOptional()
  @IsEnum(SocialProviderDto)
  provider?: SocialProviderDto;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}

export class ContactListResponseDto {
  @ApiProperty({ type: [ContactResponseDto] })
  contacts!: ContactResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  hasMore!: boolean;
}
