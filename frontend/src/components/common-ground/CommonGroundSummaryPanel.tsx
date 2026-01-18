import type { CommonGroundAnalysis } from '../../types/common-ground';
import ShareButton from './ShareButton';

export interface CommonGroundSummaryPanelProps {
  /**
   * The common ground analysis data to display
   */
  analysis: CommonGroundAnalysis;

  /**
   * Optional callback when user wants to view details of an agreement zone
   */
  onViewAgreementZone?: (zoneId: string) => void;

  /**
   * Optional callback when user wants to view details of a misunderstanding
   */
  onViewMisunderstanding?: (misunderstandingId: string) => void;

  /**
   * Optional callback when user wants to view details of a disagreement
   */
  onViewDisagreement?: (disagreementId: string) => void;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Whether to show the last updated timestamp
   */
  showLastUpdated?: boolean;

  /**
   * Whether to show empty state when sections are empty
   */
  showEmptyState?: boolean;
}

/**
 * Get consensus level styling
 */
const getConsensusStyles = (level: 'high' | 'medium' | 'low') => {
  const styles = {
    high: {
      bg: 'bg-green-50',
      border: 'border-green-500',
      text: 'text-green-800',
      badge: 'bg-green-100 text-green-800',
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-500',
      text: 'text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-800',
    },
    low: {
      bg: 'bg-orange-50',
      border: 'border-orange-500',
      text: 'text-orange-800',
      badge: 'bg-orange-100 text-orange-800',
    },
  };

  return styles[level];
};

/**
 * CommonGroundSummaryPanel - Displays a summary of common ground analysis
 *
 * This component shows:
 * - Overall consensus score
 * - Agreement zones with percentage agreement on propositions
 * - Misunderstandings where terms are used differently
 * - Genuine disagreements with underlying values/assumptions
 * - Last updated timestamp
 */
const CommonGroundSummaryPanel = ({
  analysis,
  onViewAgreementZone,
  onViewMisunderstanding,
  onViewDisagreement,
  className = '',
  showLastUpdated = true,
  showEmptyState = true,
}: CommonGroundSummaryPanelProps) => {
  const hasContent =
    analysis.agreementZones.length > 0 ||
    analysis.misunderstandings.length > 0 ||
    analysis.disagreements.length > 0;

  if (!hasContent && !showEmptyState) {
    return null;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Overall Consensus */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Common Ground Analysis
          </h2>
          <div className="flex items-center gap-3">
            {showLastUpdated && (
              <span className="text-xs text-gray-500">
                Last updated:{' '}
                {new Date(analysis.lastUpdated).toLocaleString()}
              </span>
            )}
            <ShareButton analysis={analysis} variant="outline" size="sm" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Overall Consensus
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {analysis.overallConsensusScore}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${analysis.overallConsensusScore}%` }}
                role="progressbar"
                aria-valuenow={analysis.overallConsensusScore}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {analysis.participantCount}
            </div>
            <div className="text-xs text-gray-500">Participants</div>
          </div>
        </div>
      </div>

      {/* Agreement Zones */}
      {analysis.agreementZones.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Agreement Zones ({analysis.agreementZones.length})
          </h3>
          <div className="space-y-3">
            {analysis.agreementZones.map((zone) => {
              const styles = getConsensusStyles(zone.consensusLevel);
              return (
                <div
                  key={zone.id}
                  className={`p-4 rounded-lg border-l-4 ${styles.bg} ${styles.border}`}
                  role="article"
                  aria-label={`Agreement zone: ${zone.title}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className={`font-medium ${styles.text}`}>
                        {zone.title}
                      </h4>
                      <p className="text-sm text-gray-700 mt-1">
                        {zone.description}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${styles.badge} ml-2`}>
                      {zone.consensusLevel.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {zone.propositions.map((prop) => (
                      <div key={prop.id} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-800">{prop.text}</span>
                          <span className="font-medium text-gray-900 ml-2">
                            {prop.agreementPercentage}% agree
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${prop.agreementPercentage}%` }}
                            role="progressbar"
                            aria-valuenow={prop.agreementPercentage}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {onViewAgreementZone && (
                    <button
                      type="button"
                      onClick={() => onViewAgreementZone(zone.id)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View Details →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Misunderstandings */}
      {analysis.misunderstandings.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Identified Misunderstandings ({analysis.misunderstandings.length})
          </h3>
          <div className="space-y-3">
            {analysis.misunderstandings.map((misunderstanding) => (
              <div
                key={misunderstanding.id}
                className="p-4 rounded-lg border-l-4 bg-purple-50 border-purple-500"
                role="article"
                aria-label={`Misunderstanding about term: ${misunderstanding.term}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-purple-100 text-purple-800">
                      TERM CONFUSION
                    </span>
                    <h4 className="font-medium text-purple-900 mt-2">
                      "{misunderstanding.term}"
                    </h4>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">
                    Different definitions being used:
                  </p>
                  {misunderstanding.definitions.map((def, idx) => (
                    <div key={idx} className="text-sm bg-white rounded p-2">
                      <p className="text-gray-800 mb-1">{def.definition}</p>
                      <p className="text-xs text-gray-500">
                        Used by {def.participants.length} participant(s)
                      </p>
                    </div>
                  ))}
                </div>

                {misunderstanding.clarificationSuggestion && (
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Suggestion:</span>{' '}
                      {misunderstanding.clarificationSuggestion}
                    </p>
                  </div>
                )}

                {onViewMisunderstanding && (
                  <button
                    type="button"
                    onClick={() => onViewMisunderstanding(misunderstanding.id)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Details →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Genuine Disagreements */}
      {analysis.disagreements.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Genuine Disagreements ({analysis.disagreements.length})
          </h3>
          <div className="space-y-3">
            {analysis.disagreements.map((disagreement) => (
              <div
                key={disagreement.id}
                className="p-4 rounded-lg border-l-4 bg-blue-50 border-blue-500"
                role="article"
                aria-label={`Disagreement about: ${disagreement.topic}`}
              >
                <div className="mb-2">
                  <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800">
                    VALUE DIFFERENCE
                  </span>
                  <h4 className="font-medium text-blue-900 mt-2">
                    {disagreement.topic}
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    {disagreement.description}
                  </p>
                </div>

                <div className="mt-3 space-y-2">
                  <p className="text-sm text-gray-700 font-medium">
                    Different positions:
                  </p>
                  {disagreement.positions.map((position, idx) => (
                    <div key={idx} className="text-sm bg-white rounded p-3">
                      <p className="font-medium text-gray-800 mb-1">
                        {position.stance}
                      </p>
                      <p className="text-gray-700 mb-2">{position.reasoning}</p>
                      {(position.underlyingValue || position.underlyingAssumption) && (
                        <div className="text-xs text-gray-600 space-y-1">
                          {position.underlyingValue && (
                            <p>
                              <span className="font-medium">Core value:</span>{' '}
                              {position.underlyingValue}
                            </p>
                          )}
                          {position.underlyingAssumption && (
                            <p>
                              <span className="font-medium">Assumption:</span>{' '}
                              {position.underlyingAssumption}
                            </p>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {position.participants.length} participant(s)
                      </p>
                    </div>
                  ))}
                </div>

                {disagreement.moralFoundations && disagreement.moralFoundations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Moral foundations:</span>{' '}
                      {disagreement.moralFoundations.join(', ')}
                    </p>
                  </div>
                )}

                {onViewDisagreement && (
                  <button
                    type="button"
                    onClick={() => onViewDisagreement(disagreement.id)}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Details →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasContent && showEmptyState && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-3">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No Analysis Available
          </h3>
          <p className="text-sm text-gray-500">
            Common ground analysis will appear here once the discussion has enough
            participants and content to analyze.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommonGroundSummaryPanel;
