/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { IsString, IsOptional, IsUUID, IsEmail, ValidateIf, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInvitationDto {
  @ApiProperty({ description: 'Topic ID to invite the user to' })
  @IsUUID()
  topicId!: string;

  @ApiProperty({
    description: 'User ID of existing ReasonBridge user (mutually exclusive with inviteeEmail)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  @ValidateIf((o) => !o.inviteeEmail)
  inviteeUserId?: string;

  @ApiProperty({
    description: 'Email address for non-user invitation (mutually exclusive with inviteeUserId)',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  @ValidateIf((o) => !o.inviteeUserId)
  inviteeEmail?: string;

  @ApiProperty({
    description: 'Optional personal message to include with the invitation',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

export class CreateInvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  topicId!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty()
  createdAt!: Date;
}
