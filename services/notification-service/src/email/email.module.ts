/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module } from '@nestjs/common';
import { EmailService } from './email.service.js';

/**
 * Module for email services.
 */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
