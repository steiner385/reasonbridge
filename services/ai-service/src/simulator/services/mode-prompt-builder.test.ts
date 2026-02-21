/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { ModePromptBuilder } from './mode-prompt-builder.js';

describe('ModePromptBuilder', () => {
  const builder = new ModePromptBuilder();

  describe('buildModeInstructions', () => {
    it('should generate socratic mode instructions', () => {
      const instructions = builder.buildModeInstructions('socratic');
      expect(instructions).toContain('clarifying questions');
      expect(instructions).toContain('assumptions');
      expect(instructions).not.toContain('counter-argument');
    });

    it('should generate debate mode instructions', () => {
      const instructions = builder.buildModeInstructions('debate');
      expect(instructions).toContain('counter-argument');
      expect(instructions).toContain('evidence');
    });

    it('should generate steelman mode instructions', () => {
      const instructions = builder.buildModeInstructions('steelman');
      expect(instructions).toContain('strongest');
      expect(instructions).toContain('opposing');
    });

    it('should generate common_ground mode instructions', () => {
      const instructions = builder.buildModeInstructions('common_ground');
      expect(instructions).toContain('agreement');
      expect(instructions).toContain('shared');
    });
  });

  describe('buildDifficultyInstructions', () => {
    it('should generate novice difficulty instructions', () => {
      const instructions = builder.buildDifficultyInstructions('novice');
      expect(instructions).toContain('simple');
      expect(instructions).toContain('patient');
    });

    it('should generate expert difficulty instructions', () => {
      const instructions = builder.buildDifficultyInstructions('expert');
      expect(instructions).toContain('sophisticated');
      expect(instructions).toContain('demanding');
    });
  });

  describe('buildFullSystemPrompt', () => {
    it('should combine persona, mode, and difficulty', () => {
      const prompt = builder.buildFullSystemPrompt(
        'You are a test persona.',
        'debate',
        'intermediate',
      );
      expect(prompt).toContain('test persona');
      expect(prompt).toContain('counter-argument');
      expect(prompt).toContain('moderately complex');
    });
  });
});
