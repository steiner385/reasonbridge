/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum InvitationStatusDto {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
}

export class InvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  topicId!: string;

  @ApiProperty({ description: 'Topic title for display' })
  topicTitle?: string;

  @ApiProperty()
  inviterId!: string;

  @ApiProperty({ description: 'Inviter display name' })
  inviterName?: string;

  @ApiProperty({ required: false })
  inviteeUserId?: string;

  @ApiProperty({ required: false })
  inviteeEmail?: string;

  @ApiProperty({ enum: InvitationStatusDto })
  status!: InvitationStatusDto;

  @ApiProperty({ required: false })
  message?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ required: false })
  respondedAt?: Date;
}

export class InvitationListQueryDto {
  @ApiProperty({ enum: InvitationStatusDto, required: false })
  @IsOptional()
  @IsEnum(InvitationStatusDto)
  status?: InvitationStatusDto;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;
}

export class InvitationListResponseDto {
  @ApiProperty({ type: [InvitationResponseDto] })
  invitations!: InvitationResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  hasMore!: boolean;
}

export class AcceptInvitationResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  topicId!: string;

  @ApiProperty({ description: 'Redirect URL for the topic' })
  redirectUrl!: string;
}
