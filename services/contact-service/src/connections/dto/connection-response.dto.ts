/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProperty } from '@nestjs/swagger';

export class ConnectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty()
  connectedAt!: Date;

  @ApiProperty()
  contactCount!: number;
}

export class ConnectionListResponseDto {
  @ApiProperty({ type: [ConnectionResponseDto] })
  connections!: ConnectionResponseDto[];
}
