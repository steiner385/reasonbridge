/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ChatRequestDto } from './chat-request.dto.js';

describe('ChatRequestDto', () => {
  it('should validate a valid chat request', async () => {
    const dto = plainToInstance(ChatRequestDto, {
      persona: {
        name: 'The Skeptic',
        position: 'Questions all claims',
        background: 'Analytical thinker',
        tone: 'analytical',
        receptiveness: 0.5,
        argumentation: {
          usesEmotionalAppeals: false,
          citesData: true,
          asksQuestions: true,
        },
      },
      mode: 'socratic',
      difficulty: 'intermediate',
      userMessage: 'I believe climate change is real.',
      conversationHistory: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject invalid mode', async () => {
    const dto = plainToInstance(ChatRequestDto, {
      persona: {
        name: 'Test',
        position: 'Test',
        background: 'Test',
        tone: 'analytical',
        receptiveness: 0.5,
        argumentation: { usesEmotionalAppeals: false, citesData: false, asksQuestions: false },
      },
      mode: 'invalid',
      difficulty: 'novice',
      userMessage: 'Test',
      conversationHistory: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject empty user message', async () => {
    const dto = plainToInstance(ChatRequestDto, {
      persona: {
        name: 'Test',
        position: 'Test',
        background: 'Test',
        tone: 'analytical',
        receptiveness: 0.5,
        argumentation: { usesEmotionalAppeals: false, citesData: false, asksQuestions: false },
      },
      mode: 'debate',
      difficulty: 'novice',
      userMessage: '',
      conversationHistory: [],
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
