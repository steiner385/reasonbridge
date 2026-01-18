import React, { useMemo } from 'react';
import {
  Feedback,
  FeedbackType,
  ClarityMetrics,
  ClarityScoreDisplayProps,
  HelpfulRating,
} from '../../types/feedback';

/**
 * ClarityScoreDisplay - Visualizes clarity metrics and feedback for user responses
 *
 * Displays clarity-related feedback including sourcing issues, bias indicators, and vague language.
 * Computes and visualizes an overall clarity score based on feedback analysis.
 *
 * @component
 */
export const ClarityScoreDisplay: React.FC<ClarityScoreDisplayProps> = ({
  feedback,
  metrics,
  compact = false,
  onAcknowledge,
  onRateHelpful,
}) => {
  // Filter clarity-related feedback (UNSOURCED and BIAS types)
  const clarityFeedback = feedback.filter(
    (f) =>
      (f.type === FeedbackType.UNSOURCED || f.type === FeedbackType.BIAS) &&
      f.confidenceScore >= 0.80 && // FR-014c: Only display if ≥80% confidence
      f.displayedToUser
  );

  // Calculate clarity metrics from feedback if not provided
  const calculatedMetrics: ClarityMetrics = useMemo(() => {
    if (metrics) return metrics;

    // Count issues
    const unsourcedCount = clarityFeedback.filter((f) => f.type === FeedbackType.UNSOURCED).length;
    const biasCount = clarityFeedback.filter((f) => f.type === FeedbackType.BIAS).length;

    // Calculate scores (1.0 = perfect, decreases with issues)
    const sourcingScore = Math.max(0, 1.0 - unsourcedCount * 0.2);
    const neutralityScore = Math.max(0, 1.0 - biasCount * 0.15);
    const specificityScore = 0.85; // Placeholder: would be calculated from vague language detection

    return {
      sourcingScore,
      neutralityScore,
      specificityScore,
      overallClarityScore: (sourcingScore + neutralityScore + specificityScore) / 3,
      issuesDetected: {
        unsourcedClaims: unsourcedCount,
        biasIndicators: biasCount,
        vagueStatements: 0, // Placeholder
      },
    };
  }, [feedback, metrics]);

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-50 border-green-200';
    if (score >= 0.6) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 0.9) return 'Excellent';
    if (score >= 0.8) return 'Good';
    if (score >= 0.7) return 'Fair';
    if (score >= 0.6) return 'Needs Improvement';
    return 'Poor';
  };

  if (compact) {
    const score = calculatedMetrics.overallClarityScore;
    return (
      <div
        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border ${getScoreBgColor(score)}`}
        role="status"
        aria-label={`Clarity score: ${(score * 100).toFixed(0)}%`}
      >
        <svg
          className={`w-4 h-4 mr-1.5 ${getScoreColor(score)}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className={getScoreColor(score)}>
          Clarity: {(score * 100).toFixed(0)}%
        </span>
      </div>
    );
  }

  return (
    <div
      className="p-4 rounded-lg border bg-white shadow-sm"
      role="region"
      aria-label="Clarity analysis"
    >
      {/* Header with Overall Score */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Clarity Score</h3>
          <p className="text-xs text-gray-500 mt-0.5">AI-powered analysis</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${getScoreColor(calculatedMetrics.overallClarityScore)}`}>
            {(calculatedMetrics.overallClarityScore * 100).toFixed(0)}
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            {getScoreLabel(calculatedMetrics.overallClarityScore)}
          </div>
        </div>
      </div>

      {/* Metric Breakdown */}
      <div className="space-y-3 mb-4">
        {/* Sourcing Score */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Sourcing</span>
            <span className={`text-sm font-semibold ${getScoreColor(calculatedMetrics.sourcingScore)}`}>
              {(calculatedMetrics.sourcingScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                calculatedMetrics.sourcingScore >= 0.8
                  ? 'bg-green-500'
                  : calculatedMetrics.sourcingScore >= 0.6
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${calculatedMetrics.sourcingScore * 100}%` }}
              role="progressbar"
              aria-valuenow={calculatedMetrics.sourcingScore * 100}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {calculatedMetrics.issuesDetected.unsourcedClaims > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              {calculatedMetrics.issuesDetected.unsourcedClaims} unsourced{' '}
              {calculatedMetrics.issuesDetected.unsourcedClaims === 1 ? 'claim' : 'claims'} detected
            </p>
          )}
        </div>

        {/* Neutrality Score */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Neutrality</span>
            <span className={`text-sm font-semibold ${getScoreColor(calculatedMetrics.neutralityScore)}`}>
              {(calculatedMetrics.neutralityScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                calculatedMetrics.neutralityScore >= 0.8
                  ? 'bg-green-500'
                  : calculatedMetrics.neutralityScore >= 0.6
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${calculatedMetrics.neutralityScore * 100}%` }}
              role="progressbar"
              aria-valuenow={calculatedMetrics.neutralityScore * 100}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          {calculatedMetrics.issuesDetected.biasIndicators > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              {calculatedMetrics.issuesDetected.biasIndicators} bias{' '}
              {calculatedMetrics.issuesDetected.biasIndicators === 1 ? 'indicator' : 'indicators'} detected
            </p>
          )}
        </div>

        {/* Specificity Score */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Specificity</span>
            <span className={`text-sm font-semibold ${getScoreColor(calculatedMetrics.specificityScore)}`}>
              {(calculatedMetrics.specificityScore * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                calculatedMetrics.specificityScore >= 0.8
                  ? 'bg-green-500'
                  : calculatedMetrics.specificityScore >= 0.6
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${calculatedMetrics.specificityScore * 100}%` }}
              role="progressbar"
              aria-valuenow={calculatedMetrics.specificityScore * 100}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* Detailed Feedback Items */}
      {clarityFeedback.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Suggestions for Improvement</h4>
          <div className="space-y-2">
            {clarityFeedback.map((item) => (
              <FeedbackItem
                key={item.id}
                feedback={item}
                onAcknowledge={onAcknowledge}
                onRateHelpful={onRateHelpful}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Issues Message */}
      {clarityFeedback.length === 0 && (
        <div className="text-center py-2 px-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✓ No clarity issues detected. Your response is well-sourced and neutral!
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * FeedbackItem - Individual clarity feedback item with actions
 */
const FeedbackItem: React.FC<{
  feedback: Feedback;
  onAcknowledge?: (id: string) => void;
  onRateHelpful?: (id: string, rating: HelpfulRating) => void;
}> = ({ feedback, onAcknowledge, onRateHelpful }) => {
  const getFeedbackIcon = (type: FeedbackType): string => {
    if (type === FeedbackType.UNSOURCED) return '📎';
    if (type === FeedbackType.BIAS) return '⚖️';
    return 'ℹ️';
  };

  const getFeedbackLabel = (type: FeedbackType, subtype?: string): string => {
    if (type === FeedbackType.UNSOURCED) return 'Sourcing needed';
    if (type === FeedbackType.BIAS) {
      if (subtype === 'loaded_language') return 'Consider neutral language';
      return 'Bias detected';
    }
    return 'Feedback';
  };

  return (
    <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center">
          <span className="mr-2" aria-hidden="true">{getFeedbackIcon(feedback.type)}</span>
          <span className="font-medium text-gray-900">
            {getFeedbackLabel(feedback.type, feedback.subtype)}
          </span>
        </div>
        {!feedback.userAcknowledged && onAcknowledge && (
          <button
            onClick={() => onAcknowledge(feedback.id)}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
            aria-label="Acknowledge feedback"
          >
            Got it
          </button>
        )}
      </div>
      <p className="text-gray-700 text-xs mb-1">{feedback.suggestionText}</p>
      <p className="text-gray-500 text-xs">Confidence: {(feedback.confidenceScore * 100).toFixed(0)}%</p>
    </div>
  );
};

export default ClarityScoreDisplay;
