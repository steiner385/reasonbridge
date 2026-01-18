import type { PropositionClusteringResult, Proposition } from '../../types/common-ground';

export interface PropositionClusterViewProps {
  /**
   * The clustering result data to display
   */
  clusteringResult: PropositionClusteringResult;

  /**
   * Map of proposition IDs to full proposition objects
   * Used to display proposition details within clusters
   */
  propositions: Map<string, Proposition>;

  /**
   * Optional callback when user clicks on a cluster
   */
  onClusterClick?: (clusterId: string) => void;

  /**
   * Optional callback when user clicks on a proposition
   */
  onPropositionClick?: (propositionId: string) => void;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Whether to show unclustered propositions section
   */
  showUnclustered?: boolean;

  /**
   * Whether to show clustering quality metrics
   */
  showMetrics?: boolean;

  /**
   * Whether to show proposition details in clusters
   */
  showPropositionDetails?: boolean;

  /**
   * Maximum number of propositions to show per cluster (0 = show all)
   */
  maxPropositionsPerCluster?: number;
}

/**
 * Get cohesion level styling based on score
 */
const getCohesionStyles = (score: number) => {
  if (score >= 0.8) {
    return {
      badge: 'bg-green-100 text-green-800',
      text: 'Strong',
      border: 'border-green-500',
      bg: 'bg-green-50',
    };
  }
  if (score >= 0.6) {
    return {
      badge: 'bg-blue-100 text-blue-800',
      text: 'Moderate',
      border: 'border-blue-500',
      bg: 'bg-blue-50',
    };
  }
  return {
    badge: 'bg-yellow-100 text-yellow-800',
    text: 'Loose',
    border: 'border-yellow-500',
    bg: 'bg-yellow-50',
  };
};

/**
 * Get quality level styling
 */
const getQualityStyles = (score: number) => {
  if (score >= 0.7) return { color: 'text-green-700', bg: 'bg-green-100' };
  if (score >= 0.5) return { color: 'text-blue-700', bg: 'bg-blue-100' };
  return { color: 'text-yellow-700', bg: 'bg-yellow-100' };
};

/**
 * PropositionClusterView - Displays clustered propositions
 *
 * This component visualizes how propositions are grouped into thematic clusters,
 * helping users understand the discussion structure and identify related ideas.
 */
const PropositionClusterView = ({
  clusteringResult,
  propositions,
  onClusterClick,
  onPropositionClick,
  className = '',
  showUnclustered = true,
  showMetrics = true,
  showPropositionDetails = true,
  maxPropositionsPerCluster = 0,
}: PropositionClusterViewProps) => {
  const hasClusters = clusteringResult.clusters.length > 0;
  const hasUnclustered = clusteringResult.unclusteredPropositionIds.length > 0;

  const qualityStyles = getQualityStyles(clusteringResult.qualityScore);
  const qualityPercentage = Math.round(clusteringResult.qualityScore * 100);
  const confidencePercentage = Math.round(clusteringResult.confidence * 100);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Metrics */}
      {showMetrics && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Proposition Clusters
          </h2>

          {/* Overall Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {clusteringResult.clusters.length}
              </div>
              <div className="text-xs text-gray-600">Clusters</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {propositions.size}
              </div>
              <div className="text-xs text-gray-600">Total Propositions</div>
            </div>
            <div className={`text-center p-3 rounded-lg ${qualityStyles.bg}`}>
              <div className={`text-2xl font-bold ${qualityStyles.color}`}>
                {qualityPercentage}%
              </div>
              <div className="text-xs text-gray-600">Quality Score</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {confidencePercentage}%
              </div>
              <div className="text-xs text-gray-600">Confidence</div>
            </div>
          </div>

          {/* Method and Reasoning */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold px-2 py-1 rounded bg-indigo-100 text-indigo-800">
                {clusteringResult.method.toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">Clustering Method</span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              {clusteringResult.reasoning}
            </p>
          </div>
        </div>
      )}

      {/* Clusters */}
      {hasClusters && (
        <div className="space-y-4">
          {clusteringResult.clusters.map((cluster) => {
            const cohesionStyles = getCohesionStyles(cluster.cohesionScore);
            const clusterPropositions = cluster.propositionIds
              .map((id) => propositions.get(id))
              .filter((p): p is Proposition => p !== undefined);

            const displayedPropositions =
              maxPropositionsPerCluster > 0
                ? clusterPropositions.slice(0, maxPropositionsPerCluster)
                : clusterPropositions;

            const isClickable = !!onClusterClick;

            return (
              <div
                key={cluster.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${
                  isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
                }`}
                onClick={() => onClusterClick?.(cluster.id)}
                role={isClickable ? 'button' : 'article'}
                tabIndex={isClickable ? 0 : undefined}
                onKeyPress={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onClusterClick?.(cluster.id);
                  }
                }}
                aria-label={`Cluster: ${cluster.theme}, ${cluster.size} propositions`}
              >
                {/* Cluster Header */}
                <div className={`p-4 border-l-4 ${cohesionStyles.border} ${cohesionStyles.bg}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {cluster.theme}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>{cluster.size} propositions</span>
                        <span>•</span>
                        <span className={`font-medium ${cohesionStyles.badge} px-2 py-0.5 rounded text-xs`}>
                          {cohesionStyles.text} Cohesion ({Math.round(cluster.cohesionScore * 100)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Keywords */}
                  {cluster.keywords.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-2">
                        {cluster.keywords.map((keyword, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-gray-700 border border-gray-300"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Propositions in Cluster */}
                {showPropositionDetails && clusterPropositions.length > 0 && (
                  <div className="p-4 space-y-2 bg-gray-50">
                    {displayedPropositions.map((prop) => (
                      <div
                        key={prop.id}
                        className={`p-3 bg-white rounded border border-gray-200 ${
                          onPropositionClick ? 'cursor-pointer hover:bg-gray-50' : ''
                        }`}
                        onClick={(e) => {
                          if (onPropositionClick) {
                            e.stopPropagation();
                            onPropositionClick(prop.id);
                          }
                        }}
                        role={onPropositionClick ? 'button' : undefined}
                        tabIndex={onPropositionClick ? 0 : undefined}
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-gray-800 flex-1">{prop.text}</p>
                          <span className="ml-2 text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800">
                            {prop.agreementPercentage}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                            {prop.supportingParticipants.length}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                            {prop.opposingParticipants.length}
                          </span>
                          {prop.neutralParticipants.length > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                              {prop.neutralParticipants.length}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Show more indicator */}
                    {maxPropositionsPerCluster > 0 &&
                      clusterPropositions.length > maxPropositionsPerCluster && (
                        <div className="text-center pt-2">
                          <p className="text-xs text-gray-600">
                            +{clusterPropositions.length - maxPropositionsPerCluster} more
                            propositions
                          </p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Unclustered Propositions */}
      {showUnclustered && hasUnclustered && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Unclustered Propositions ({clusteringResult.unclusteredPropositionIds.length})
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            These propositions don't clearly belong to any cluster and represent unique or
            outlier perspectives.
          </p>
          <div className="space-y-2">
            {clusteringResult.unclusteredPropositionIds.map((propId) => {
              const prop = propositions.get(propId);
              if (!prop) return null;

              return (
                <div
                  key={propId}
                  className={`p-3 bg-gray-50 rounded border border-gray-200 ${
                    onPropositionClick ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  onClick={() => onPropositionClick?.(propId)}
                  role={onPropositionClick ? 'button' : undefined}
                  tabIndex={onPropositionClick ? 0 : undefined}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-800 flex-1">{prop.text}</p>
                    <span className="ml-2 text-xs font-semibold px-2 py-1 rounded bg-gray-200 text-gray-700">
                      {prop.agreementPercentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasClusters && !hasUnclustered && (
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No Clusters Found
          </h3>
          <p className="text-sm text-gray-500">
            Clustering analysis will appear here once there are enough propositions to
            analyze.
          </p>
        </div>
      )}
    </div>
  );
};

export default PropositionClusterView;
