/**
 * Verification Status Display Component
 * Shows current verification status and pending verifications
 */

import { usePendingVerifications } from '../../hooks/useVerification';
import { VerificationStatus, VerificationType } from '../../types/verification';
import Card from '../ui/Card';

interface VerificationStatusDisplayProps {
  currentVerificationLevel?: string;
  className?: string;
}

const getVerificationTypeLabel = (type: VerificationType): string => {
  const labels: Record<VerificationType, string> = {
    [VerificationType.PHONE]: 'Phone',
    [VerificationType.GOVERNMENT_ID]: 'Government ID',
    [VerificationType.VIDEO]: 'Video',
  };
  return labels[type];
};

const isExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

const getTimeRemaining = (expiresAt: string): string => {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
};

export const VerificationStatusDisplay: React.FC<VerificationStatusDisplayProps> = ({
  currentVerificationLevel = 'BASIC',
  className = '',
}) => {
  const pendingVerifications = usePendingVerifications();

  const renderPendingVerifications = () => {
    if (pendingVerifications.isPending) {
      return (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      );
    }

    if (pendingVerifications.isError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          Failed to load pending verifications
        </div>
      );
    }

    const dataArray = pendingVerifications.data ?? [];

    const pending = dataArray.filter(
      (v) => v.status === VerificationStatus.PENDING && !isExpired(v.expiresAt),
    );

    if (pending.length === 0) {
      return <p className="text-sm text-gray-500 italic">No pending verifications</p>;
    }

    return (
      <div className="space-y-3">
        {pending.map((verification) => (
          <div key={verification.id} className="p-4 border border-blue-200 rounded-lg bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">
                  {getVerificationTypeLabel(verification.type)}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {getTimeRemaining(verification.expiresAt)}
                </p>
              </div>
              <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                In Progress
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="space-y-6">
        {/* Current Verification Level */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Verification Level</h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Status</p>
            <p className="text-2xl font-bold text-gray-900">{currentVerificationLevel}</p>
            <p className="text-xs text-gray-500 mt-2">
              Upgrade your verification level to unlock enhanced features and increase trust within
              the community.
            </p>
          </div>
        </div>

        {/* Pending Verifications */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending Verifications</h3>
          {renderPendingVerifications()}
        </div>

        {/* Verification Benefits */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Verification Benefits</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>Build trust within the community</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>Higher visibility in discussions</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>Access to exclusive features</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 font-bold mt-0.5">✓</span>
              <span>Enhanced credibility with verification badge</span>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
};
