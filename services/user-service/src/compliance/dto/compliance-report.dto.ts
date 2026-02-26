/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  IsDateString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ComplianceAction } from '@prisma/client';

/**
 * Query DTO for compliance report filters
 */
export class ComplianceReportQueryDto {
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  startDate!: string;

  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate!: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeMinorsOnly?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(ComplianceAction, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim());
    }
    return value;
  })
  actionTypes?: ComplianceAction[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * Response DTO for compliance report summary
 */
export class ComplianceReportSummaryResponseDto {
  reportPeriod!: {
    start: string;
    end: string;
  };
  generatedAt!: string;
  totalMinorUsers!: number;
  ageVerifications!: number;
  consentRequestsSent!: number;
  consentsVerified!: number;
  consentsWithdrawn!: number;
  dataDeletionRequests!: number;
  dataDeletionsCompleted!: number;
  regionBreakdown!: Record<string, number>;
}

/**
 * Audit log entry in detailed report
 */
export class AuditLogEntryDto {
  id!: string;
  userId!: string;
  action!: ComplianceAction;
  metadata!: object;
  timestamp!: string;
}

/**
 * Response DTO for detailed compliance report
 */
export class ComplianceReportDetailResponseDto {
  summary!: ComplianceReportSummaryResponseDto;
  auditLogs!: AuditLogEntryDto[];
}
