import React, { useState } from 'react';
import {
  FeedbackType,
  HelpfulRating,
  ToneIndicatorProps,
  ToneSubtype,
} from '../../types/feedback';

/**
 * ToneIndicator - Visualizes tone-related feedback for user responses
 *
 * Displays AI-generated feedback about tone, inflammatory language, and communication style.
 * Implements FR-010, FR-014, and FR-026 from the specification:
 * - "Curious peer" voice (collaborative, not corrective)
 * - Non-blocking suggestions with user acknowledgment
 * - Transparency (AI-labeled with reasoning)
 * - Educational resources
 *
 * @component
 */
export const ToneIndicator: React.FC<ToneIndicatorProps> = ({
  feedback,
  onAcknowledge,
  onRateHelpful,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);

  // Only display if confidence >= 0.80 (FR-014c)
  if (feedback.confidenceScore < 0.80) {
    return null;
  }

  const getToneColor = (type: FeedbackType, subtype?: string): string => {
    if (type === FeedbackType.AFFIRMATION) {
      return 'bg-green-50 border-green-200 text-green-900';
    }
    if (type === FeedbackType.INFLAMMATORY) {
      switch (subtype) {
        case ToneSubtype.HOSTILE_TONE:
        case ToneSubtype.PERSONAL_ATTACK:
          return 'bg-red-50 border-red-200 text-red-900';
        case ToneSubtype.DISMISSIVE:
        case ToneSubtype.SARCASTIC:
          return 'bg-orange-50 border-orange-200 text-orange-900';
        default:
          return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      }
    }
    return 'bg-blue-50 border-blue-200 text-blue-900';
  };

  const getToneIcon = (type: FeedbackType, subtype?: string): string => {
    if (type === FeedbackType.AFFIRMATION) {
      return '✓'; // Positive affirmation
    }
    if (type === FeedbackType.INFLAMMATORY) {
      switch (subtype) {
        case ToneSubtype.HOSTILE_TONE:
          return '⚠️';
        case ToneSubtype.PERSONAL_ATTACK:
          return '🛑';
        case ToneSubtype.DISMISSIVE:
          return '↓';
        case ToneSubtype.SARCASTIC:
          return '~';
        default:
          return '!';
      }
    }
    return 'i';
  };

  const getFriendlyLabel = (type: FeedbackType, subtype?: string): string => {
    if (type === FeedbackType.AFFIRMATION) {
      return 'Quality contribution';
    }
    if (type === FeedbackType.INFLAMMATORY) {
      switch (subtype) {
        case ToneSubtype.HOSTILE_TONE:
          return 'Tone suggestion';
        case ToneSubtype.PERSONAL_ATTACK:
          return 'Consider rephrasing';
        case ToneSubtype.DISMISSIVE:
          return 'Consider openness';
        case ToneSubtype.SARCASTIC:
          return 'Clarity suggestion';
        default:
          return 'Communication tip';
      }
    }
    return 'AI feedback';
  };

  const colorClass = getToneColor(feedback.type, feedback.subtype);
  const icon = getToneIcon(feedback.type, feedback.subtype);
  const label = getFriendlyLabel(feedback.type, feedback.subtype);

  const handleAcknowledge = () => {
    if (onAcknowledge && !feedback.userAcknowledged) {
      onAcknowledge(feedback.id);
    }
  };

  const handleRating = (rating: HelpfulRating) => {
    if (onRateHelpful) {
      onRateHelpful(feedback.id, rating);
    }
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClass} cursor-pointer`}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => e.key === 'Enter' && setExpanded(!expanded)}
        aria-label={`${label}: ${feedback.suggestionText}`}
      >
        <span className="mr-1">{icon}</span>
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-lg border ${colorClass} mb-3`}
      role="article"
      aria-label="AI feedback"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <span className="text-lg mr-2" aria-hidden="true">{icon}</span>
          <div>
            <h4 className="font-semibold text-sm">{label}</h4>
            <p className="text-xs opacity-70">AI Assistant</p>
          </div>
        </div>
        {!feedback.userAcknowledged && onAcknowledge && (
          <button
            onClick={handleAcknowledge}
            className="text-xs px-2 py-1 rounded border border-current hover:bg-white/20 transition-colors"
            aria-label="Acknowledge feedback"
          >
            Acknowledge
          </button>
        )}
      </div>

      {/* Suggestion Text - "Curious peer" voice */}
      <div className="mb-3">
        <p className="text-sm">{feedback.suggestionText}</p>
      </div>

      {/* Expandable Reasoning Section */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-medium underline hover:no-underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-current rounded"
          aria-expanded={expanded}
          aria-controls={`reasoning-${feedback.id}`}
        >
          {expanded ? 'Hide reasoning' : 'Show reasoning'}
        </button>

        {expanded && (
          <div
            id={`reasoning-${feedback.id}`}
            className="mt-2 pt-2 border-t border-current/20"
          >
            <p className="text-xs mb-2 opacity-80">{feedback.reasoning}</p>

            {/* Educational Resources */}
            {feedback.educationalResources && (
              <div className="mt-2 text-xs">
                <p className="font-medium mb-1">Learn more:</p>
                <a
                  href="#"
                  className="underline hover:no-underline"
                  aria-label="Educational resources"
                >
                  Communication guidelines
                </a>
              </div>
            )}

            {/* Confidence Score */}
            <p className="text-xs mt-2 opacity-60">
              Confidence: {(feedback.confidenceScore * 100).toFixed(0)}%
            </p>
          </div>
        )}
      </div>

      {/* Helpfulness Rating */}
      {onRateHelpful && feedback.userAcknowledged && (
        <div className="mt-3 pt-3 border-t border-current/20 flex items-center gap-2">
          <span className="text-xs opacity-70">Was this helpful?</span>
          <button
            onClick={() => handleRating(HelpfulRating.HELPFUL)}
            className={`text-xs px-2 py-1 rounded border ${
              feedback.userHelpfulRating === HelpfulRating.HELPFUL
                ? 'bg-white/30 font-medium'
                : 'border-current/30 hover:bg-white/20'
            }`}
            aria-label="Mark as helpful"
          >
            Yes
          </button>
          <button
            onClick={() => handleRating(HelpfulRating.NOT_HELPFUL)}
            className={`text-xs px-2 py-1 rounded border ${
              feedback.userHelpfulRating === HelpfulRating.NOT_HELPFUL
                ? 'bg-white/30 font-medium'
                : 'border-current/30 hover:bg-white/20'
            }`}
            aria-label="Mark as not helpful"
          >
            No
          </button>
        </div>
      )}
    </div>
  );
};

export default ToneIndicator;
