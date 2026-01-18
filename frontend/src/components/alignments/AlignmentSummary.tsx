import React from 'react';

export interface AlignmentSummaryProps {
  /**
   * Number of support alignments
   */
  supportCount: number;

  /**
   * Number of oppose alignments
   */
  opposeCount: number;

  /**
   * Number of nuanced alignments
   */
  nuancedCount: number;

  /**
   * Consensus score (0.00-1.00)
   * 0.00 = all oppose, 0.50 = balanced, 1.00 = all support
   */
  consensusScore: number | null;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Whether to show detailed breakdown
   */
  showDetails?: boolean;
}

const AlignmentSummary: React.FC<AlignmentSummaryProps> = ({
  supportCount,
  opposeCount,
  nuancedCount,
  consensusScore,
  size = 'md',
  showDetails = true,
}) => {
  const totalCount = supportCount + opposeCount + nuancedCount;

  // Calculate percentages
  const supportPercent = totalCount > 0 ? (supportCount / totalCount) * 100 : 0;
  const opposePercent = totalCount > 0 ? (opposeCount / totalCount) * 100 : 0;
  const nuancedPercent = totalCount > 0 ? (nuancedCount / totalCount) * 100 : 0;

  // Size classes
  const sizeClasses = {
    sm: {
      text: 'text-xs',
      heading: 'text-sm',
      barHeight: 'h-2',
      spacing: 'space-y-1',
      gap: 'gap-1',
    },
    md: {
      text: 'text-sm',
      heading: 'text-base',
      barHeight: 'h-3',
      spacing: 'space-y-2',
      gap: 'gap-2',
    },
    lg: {
      text: 'text-base',
      heading: 'text-lg',
      barHeight: 'h-4',
      spacing: 'space-y-3',
      gap: 'gap-3',
    },
  };

  const currentSize = sizeClasses[size];

  // Get consensus description
  const getConsensusDescription = (score: number | null): string => {
    if (score === null) return 'No alignments yet';
    if (score >= 0.8) return 'Strong support';
    if (score >= 0.6) return 'Moderate support';
    if (score >= 0.4) return 'Mixed views';
    if (score >= 0.2) return 'Moderate opposition';
    return 'Strong opposition';
  };

  // Get consensus color
  const getConsensusColor = (score: number | null): string => {
    if (score === null) return 'text-gray-500';
    if (score >= 0.8) return 'text-green-700';
    if (score >= 0.6) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    if (score >= 0.2) return 'text-red-600';
    return 'text-red-700';
  };

  // Get consensus background color for score bar
  const getConsensusBgColor = (score: number | null): string => {
    if (score === null) return 'bg-gray-300';
    if (score >= 0.8) return 'bg-green-600';
    if (score >= 0.6) return 'bg-green-500';
    if (score >= 0.4) return 'bg-yellow-500';
    if (score >= 0.2) return 'bg-red-500';
    return 'bg-red-600';
  };

  return (
    <div className={`w-full ${currentSize.spacing}`}>
      {/* Total Count */}
      <div className="flex items-center justify-between">
        <span className={`font-semibold ${currentSize.heading}`}>Alignment Summary</span>
        <span className={`${currentSize.text} text-gray-600`}>
          {totalCount} {totalCount === 1 ? 'alignment' : 'alignments'}
        </span>
      </div>

      {totalCount > 0 ? (
        <>
          {/* Stacked Bar Chart */}
          <div className="w-full">
            <div
              className={`w-full ${currentSize.barHeight} bg-gray-200 rounded-full overflow-hidden flex`}
            >
              {/* Support segment */}
              {supportCount > 0 && (
                <div
                  className="bg-green-500 transition-all duration-300"
                  style={{ width: `${supportPercent}%` }}
                  title={`Support: ${supportCount} (${supportPercent.toFixed(1)}%)`}
                />
              )}
              {/* Oppose segment */}
              {opposeCount > 0 && (
                <div
                  className="bg-red-500 transition-all duration-300"
                  style={{ width: `${opposePercent}%` }}
                  title={`Oppose: ${opposeCount} (${opposePercent.toFixed(1)}%)`}
                />
              )}
              {/* Nuanced segment */}
              {nuancedCount > 0 && (
                <div
                  className="bg-blue-500 transition-all duration-300"
                  style={{ width: `${nuancedPercent}%` }}
                  title={`Nuanced: ${nuancedCount} (${nuancedPercent.toFixed(1)}%)`}
                />
              )}
            </div>
          </div>

          {/* Detailed Breakdown */}
          {showDetails && (
            <div className={`grid grid-cols-3 ${currentSize.gap} ${currentSize.text}`}>
              {/* Support */}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-green-500 rounded-sm flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{supportCount}</span>
                  <span className="text-gray-500">Support</span>
                </div>
              </div>

              {/* Oppose */}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-red-500 rounded-sm flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{opposeCount}</span>
                  <span className="text-gray-500">Oppose</span>
                </div>
              </div>

              {/* Nuanced */}
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-blue-500 rounded-sm flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{nuancedCount}</span>
                  <span className="text-gray-500">Nuanced</span>
                </div>
              </div>
            </div>
          )}

          {/* Consensus Score */}
          {consensusScore !== null && (
            <div className={currentSize.spacing}>
              <div className="flex items-center justify-between mb-1">
                <span className={`${currentSize.text} font-medium text-gray-700`}>Consensus</span>
                <span
                  className={`${currentSize.text} font-semibold ${getConsensusColor(consensusScore)}`}
                >
                  {getConsensusDescription(consensusScore)}
                </span>
              </div>
              <div className="relative w-full">
                {/* Background track */}
                <div
                  className={`w-full ${currentSize.barHeight} bg-gray-200 rounded-full overflow-hidden`}
                >
                  {/* Consensus score indicator */}
                  <div
                    className={`${currentSize.barHeight} ${getConsensusBgColor(consensusScore)} transition-all duration-300 rounded-full`}
                    style={{ width: `${consensusScore * 100}%` }}
                  />
                </div>
                {/* Score value */}
                <div className="flex justify-between mt-1">
                  <span className={`${currentSize.text} text-gray-500`}>Oppose</span>
                  <span className={`${currentSize.text} text-gray-700 font-medium`}>
                    {(consensusScore * 100).toFixed(0)}%
                  </span>
                  <span className={`${currentSize.text} text-gray-500`}>Support</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className={`text-center py-4 ${currentSize.text} text-gray-500`}>
          No alignments yet. Be the first to share your position!
        </div>
      )}
    </div>
  );
};

export default AlignmentSummary;
