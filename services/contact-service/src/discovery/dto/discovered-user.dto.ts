/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class DiscoveredUserDto {
  @ApiProperty({ description: 'User ID of the discovered ReasonBridge user' })
  userId!: string;

  @ApiProperty({ description: 'Display name of the user' })
  displayName!: string;

  @ApiProperty({ description: 'Avatar URL if available', required: false })
  avatarUrl?: string;

  @ApiProperty({
    description: 'Number of mutual contacts who also have this user in their contacts',
  })
  mutualContacts!: number;
}

export class DiscoveryResponseDto {
  @ApiProperty({ type: [DiscoveredUserDto], description: 'List of discovered users from contacts' })
  users!: DiscoveredUserDto[];

  @ApiProperty({ description: 'Total number of discoverable users found' })
  total!: number;
}

export class DiscoveryQueryDto {
  @ApiProperty({ required: false, default: 50, description: 'Maximum number of users to return' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ required: false, default: 0, description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
