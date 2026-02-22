/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AnalyzeArgumentDto } from './analyze-argument.dto.js';

describe('AnalyzeArgumentDto', () => {
  it('should validate a valid analyze request', async () => {
    const dto = plainToInstance(AnalyzeArgumentDto, {
      userMessage: 'Climate change is a hoax because it snowed yesterday.',
      conversationContext: [{ role: 'persona', content: 'What evidence supports your position?' }],
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject empty user message', async () => {
    const dto = plainToInstance(AnalyzeArgumentDto, {
      userMessage: '',
      conversationContext: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
