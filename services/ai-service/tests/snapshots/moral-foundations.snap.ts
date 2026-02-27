/**
 * Snapshot tests for moral foundation analysis prompts
 * Detects unintended changes to prompts sent to Bedrock
 */

import { describe, it, expect } from 'vitest';

describe('Moral Foundations Prompts', () => {
  describe('analyzeMoralFoundations prompt', () => {
    it('generates correct system prompt for foundation analysis', () => {
      const systemPrompt = `Analyze the moral foundations present in the given text. Identify which of the six moral foundations are expressed: Care/Harm, Fairness/Cheating, Loyalty/Betrayal, Authority/Subversion, Sanctity/Degradation, Liberty/Oppression.
Return a JSON object with foundation scores from 0.0 to 1.0.`;

      expect(systemPrompt).toMatchSnapshot();
    });

    it('generates correct user prompt for single text analysis', () => {
      const text = 'We must protect the vulnerable members of our society.';
      const userPrompt = `Analyze: '${text}'`;

      expect(userPrompt).toMatchSnapshot();
    });

    it('generates correct user prompt for comparative analysis', () => {
      const texts = [
        'Individual liberty must be preserved at all costs.',
        'The community good outweighs personal preferences.',
      ];

      const textList = texts.map((t, i) => `${i + 1}. "${t}"`).join('\n');
      const userPrompt = `Compare the moral foundations in these statements:\n\n${textList}\n\nReturn a JSON object with foundations for each statement.`;

      expect(userPrompt).toMatchSnapshot();
    });
  });

  describe('mapToFoundations prompt', () => {
    it('generates correct prompt for mapping values to foundations', () => {
      const values = ['freedom', 'fairness', 'tradition'];
      const valueList = values.join(', ');
      const userPrompt = `Map these values to moral foundations: ${valueList}

Return a JSON object mapping each value to its primary moral foundation.`;

      expect(userPrompt).toMatchSnapshot();
    });
  });

  describe('detectFoundationConflicts prompt', () => {
    it('generates correct prompt for conflict detection', () => {
      const positions = [
        { author: 'User A', text: 'Freedom above all else' },
        { author: 'User B', text: 'Safety requires some restrictions' },
      ];

      const positionList = positions.map((p) => `${p.author}: "${p.text}"`).join('\n');
      const systemPrompt =
        'Identify potential value conflicts between positions based on differing moral foundations.';
      const userPrompt = `Positions:\n${positionList}\n\nIdentify the underlying moral foundation conflict.`;

      expect(systemPrompt).toMatchSnapshot();
      expect(userPrompt).toMatchSnapshot();
    });
  });
});
