import type { Proposition } from '../../types/common-ground';

export interface SharedPointCardProps {
  /**
   * The shared point (proposition) to display
   */
  proposition: Proposition;

  /**
   * Whether to show participant details
   */
  showParticipants?: boolean;

  /**
   * Optional callback when the card is clicked
   */
  onClick?: (propositionId: string) => void;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Whether to show the agreement percentage badge
   */
  showAgreementBadge?: boolean;

  /**
   * Size variant of the card
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Whether to show supporting evidence count
   */
  showSupportingCount?: boolean;
}

/**
 * Get styling based on agreement level
 */
const getAgreementStyles = (percentage: number) => {
  if (percentage >= 80) {
    return {
      border: 'border-green-500',
      bg: 'bg-green-50',
      badge: 'bg-green-100 text-green-800',
      text: 'text-green-700',
    };
  }
  if (percentage >= 60) {
    return {
      border: 'border-blue-500',
      bg: 'bg-blue-50',
      badge: 'bg-blue-100 text-blue-800',
      text: 'text-blue-700',
    };
  }
  if (percentage >= 40) {
    return {
      border: 'border-yellow-500',
      bg: 'bg-yellow-50',
      badge: 'bg-yellow-100 text-yellow-800',
      text: 'text-yellow-700',
    };
  }
  return {
    border: 'border-gray-500',
    bg: 'bg-gray-50',
    badge: 'bg-gray-100 text-gray-800',
    text: 'text-gray-700',
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
      participants: 'text-xs',
    },
    medium: {
      container: 'p-4',
      text: 'text-base',
      badge: 'text-sm px-2.5 py-1',
      participants: 'text-sm',
    },
    large: {
      container: 'p-6',
      text: 'text-lg',
      badge: 'text-base px-3 py-1.5',
      participants: 'text-base',
    },
  };

  return styles[size];
};

/**
 * SharedPointCard - Displays a single shared point/proposition
 *
 * This component represents an individual point of agreement in a discussion,
 * showing the proposition text, agreement level, and participant support.
 */
const SharedPointCard = ({
  proposition,
  showParticipants = true,
  onClick,
  className = '',
  showAgreementBadge = true,
  size = 'medium',
  showSupportingCount = true,
}: SharedPointCardProps) => {
  const agreementStyles = getAgreementStyles(proposition.agreementPercentage);
  const sizeStyles = getSizeStyles(size);

  const totalParticipants =
    proposition.supportingParticipants.length +
    proposition.opposingParticipants.length +
    proposition.neutralParticipants.length;

  const isClickable = !!onClick;

  return (
    <div
      className={`
        ${agreementStyles.bg}
        ${agreementStyles.border}
        border-l-4 rounded-lg shadow-sm
        ${sizeStyles.container}
        ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      onClick={() => onClick?.(proposition.id)}
      role={isClickable ? 'button' : 'article'}
      tabIndex={isClickable ? 0 : undefined}
      onKeyPress={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick?.(proposition.id);
        }
      }}
      aria-label={`Shared point: ${proposition.text}, ${proposition.agreementPercentage}% agreement`}
    >
      {/* Header with agreement badge */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <p className={`${sizeStyles.text} text-gray-900 font-medium leading-relaxed`}>
            {proposition.text}
          </p>
        </div>
        {showAgreementBadge && (
          <span
            className={`${agreementStyles.badge} ${sizeStyles.badge} font-semibold rounded ml-3 whitespace-nowrap`}
          >
            {proposition.agreementPercentage}%
          </span>
        )}
      </div>

      {/* Agreement bar */}
      <div className="mt-3 mb-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              proposition.agreementPercentage >= 80
                ? 'bg-green-500'
                : proposition.agreementPercentage >= 60
                  ? 'bg-blue-500'
                  : proposition.agreementPercentage >= 40
                    ? 'bg-yellow-500'
                    : 'bg-gray-400'
            }`}
            style={{ width: `${proposition.agreementPercentage}%` }}
            role="progressbar"
            aria-valuenow={proposition.agreementPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>

      {/* Participant details */}
      {showParticipants && (
        <div className={`mt-3 flex items-center gap-3 ${sizeStyles.participants} text-gray-600`}>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
            <span>{proposition.supportingParticipants.length} support</span>
          </div>
          {proposition.opposingParticipants.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>{proposition.opposingParticipants.length} oppose</span>
            </div>
          )}
          {proposition.neutralParticipants.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span>{proposition.neutralParticipants.length} neutral</span>
            </div>
          )}
          {showSupportingCount && (
            <div className="ml-auto text-gray-500">
              {totalParticipants} total
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SharedPointCard;
