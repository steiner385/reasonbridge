/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import type { FallacySeverity, FallacyWarningsProps } from '../../types/feedback';

/**
 * Get human-readable name for a fallacy subtype
 */
const getFallacyName = (subtype?: string): string => {
  const names: Record<string, string> = {
    ad_hominem: 'Ad Hominem',
    straw_man: 'Straw Man',
    false_dichotomy: 'False Dichotomy',
    appeal_to_authority: 'Appeal to Authority',
    slippery_slope: 'Slippery Slope',
    circular_reasoning: 'Circular Reasoning',
    hasty_generalization: 'Hasty Generalization',
    red_herring: 'Red Herring',
    tu_quoque: 'Tu Quoque',
    appeal_to_emotion: 'Appeal to Emotion',
  };
  return subtype ? names[subtype] || 'Logical Fallacy' : 'Logical Fallacy';
};

/**
 * Get a brief description of the fallacy type
 */
const getFallacyDescription = (subtype?: string): string => {
  const descriptions: Record<string, string> = {
    ad_hominem: 'Attacking the person making the argument rather than the argument itself.',
    straw_man: "Misrepresenting someone's argument to make it easier to attack.",
    false_dichotomy: 'Presenting only two options when more exist.',
    appeal_to_authority:
      "Using an authority figure's opinion as evidence without proper justification.",
    slippery_slope: 'Assuming one event will lead to extreme consequences without evidence.',
    circular_reasoning: 'Using the conclusion as a premise in the argument.',
    hasty_generalization: 'Drawing broad conclusions from limited examples.',
    red_herring: 'Introducing an irrelevant topic to divert attention from the original issue.',
    tu_quoque: "Deflecting criticism by pointing to the accuser's similar behavior.",
    appeal_to_emotion: 'Using emotional manipulation instead of logical reasoning.',
  };
  return subtype
    ? descriptions[subtype] || 'A flaw in reasoning that undermines the logic of an argument.'
    : 'A flaw in reasoning that undermines the logic of an argument.';
};

/**
 * Get severity level based on confidence score
 */
const getSeverity = (confidenceScore: number): FallacySeverity => {
  if (confidenceScore >= 0.95) return 'high';
  if (confidenceScore >= 0.85) return 'medium';
  return 'low';
};

/**
 * Get styling classes based on severity
 */
const getSeverityStyles = (severity: FallacySeverity) => {
  const styles = {
    high: {
      container: 'bg-red-50 border-red-400',
      badge: 'bg-red-100 text-red-800 border-red-300',
      icon: 'text-red-600',
    },
    medium: {
      container: 'bg-amber-50 border-amber-400',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: 'text-amber-600',
    },
    low: {
      container: 'bg-yellow-50 border-yellow-400',
      badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: 'text-yellow-600',
    },
  };
  return styles[severity];
};

/**
 * Get icon for severity level
 */
const getSeverityIcon = (severity: FallacySeverity): React.ReactNode => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {severity === 'high' ? (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    )}
  </svg>
);

/**
 * FallacyWarnings - Displays warnings about detected logical fallacies
 *
 * This component visualizes AI-detected logical fallacies in user responses,
 * providing educational feedback in a collaborative, "curious peer" voice.
 * Implements FR-010, FR-014, and FR-026 from the specification.
 */
const FallacyWarnings: React.FC<FallacyWarningsProps> = ({
  feedback,
  onAcknowledge,
  onDismiss,
  compact = false,
  className = '',
  minConfidence = 0.8,
  showEducationalResources = true,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filter for FALLACY type feedback with sufficient confidence
  const fallacyFeedback = useMemo(() => {
    return feedback.filter(
      (f) => f.type === 'FALLACY' && f.confidenceScore >= minConfidence && f.displayedToUser,
    );
  }, [feedback, minConfidence]);

  // Early return if no fallacy feedback
  if (fallacyFeedback.length === 0) {
    return null;
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Compact mode - show summary badges
  if (compact) {
    return (
      <div
        className={`flex flex-wrap gap-2 ${className}`}
        role="list"
        aria-label="Fallacy warnings"
      >
        {fallacyFeedback.map((item) => {
          const severity = getSeverity(item.confidenceScore);
          const styles = getSeverityStyles(severity);
          return (
            <div
              key={item.id}
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${styles.badge} cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => toggleExpanded(item.id)}
              role="listitem"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && toggleExpanded(item.id)}
              aria-label={`${getFallacyName(item.subtype)} fallacy warning`}
            >
              <span className={`mr-1 ${styles.icon}`}>{getSeverityIcon(severity)}</span>
              <span>{getFallacyName(item.subtype)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Full mode - show detailed cards
  return (
    <div className={className} role="region" aria-label="Logical fallacy warnings">
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-5 h-5 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h3 className="text-sm font-semibold text-gray-800">
          Potential Logical {fallacyFeedback.length === 1 ? 'Fallacy' : 'Fallacies'} Detected
        </h3>
        <span className="text-xs text-gray-500">AI-powered analysis</span>
      </div>

      <div className="space-y-3">
        {fallacyFeedback.map((item) => {
          const severity = getSeverity(item.confidenceScore);
          const styles = getSeverityStyles(severity);
          const isExpanded = expandedIds.has(item.id);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-lg border-l-4 ${styles.container}`}
              role="article"
              aria-label={`${getFallacyName(item.subtype)} fallacy warning`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={styles.icon}>{getSeverityIcon(severity)}</span>
                  <div>
                    <span
                      className={`text-sm font-semibold px-2 py-0.5 rounded border ${styles.badge}`}
                    >
                      {getFallacyName(item.subtype)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {Math.round(item.confidenceScore * 100)}% confident
                  </span>
                  {onDismiss && (
                    <button
                      type="button"
                      onClick={() => onDismiss(item.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                      aria-label="Dismiss warning"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Suggestion Text - "Curious peer" voice */}
              <p className="text-sm text-gray-800 mb-2">{item.suggestionText}</p>

              {/* Expandable Section */}
              <button
                onClick={() => toggleExpanded(item.id)}
                className="text-xs font-medium text-gray-600 underline hover:no-underline cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-400 rounded"
                aria-expanded={isExpanded}
                aria-controls={`fallacy-details-${item.id}`}
              >
                {isExpanded ? 'Hide details' : 'Learn more'}
              </button>

              {isExpanded && (
                <div
                  id={`fallacy-details-${item.id}`}
                  className="mt-3 pt-3 border-t border-gray-200"
                >
                  {/* What is this fallacy? */}
                  <div className="mb-3">
                    <h4 className="text-xs font-semibold text-gray-700 mb-1">
                      What is {getFallacyName(item.subtype)}?
                    </h4>
                    <p className="text-xs text-gray-600">{getFallacyDescription(item.subtype)}</p>
                  </div>

                  {/* AI Reasoning */}
                  {item.reasoning && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">
                        Why this was flagged
                      </h4>
                      <p className="text-xs text-gray-600 italic">{item.reasoning}</p>
                    </div>
                  )}

                  {/* Educational Resources */}
                  {showEducationalResources && item.educationalResources && (
                    <div className="mb-3">
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">
                        Educational Resources
                      </h4>
                      <div className="text-xs text-gray-600">
                        {Object.entries(item.educationalResources).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="font-medium">{key}:</span>{' '}
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Acknowledge Button */}
                  {onAcknowledge && (
                    <button
                      onClick={() => onAcknowledge(item.id)}
                      className="text-xs px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors font-medium text-gray-700"
                      aria-label="Acknowledge this feedback"
                    >
                      I understand
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FallacyWarnings;
