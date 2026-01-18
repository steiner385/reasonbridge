import type { DivergencePoint } from '../../types/common-ground';

export interface DivergencePointCardProps {
  /**
   * The divergence point to display
   */
  divergencePoint: DivergencePoint;

  /**
   * Whether to show viewpoint reasoning
   */
  showReasoning?: boolean;

  /**
   * Optional callback when the card is clicked
   */
  onClick?: (propositionId?: string) => void;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Whether to show the polarization score badge
   */
  showPolarizationScore?: boolean;

  /**
   * Size variant of the card
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Whether to show underlying values
   */
  showUnderlyingValues?: boolean;
}

/**
 * Get styling based on polarization level
 */
const getPolarizationStyles = (polarizationScore: number) => {
  // High polarization (0.7+) = red/orange (concerning)
  if (polarizationScore >= 0.7) {
    return {
      border: 'border-red-500',
      bg: 'bg-red-50',
      badge: 'bg-red-100 text-red-800',
      text: 'text-red-700',
      label: 'High Polarization',
    };
  }
  // Medium polarization (0.4-0.69) = yellow (moderate concern)
  if (polarizationScore >= 0.4) {
    return {
      border: 'border-yellow-500',
      bg: 'bg-yellow-50',
      badge: 'bg-yellow-100 text-yellow-800',
      text: 'text-yellow-700',
      label: 'Moderate Polarization',
    };
  }
  // Low polarization (<0.4) = blue (healthy diversity)
  return {
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-800',
    text: 'text-blue-700',
    label: 'Low Polarization',
  };
};

/**
 * Get size-specific styles
 */
const getSizeStyles = (size: 'small' | 'medium' | 'large') => {
  const styles = {
    small: {
      container: 'p-3',
      text: 'text-sm',
      badge: 'text-xs px-2 py-0.5',
      viewpoint: 'text-xs',
    },
    medium: {
      container: 'p-4',
      text: 'text-base',
      badge: 'text-sm px-2.5 py-1',
      viewpoint: 'text-sm',
    },
    large: {
      container: 'p-6',
      text: 'text-lg',
      badge: 'text-base px-3 py-1.5',
      viewpoint: 'text-base',
    },
  };

  return styles[size];
};

/**
 * Get viewpoint color (cycling through different colors)
 */
const getViewpointColor = (index: number) => {
  const colors = [
    { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
    { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' },
    { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-800' },
    { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800' },
  ];
  return colors[index % colors.length]!;
};

/**
 * DivergencePointCard - Displays a point where viewpoints diverge
 *
 * This component represents a divergence point in a discussion,
 * showing the proposition, different viewpoints, and polarization level.
 */
const DivergencePointCard = ({
  divergencePoint,
  showReasoning = true,
  onClick,
  className = '',
  showPolarizationScore = true,
  size = 'medium',
  showUnderlyingValues = true,
}: DivergencePointCardProps) => {
  const polarizationStyles = getPolarizationStyles(divergencePoint.polarizationScore);
  const sizeStyles = getSizeStyles(size);

  const isClickable = !!onClick;

  return (
    <div
      className={`
        ${polarizationStyles.bg}
        ${polarizationStyles.border}
        border-l-4 rounded-lg shadow-sm
        ${sizeStyles.container}
        ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={() => onClick?.(divergencePoint.propositionId)}
      role={isClickable ? 'button' : 'article'}
      tabIndex={isClickable ? 0 : undefined}
      onKeyPress={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.(divergencePoint.propositionId);
        }
      }}
      aria-label={`Divergence point: ${divergencePoint.proposition}, ${(divergencePoint.polarizationScore * 100).toFixed(0)}% polarization`}
    >
      {/* Header with proposition and polarization badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-gray-700 text-white">
              DIVERGENCE
            </span>
            {showPolarizationScore && (
              <span className={`${polarizationStyles.badge} ${sizeStyles.badge} font-semibold rounded`}>
                {(divergencePoint.polarizationScore * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <p className={`${sizeStyles.text} text-gray-900 font-medium leading-relaxed mt-2`}>
            {divergencePoint.proposition}
          </p>
        </div>
      </div>

      {/* Polarization indicator bar */}
      <div className="mt-3 mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">{polarizationStyles.label}</span>
          <span className="text-xs text-gray-500">
            {divergencePoint.totalParticipants} participants
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              divergencePoint.polarizationScore >= 0.7
                ? 'bg-red-500'
                : divergencePoint.polarizationScore >= 0.4
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
            }`}
            style={{ width: `${divergencePoint.polarizationScore * 100}%` }}
            role="progressbar"
            aria-valuenow={divergencePoint.polarizationScore * 100}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Viewpoints */}
      <div className="space-y-3">
        <h4 className={`${sizeStyles.viewpoint} font-semibold text-gray-700`}>
          Viewpoints ({divergencePoint.viewpoints.length}):
        </h4>
        {divergencePoint.viewpoints.map((viewpoint, index) => {
          const viewpointColor = getViewpointColor(index);
          return (
            <div
              key={index}
              className={`${viewpointColor.bg} border-l-2 ${viewpointColor.border} rounded p-3`}
            >
              <div className="flex items-start justify-between mb-2">
                <p className={`${sizeStyles.viewpoint} ${viewpointColor.text} font-medium flex-1`}>
                  {viewpoint.position}
                </p>
                <div className="ml-3 text-right">
                  <div className={`${sizeStyles.viewpoint} ${viewpointColor.text} font-semibold`}>
                    {viewpoint.percentage}%
                  </div>
                  <div className="text-xs text-gray-600">
                    {viewpoint.participantCount} {viewpoint.participantCount === 1 ? 'person' : 'people'}
                  </div>
                </div>
              </div>

              {showReasoning && viewpoint.reasoning.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-600 font-medium">Key reasoning:</p>
                  <ul className="text-xs text-gray-700 space-y-0.5 pl-3">
                    {viewpoint.reasoning.map((reason, idx) => (
                      <li key={idx} className="list-disc">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Underlying values */}
      {showUnderlyingValues &&
        divergencePoint.underlyingValues &&
        divergencePoint.underlyingValues.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-300">
            <p className="text-xs text-gray-600 font-medium mb-2">Underlying values:</p>
            <div className="flex flex-wrap gap-1.5">
              {divergencePoint.underlyingValues.map((value, idx) => (
                <span
                  key={idx}
                  className="inline-block text-xs px-2 py-1 rounded bg-gray-200 text-gray-700"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};

export default DivergencePointCard;
