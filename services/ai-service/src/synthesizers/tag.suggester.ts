import { Injectable } from '@nestjs/common';
import type { SuggestionResult } from '../services/suggestions.service.js';

/**
 * Tag suggestion synthesizer
 * Generates relevant tag suggestions for topics using AI analysis
 */
@Injectable()
export class TagSuggester {
  // Common topic categories for fallback suggestions
  private readonly categoryKeywords = {
    politics: [
      'government',
      'policy',
      'election',
      'political',
      'democracy',
      'legislation',
      'congress',
      'parliament',
    ],
    science: [
      'research',
      'study',
      'scientific',
      'experiment',
      'hypothesis',
      'theory',
      'data',
      'evidence',
    ],
    technology: [
      'software',
      'hardware',
      'computer',
      'digital',
      'internet',
      'code',
      'programming',
      'algorithm',
    ],
    economics: [
      'market',
      'economy',
      'financial',
      'trade',
      'business',
      'investment',
      'fiscal',
      'monetary',
    ],
    health: [
      'medical',
      'healthcare',
      'treatment',
      'disease',
      'health',
      'medicine',
      'clinical',
      'patient',
    ],
    environment: [
      'climate',
      'environmental',
      'nature',
      'pollution',
      'sustainability',
      'ecosystem',
      'conservation',
    ],
    education: [
      'school',
      'learning',
      'teaching',
      'education',
      'student',
      'university',
      'academic',
      'curriculum',
    ],
    social: ['community', 'society', 'culture', 'social', 'demographic', 'population', 'public'],
  };

  /**
   * Generate tag suggestions based on content analysis
   * @param title Topic title
   * @param content Topic content/description
   * @returns Tag suggestions with confidence score
   */
  async suggest(title: string, content: string): Promise<SuggestionResult> {
    const combinedText = `${title} ${content}`.toLowerCase();

    // Detect categories based on keyword matching
    const detectedCategories = this.detectCategories(combinedText);

    // Extract potential tags from content
    const extractedTags = this.extractKeywords(combinedText);

    // Combine detected categories and extracted keywords
    const allSuggestions = [...detectedCategories, ...extractedTags];
    const uniqueSuggestions = [...new Set(allSuggestions)].slice(0, 5);

    // Calculate confidence based on detection strength
    const confidenceScore = this.calculateConfidence(uniqueSuggestions.length, combinedText);

    return {
      suggestions: uniqueSuggestions.length > 0 ? uniqueSuggestions : ['general'],
      confidenceScore,
      reasoning: this.createReasoning(detectedCategories.length, extractedTags.length),
    };
  }

  /**
   * Detect topic categories based on keyword matching
   */
  private detectCategories(text: string): string[] {
    const detected: string[] = [];

    for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
      const matchCount = keywords.filter((keyword) => text.includes(keyword)).length;
      if (matchCount >= 1) {
        detected.push(category);
      }
    }

    return detected;
  }

  /**
   * Extract keywords from content (simple noun extraction)
   */
  private extractKeywords(text: string): string[] {
    const words = text.split(/\s+/);

    // Common stop words to filter out
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'can',
      'this',
      'that',
      'these',
      'those',
      'i',
      'you',
      'he',
      'she',
      'it',
      'we',
      'they',
      'what',
      'which',
      'who',
      'when',
      'where',
      'why',
      'how',
      'about',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'between',
      'under',
      'again',
      'further',
      'then',
      'once',
      'here',
      'there',
      'all',
      'both',
      'each',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'nor',
      'not',
      'only',
      'own',
      'same',
      'so',
      'than',
      'too',
      'very',
      'just',
    ]);

    // Extract meaningful words (longer than 4 characters, not stop words)
    const keywords = words
      .map((word) => word.replace(/[^a-z]/g, ''))
      .filter((word) => word.length > 4 && !stopWords.has(word))
      .reduce((acc, word) => {
        acc.set(word, (acc.get(word) || 0) + 1);
        return acc;
      }, new Map<string, number>());

    // Return top 3 most frequent keywords
    return Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  /**
   * Calculate confidence score based on suggestion quality
   */
  private calculateConfidence(suggestionCount: number, text: string): number {
    if (suggestionCount === 0) {
      return 0.5; // Low confidence for no suggestions
    }

    // Base confidence on suggestion count and text length
    const baseConfidence = 0.65;
    const countBonus = Math.min(0.15, suggestionCount * 0.03);
    const lengthBonus = text.length > 100 ? 0.05 : 0;

    return Math.min(0.85, baseConfidence + countBonus + lengthBonus);
  }

  /**
   * Create reasoning explanation
   */
  private createReasoning(categoryCount: number, keywordCount: number): string {
    if (categoryCount === 0 && keywordCount === 0) {
      return 'Unable to detect specific categories or keywords. Using fallback suggestions. AI-powered analysis pending.';
    }

    const parts: string[] = [];
    if (categoryCount > 0) {
      parts.push(`${categoryCount} topic categor${categoryCount === 1 ? 'y' : 'ies'}`);
    }
    if (keywordCount > 0) {
      parts.push(`${keywordCount} relevant keyword${keywordCount === 1 ? '' : 's'}`);
    }

    return `Detected ${parts.join(' and ')} from content analysis. This is a pattern-based implementation; AI-powered semantic analysis will enhance accuracy.`;
  }
}
