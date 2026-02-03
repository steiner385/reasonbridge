import { Injectable } from '@nestjs/common';
import { FeedbackType } from '@prisma/client';
import { ToneAnalyzerService } from './tone-analyzer.service.js';
import { FallacyDetectorService } from './fallacy-detector.service.js';
import { ClarityAnalyzerService } from './clarity-analyzer.service.js';

/**
 * Analysis result from individual analyzers
 */
export interface AnalysisResult {
  type: FeedbackType;
  subtype?: string;
  suggestionText: string;
  reasoning: string;
  confidenceScore: number;
  educationalResources?: any;
}

/**
 * Orchestrator service for comprehensive response analysis
 * Coordinates tone, fallacy, and clarity analysis to provide feedback
 */
@Injectable()
export class ResponseAnalyzerService {
  constructor(
    private readonly toneAnalyzer: ToneAnalyzerService,
    private readonly fallacyDetector: FallacyDetectorService,
    private readonly clarityAnalyzer: ClarityAnalyzerService,
  ) {}

  /**
   * Analyze content for feedback across multiple dimensions
   * Returns the highest-confidence feedback item
   * @param content The response content to analyze
   * @returns Comprehensive analysis result
   */
  async analyzeContent(content: string): Promise<AnalysisResult> {
    // Run all analyzers in parallel for performance (<500ms requirement)
    const [toneResult, fallacyResult, clarityResult] = await Promise.all([
      this.toneAnalyzer.analyze(content),
      this.fallacyDetector.analyze(content),
      this.clarityAnalyzer.analyze(content),
    ]);

    // Collect all results that were detected
    const results: AnalysisResult[] = [];
    if (toneResult) results.push(toneResult);
    if (fallacyResult) results.push(fallacyResult);
    if (clarityResult) results.push(clarityResult);

    // If no issues detected, return affirmation
    if (results.length === 0) {
      return this.createAffirmation();
    }

    // Return the highest-confidence result
    // Priority order: FALLACY > INFLAMMATORY > UNSOURCED > BIAS (clarity)
    // If confidence scores are equal, fallacies take priority
    return this.selectBestFeedback(results);
  }

  /**
   * Analyze content and return ALL feedback items (not just highest confidence)
   * Used for preview feedback where users see all detected issues
   * @param content The response content to analyze
   * @returns Array of all analysis results
   */
  async analyzeContentFull(content: string): Promise<AnalysisResult[]> {
    // Run all analyzers in parallel for performance (<500ms requirement)
    const [toneResult, fallacyResult, clarityResult] = await Promise.all([
      this.toneAnalyzer.analyze(content),
      this.fallacyDetector.analyze(content),
      this.clarityAnalyzer.analyze(content),
    ]);

    // Collect all results that were detected
    const results: AnalysisResult[] = [];
    if (toneResult) results.push(toneResult);
    if (fallacyResult) results.push(fallacyResult);
    if (clarityResult) results.push(clarityResult);

    // If no issues detected, return affirmation
    if (results.length === 0) {
      return [this.createAffirmation()];
    }

    // Sort by confidence score descending
    return results.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Select the best feedback to display based on confidence and priority
   * @param results Array of analysis results
   * @returns The most relevant feedback
   */
  private selectBestFeedback(results: AnalysisResult[]): AnalysisResult {
    // Sort by confidence score (descending), then by type priority
    const typePriority = {
      [FeedbackType.FALLACY]: 4,
      [FeedbackType.INFLAMMATORY]: 3,
      [FeedbackType.UNSOURCED]: 2,
      [FeedbackType.BIAS]: 1,
      [FeedbackType.AFFIRMATION]: 0,
    };

    const sorted = results.sort((a, b) => {
      // First compare confidence scores
      if (b.confidenceScore !== a.confidenceScore) {
        return b.confidenceScore - a.confidenceScore;
      }
      // If equal confidence, use type priority
      return typePriority[b.type] - typePriority[a.type];
    });

    // TypeScript requires explicit undefined check
    const bestResult = sorted[0];
    if (!bestResult) {
      // This should never happen since we only call this with non-empty arrays
      return this.createAffirmation();
    }
    return bestResult;
  }

  /**
   * Create a positive affirmation when no issues are detected
   * @returns Affirmation feedback
   */
  private createAffirmation(): AnalysisResult {
    return {
      type: FeedbackType.AFFIRMATION,
      suggestionText: 'Your response contributes to constructive dialogue.',
      reasoning:
        'No logical fallacies, inflammatory language, or clarity issues detected. Your contribution appears well-reasoned and respectful.',
      confidenceScore: 0.85,
    };
  }
}
