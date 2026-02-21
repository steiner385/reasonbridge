/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { GenerateInsightsDto } from './generate-insights.dto.js';

describe('GenerateInsightsDto', () => {
  it('should validate a valid insights request', async () => {
    const dto = plainToInstance(GenerateInsightsDto, {
      transcript: [
        { id: '1', role: 'user', content: 'Test message', timestamp: new Date().toISOString() },
      ],
      mode: 'debate',
      persona: { name: 'Skeptic', position: 'Questions claims', tone: 'analytical' },
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid mode', async () => {
    const dto = plainToInstance(GenerateInsightsDto, {
      transcript: [],
      mode: 'invalid',
      persona: { name: 'Test', position: 'Test', tone: 'analytical' },
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
