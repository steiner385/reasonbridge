import {
  ArgumentTranslator,
  type MoralFoundationProfile,
  type TranslationInput,
} from '../synthesizers/argument.translator.js';

describe('ArgumentTranslator', () => {
  let translator: ArgumentTranslator;

  beforeEach(() => {
    translator = new ArgumentTranslator();
  });

  it('should be defined', () => {
    expect(translator).toBeDefined();
  });

  describe('translate', () => {
    it('should translate liberty-based argument to care-based framing', async () => {
      const sourceProfile: MoralFoundationProfile = {
        liberty: 0.9,
        fairness: 0.3,
        care: 0.2,
        loyalty: 0.2,
        authority: 0.2,
        sanctity: 0.1,
      };

      const targetProfile: MoralFoundationProfile = {
        care: 0.9,
        fairness: 0.4,
        liberty: 0.3,
        loyalty: 0.2,
        authority: 0.2,
        sanctity: 0.1,
      };

      const input: TranslationInput = {
        originalArgument:
          'People should have the freedom to make their own healthcare decisions without government interference.',
        sourceProfile,
        targetProfile,
      };

      const result = await translator.translate(input);

      expect(result).toBeDefined();
      expect(result.reframedArgument).toBeDefined();
      expect(result.reframedArgument.length).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
      expect(result.reasoning).toBeDefined();
      expect(result.bridgedFoundations.source).toContain('liberty');
      // The target foundation should be the highest priority one from the target profile
      expect(result.bridgedFoundations.target.length).toBeGreaterThan(0);
      // For this specific case, care is the dominant target foundation
      expect(result.bridgedFoundations.target[0]).toBe('care');
    });

    it('should translate care-based argument to liberty-based framing', async () => {
      const sourceProfile: MoralFoundationProfile = {
        care: 0.9,
        fairness: 0.6,
        liberty: 0.3,
        loyalty: 0.2,
        authority: 0.2,
        sanctity: 0.1,
      };

      const targetProfile: MoralFoundationProfile = {
        liberty: 0.9,
        fairness: 0.7,
        care: 0.4,
        loyalty: 0.3,
        authority: 0.2,
        sanctity: 0.1,
      };

      const input: TranslationInput = {
        originalArgument:
          'We need stronger environmental protections to prevent harm to vulnerable communities.',
        sourceProfile,
        targetProfile,
      };

      const result = await translator.translate(input);

      expect(result.reframedArgument).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.bridgedFoundations.source).toContain('care');
      expect(result.bridgedFoundations.target).toContain('liberty');
    });

    it('should translate authority-based argument to fairness-based framing', async () => {
      const sourceProfile: MoralFoundationProfile = {
        authority: 0.9,
        loyalty: 0.7,
        sanctity: 0.6,
        fairness: 0.4,
        care: 0.3,
        liberty: 0.2,
      };

      const targetProfile: MoralFoundationProfile = {
        fairness: 0.9,
        care: 0.8,
        liberty: 0.7,
        loyalty: 0.3,
        authority: 0.2,
        sanctity: 0.1,
      };

      const input: TranslationInput = {
        originalArgument:
          'We should respect the established institutions that have maintained order for decades.',
        sourceProfile,
        targetProfile,
      };

      const result = await translator.translate(input);

      expect(result.reframedArgument).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.bridgedFoundations.source).toContain('authority');
      expect(result.bridgedFoundations.target).toContain('fairness');
    });

    it('should provide educational resources', async () => {
      const sourceProfile: MoralFoundationProfile = {
        liberty: 0.9,
        fairness: 0.5,
        care: 0.4,
        loyalty: 0.3,
        authority: 0.2,
        sanctity: 0.1,
      };

      const targetProfile: MoralFoundationProfile = {
        care: 0.9,
        fairness: 0.7,
        liberty: 0.5,
        loyalty: 0.3,
        authority: 0.2,
        sanctity: 0.1,
      };

      const input: TranslationInput = {
        originalArgument: 'Individual autonomy is the foundation of a free society.',
        sourceProfile,
        targetProfile,
      };

      const result = await translator.translate(input);

      expect(result.educationalResources).toBeDefined();
      expect(result.educationalResources!.length).toBeGreaterThan(0);
      expect(result.educationalResources![0]).toHaveProperty('title');
      expect(result.educationalResources![0]).toHaveProperty('url');
    });

    it('should handle profiles with multiple high-scoring foundations', async () => {
      const sourceProfile: MoralFoundationProfile = {
        fairness: 0.9,
        care: 0.8,
        liberty: 0.7,
        loyalty: 0.5,
        authority: 0.4,
        sanctity: 0.3,
      };

      const targetProfile: MoralFoundationProfile = {
        loyalty: 0.9,
        authority: 0.8,
        sanctity: 0.7,
        fairness: 0.5,
        care: 0.4,
        liberty: 0.3,
      };

      const input: TranslationInput = {
        originalArgument: 'Everyone deserves equal access to quality education.',
        sourceProfile,
        targetProfile,
      };

      const result = await translator.translate(input);

      expect(result.reframedArgument).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.bridgedFoundations.source.length).toBeGreaterThan(0);
      expect(result.bridgedFoundations.target.length).toBeGreaterThan(0);
    });

    it('should include context when provided', async () => {
      const sourceProfile: MoralFoundationProfile = {
        liberty: 0.9,
        fairness: 0.6,
        care: 0.4,
        loyalty: 0.3,
        authority: 0.2,
        sanctity: 0.1,
      };

      const targetProfile: MoralFoundationProfile = {
        care: 0.9,
        fairness: 0.7,
        liberty: 0.5,
        loyalty: 0.3,
        authority: 0.2,
        sanctity: 0.1,
      };

      const input: TranslationInput = {
        originalArgument: 'People should have the right to choose.',
        sourceProfile,
        targetProfile,
        context: {
          topicId: 'test-topic-123',
          propositionStatement: 'Healthcare should be a personal choice.',
        },
      };

      const result = await translator.translate(input);

      expect(result).toBeDefined();
      expect(result.reframedArgument).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should handle similar source and target profiles with reduced confidence', async () => {
      const similarProfile: MoralFoundationProfile = {
        fairness: 0.9,
        care: 0.8,
        liberty: 0.7,
        loyalty: 0.6,
        authority: 0.5,
        sanctity: 0.4,
      };

      const input: TranslationInput = {
        originalArgument: 'We should ensure equal treatment for everyone.',
        sourceProfile: similarProfile,
        targetProfile: similarProfile,
      };

      const result = await translator.translate(input);

      expect(result.reframedArgument).toBeDefined();
      // Confidence should be lower when profiles are very similar
      expect(result.confidenceScore).toBeLessThan(0.85);
    });

    it('should provide reasoning that explains the translation', async () => {
      const sourceProfile: MoralFoundationProfile = {
        liberty: 0.9,
        fairness: 0.5,
        care: 0.3,
        loyalty: 0.2,
        authority: 0.1,
        sanctity: 0.1,
      };

      const targetProfile: MoralFoundationProfile = {
        care: 0.9,
        fairness: 0.6,
        liberty: 0.4,
        loyalty: 0.3,
        authority: 0.2,
        sanctity: 0.1,
      };

      const input: TranslationInput = {
        originalArgument: 'Freedom is essential for human flourishing.',
        sourceProfile,
        targetProfile,
      };

      const result = await translator.translate(input);

      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning.toLowerCase()).toContain('foundation');
    });

    it('should handle short arguments', async () => {
      const sourceProfile: MoralFoundationProfile = {
        liberty: 0.9,
        fairness: 0.5,
        care: 0.3,
        loyalty: 0.2,
        authority: 0.1,
        sanctity: 0.1,
      };

      const targetProfile: MoralFoundationProfile = {
        care: 0.9,
        fairness: 0.6,
        liberty: 0.4,
        loyalty: 0.3,
        authority: 0.2,
        sanctity: 0.1,
      };

      const input: TranslationInput = {
        originalArgument: 'Choice matters.',
        sourceProfile,
        targetProfile,
      };

      const result = await translator.translate(input);

      expect(result.reframedArgument).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should handle arguments with multiple sentences', async () => {
      const sourceProfile: MoralFoundationProfile = {
        liberty: 0.9,
        fairness: 0.6,
        care: 0.3,
        loyalty: 0.2,
        authority: 0.1,
        sanctity: 0.1,
      };

      const targetProfile: MoralFoundationProfile = {
        care: 0.9,
        fairness: 0.7,
        liberty: 0.4,
        loyalty: 0.3,
        authority: 0.2,
        sanctity: 0.1,
      };

      const input: TranslationInput = {
        originalArgument:
          'I believe people should make their own decisions. Government interference limits individual freedom. Personal autonomy is a fundamental right.',
        sourceProfile,
        targetProfile,
      };

      const result = await translator.translate(input);

      expect(result.reframedArgument).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
    });
  });
});
