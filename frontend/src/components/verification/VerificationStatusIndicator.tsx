/**
 * Verification Status Indicator Component
 * Compact indicator showing user's verification status
 * Displays as a badge/icon with color-coded status
 */

import type { VerificationRecord } from '../../types/verification';
import { VerificationStatus, VerificationType } from '../../types/verification';

interface VerificationStatusIndicatorProps {
  verification?: VerificationRecord | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showTooltip?: boolean;
  className?: string;
  onClick?: () => void;
}

const getStatusColor = (status: VerificationStatus): string => {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return 'bg-green-100 text-green-800 border-green-300';
    case VerificationStatus.PENDING:
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case VerificationStatus.REJECTED:
      return 'bg-red-100 text-red-800 border-red-300';
    case VerificationStatus.EXPIRED:
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusIcon = (status: VerificationStatus): string => {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return '✓';
    case VerificationStatus.PENDING:
      return '⟳';
    case VerificationStatus.REJECTED:
      return '✕';
    case VerificationStatus.EXPIRED:
      return '⌛';
    default:
      return '?';
  }
};

const getStatusLabel = (status: VerificationStatus): string => {
  switch (status) {
    case VerificationStatus.VERIFIED:
      return 'Verified';
    case VerificationStatus.PENDING:
      return 'Pending';
    case VerificationStatus.REJECTED:
      return 'Rejected';
    case VerificationStatus.EXPIRED:
      return 'Expired';
    default:
      return 'Unknown';
  }
};

const getVerificationTypeLabel = (type: VerificationType): string => {
  switch (type) {
    case VerificationType.PHONE:
      return 'Phone Verification';
    case VerificationType.GOVERNMENT_ID:
      return 'Government ID';
    case VerificationType.VIDEO:
      return 'Video Verification';
    default:
      return 'Verification';
  }
};

const getSizeClasses = (
  size: 'sm' | 'md' | 'lg'
): { badge: string; icon: string; text: string } => {
  switch (size) {
    case 'sm':
      return {
        badge: 'px-2 py-1 text-xs',
        icon: 'text-sm',
        text: 'text-xs',
      };
    case 'lg':
      return {
        badge: 'px-4 py-2 text-base',
        icon: 'text-lg',
        text: 'text-sm',
      };
    case 'md':
    default:
      return {
        badge: 'px-3 py-1.5 text-sm',
        icon: 'text-base',
        text: 'text-xs',
      };
  }
};

const getTooltipText = (verification: VerificationRecord): string => {
  const status = getStatusLabel(verification.status);
  const type = getVerificationTypeLabel(verification.type);

  if (verification.status === VerificationStatus.VERIFIED && verification.verifiedAt) {
    const verifiedDate = new Date(verification.verifiedAt).toLocaleDateString();
    return `${type} - ${status} on ${verifiedDate}`;
  }

  if (
    (verification.status === VerificationStatus.PENDING ||
      verification.status === VerificationStatus.EXPIRED) &&
    verification.expiresAt
  ) {
    const expiresDate = new Date(verification.expiresAt).toLocaleDateString();
    return `${type} - ${status}, expires ${expiresDate}`;
  }

  return `${type} - ${status}`;
};

export const VerificationStatusIndicator: React.FC<VerificationStatusIndicatorProps> = ({
  verification,
  size = 'md',
  showLabel = true,
  showTooltip = true,
  className = '',
  onClick,
}) => {
  if (!verification) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full border bg-gray-100 text-gray-600 border-gray-300 ${className}`}
      >
        <span className="text-base">○</span>
        {showLabel && <span>Not Verified</span>}
      </span>
    );
  }

  const sizeClasses = getSizeClasses(size);
  const colorClasses = getStatusColor(verification.status);
  const icon = getStatusIcon(verification.status);
  const label = getStatusLabel(verification.status);
  const tooltipText = showTooltip ? getTooltipText(verification) : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors ${sizeClasses.badge} ${colorClasses} ${className}`}
      title={tooltipText}
      role="status"
      aria-label={`Verification status: ${label}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <span className={`font-bold ${sizeClasses.icon}`}>{icon}</span>
      {showLabel && <span className={sizeClasses.text}>{label}</span>}
    </span>
  );
};

/**
 * Verification Status Grid
 * Displays multiple verification statuses in a compact grid layout
 */
interface VerificationStatusGridProps {
  verifications: VerificationRecord[];
  maxColumns?: number;
  className?: string;
  onIndicatorClick?: (verification: VerificationRecord) => void;
}

export const VerificationStatusGrid: React.FC<VerificationStatusGridProps> = ({
  verifications,
  maxColumns = 3,
  className = '',
  onIndicatorClick,
}) => {
  if (verifications.length === 0) {
    return (
      <div className={`text-sm text-gray-500 italic ${className}`}>
        No verifications
      </div>
    );
  }

  return (
    <div
      className={`grid gap-2 ${
        maxColumns === 1
          ? 'grid-cols-1'
          : maxColumns === 2
            ? 'grid-cols-2'
            : 'grid-cols-3'
      } ${className}`}
    >
      {verifications.map((verification) => (
        <VerificationStatusIndicator
          key={verification.id}
          verification={verification}
          size="sm"
          showLabel
          onClick={() => onIndicatorClick?.(verification)}
        />
      ))}
    </div>
  );
};

export default VerificationStatusIndicator;
