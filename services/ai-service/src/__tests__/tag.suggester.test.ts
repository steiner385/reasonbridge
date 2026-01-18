import { TagSuggester } from '../synthesizers/tag.suggester.js';

describe('TagSuggester', () => {
  let suggester: TagSuggester;

  beforeEach(() => {
    suggester = new TagSuggester();
  });

  it('should be defined', () => {
    expect(suggester).toBeDefined();
  });

  describe('suggest', () => {
    it('should detect political category from keywords', async () => {
      const title = 'Government Policy';
      const content = 'Discussion about legislation and democracy in congress.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('politics');
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.reasoning).toContain('categor');
    });

    it('should detect science category from keywords', async () => {
      const title = 'Research Study';
      const content = 'Scientific experiment testing a new hypothesis with data analysis.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('science');
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should detect technology category from keywords', async () => {
      const title = 'Software Development';
      const content = 'Programming algorithms for digital computer systems.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('technology');
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should detect economics category from keywords', async () => {
      const title = 'Market Analysis';
      const content = 'Financial investment in the economy and trade markets.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('economics');
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should detect health category from keywords', async () => {
      const title = 'Medical Treatment';
      const content = 'Healthcare for disease treatment and clinical patient medicine.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('health');
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should detect environment category from keywords', async () => {
      const title = 'Climate Action';
      const content = 'Environmental conservation and sustainability for ecosystem protection.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('environment');
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should detect education category from keywords', async () => {
      const title = 'Learning Methods';
      const content = 'Teaching curriculum for students at university academic programs.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('education');
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should detect social category from keywords', async () => {
      const title = 'Community Building';
      const content = 'Social culture and demographic changes in society population.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('social');
      expect(result.confidenceScore).toBeGreaterThan(0);
    });

    it('should extract keywords from content', async () => {
      const title = 'Complex Discussion';
      const content =
        'This is about blockchain technology blockchain cryptocurrency blockchain digital blockchain';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('blockchain');
      expect(result.suggestions).toContain('technology');
    });

    it('should filter out stop words', async () => {
      const title = 'The Quick Brown Fox';
      const content = 'The quick brown fox jumps over the lazy dog.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).not.toContain('the');
      expect(result.suggestions).not.toContain('over');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should limit suggestions to maximum of 5', async () => {
      const title = 'Comprehensive Topic';
      const content = `
        This covers politics government, scientific research experiments,
        technology software programming, economic financial markets,
        healthcare medical treatment, environmental climate conservation,
        educational university learning, social community culture.
        Additional keywords: blockchain cryptocurrency artificial intelligence
      `;

      const result = await suggester.suggest(title, content);

      expect(result.suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should return fallback "general" tag for empty content', async () => {
      const title = '';
      const content = '';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('general');
      expect(result.confidenceScore).toBe(0.5);
      expect(result.reasoning).toContain('Unable to detect');
    });

    it('should handle content with minimal keywords', async () => {
      const title = 'Test';
      const content = 'A simple test.';

      const result = await suggester.suggest(title, content);

      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('confidenceScore');
      expect(result).toHaveProperty('reasoning');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should detect multiple categories', async () => {
      const title = 'Science and Technology Policy';
      const content = 'Government policy on scientific research and software development.';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions.length).toBeGreaterThan(1);
      expect(result.suggestions).toEqual(
        expect.arrayContaining(['politics', 'science', 'technology']),
      );
    });

    it('should calculate higher confidence for longer content', async () => {
      const shortContent = 'Technology software.';
      const longContent = `
        This is a comprehensive discussion about technology and software development.
        We explore various programming paradigms and digital solutions.
        Computer systems and algorithms are central to this analysis.
        The internet and code quality are also discussed in detail.
        Hardware considerations and software architecture matter greatly.
      `;

      const shortResult = await suggester.suggest('Tech', shortContent);
      const longResult = await suggester.suggest('Tech', longContent);

      expect(longResult.confidenceScore).toBeGreaterThan(shortResult.confidenceScore);
    });

    it('should calculate higher confidence for more suggestions', async () => {
      const fewKeywords = 'Technology.';
      const manyKeywords = `
        Politics government science research technology software
        economics market health medical environment climate
      `;

      const fewResult = await suggester.suggest('Few', fewKeywords);
      const manyResult = await suggester.suggest('Many', manyKeywords);

      expect(manyResult.confidenceScore).toBeGreaterThan(fewResult.confidenceScore);
    });

    it('should cap confidence score at 0.85', async () => {
      const title = 'Very Comprehensive Topic';
      const content = `
        ${'politics government science research technology software '.repeat(50)}
      `;

      const result = await suggester.suggest(title, content);

      expect(result.confidenceScore).toBeLessThanOrEqual(0.85);
    });

    it('should handle special characters in content', async () => {
      const title = 'Tech@2024!';
      const content = 'Software #programming $code% &technology*';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('technology');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', async () => {
      const title = 'TECHNOLOGY';
      const content = 'SOFTWARE PROGRAMMING CODE';

      const result = await suggester.suggest(title, content);

      expect(result.suggestions).toContain('technology');
    });

    it('should extract most frequent keywords', async () => {
      const title = 'Topic';
      const content = `
        blockchain blockchain blockchain
        cryptocurrency cryptocurrency
        artificial
      `;

      const result = await suggester.suggest(title, content);

      const blockchainIndex = result.suggestions.indexOf('blockchain');
      const cryptoIndex = result.suggestions.indexOf('cryptocurrency');

      if (blockchainIndex !== -1 && cryptoIndex !== -1) {
        expect(blockchainIndex).toBeLessThan(cryptoIndex);
      }
    });
  });
});
