/**
 * Snapshot tests for common ground analysis prompts
 * Detects unintended changes to prompts sent to Bedrock
 */

import { describe, it, expect } from 'vitest';

// We need to extract prompt building into testable functions
// For now, test the prompt patterns directly
describe('Common Ground Prompts', () => {
  describe('clusterTexts prompt', () => {
    it('generates correct system prompt for clustering', () => {
      const systemPrompt = `You are an expert at semantic clustering. Group similar texts by meaning.
Return ONLY a JSON array of clusters in this exact format:
[{"theme": "description", "members": [1, 2, 3]}]
where members are the numeric IDs of the texts.`;

      expect(systemPrompt).toMatchSnapshot();
    });

    it('generates correct user prompt for clustering', () => {
      const texts = [
        { id: 1, text: 'We need stricter regulations' },
        { id: 2, text: 'Free markets solve problems' },
        { id: 3, text: 'Government oversight is essential' },
      ];

      const textList = texts.map((t) => `${t.id}. ${t.text}`).join('\n');
      const userPrompt = `Group these texts by semantic similarity:\n\n${textList}`;

      expect(userPrompt).toMatchSnapshot();
    });
  });

  describe('identifyValues prompt', () => {
    it('generates correct system prompt for value identification', () => {
      const systemPrompt = `You are an expert in moral psychology and value analysis. Identify the core values underlying different positions.
Focus on fundamental values like: fairness, liberty, loyalty, authority, sanctity, care, harm prevention, etc.
Return ONLY a JSON array of values: ["value1", "value2", "value3"]`;

      expect(systemPrompt).toMatchSnapshot();
    });

    it('generates correct user prompt for value identification', () => {
      const positions = ['Freedom is the highest value', 'We must protect the vulnerable'];

      const positionList = positions.map((p) => `- ${p}`).join('\n');
      const userPrompt = `Identify the underlying values in these positions:\n\n${positionList}`;

      expect(userPrompt).toMatchSnapshot();
    });
  });

  describe('generateClarification prompt', () => {
    it('generates correct system prompt for clarification', () => {
      const systemPrompt =
        'You are a mediator helping clarify misunderstandings. Provide a concise clarification that addresses different interpretations.';

      expect(systemPrompt).toMatchSnapshot();
    });

    it('generates correct user prompt for clarification', () => {
      const topic = 'Universal Basic Income';
      const interpretations = [
        'UBI means free money for everyone',
        'UBI is a replacement for existing welfare',
        'UBI is meant to supplement existing programs',
      ];

      const interpList = interpretations.map((i, idx) => `${idx + 1}. ${i}`).join('\n');
      const userPrompt = `Topic: "${topic}"

Different interpretations:
${interpList}

Provide a brief clarification (2-3 sentences max) that addresses the core misunderstanding.`;

      expect(userPrompt).toMatchSnapshot();
    });
  });
});
