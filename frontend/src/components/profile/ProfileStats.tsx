/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ProfileStats - Displays user activity statistics
 *
 * Shows topic count, response count, and other activity metrics.
 * Privacy-aware: respects user's privacy settings.
 */

export interface ProfileStatsProps {
  /** Number of topics created */
  topicCount?: number;
  /** Number of responses posted */
  responseCount?: number;
  /** Number of validations performed (optional) */
  validationCount?: number;
  /** Whether this section is visible (based on privacy settings) */
  isVisible?: boolean;
  /** Message to show when privacy restricted */
  privacyMessage?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Stat item component for consistent styling
 */
interface StatItemProps {
  value: number;
  label: string;
  icon?: string;
}

function StatItem({ value, label, icon }: StatItemProps) {
  return (
    <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      {icon && <span className="text-2xl mb-1 block">{icon}</span>}
      <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
    </div>
  );
}

/**
 * Profile statistics grid component
 *
 * @remarks
 * **Responsive:**
 * - Mobile: 2-column grid
 * - Desktop: 3-4 column grid depending on available stats
 *
 * **Privacy:**
 * - When isVisible=false, shows privacy message instead of stats
 *
 * @example
 * ```tsx
 * <ProfileStats
 *   topicCount={42}
 *   responseCount={156}
 *   isVisible={canViewActivityHistory}
 * />
 * ```
 */
export function ProfileStats({
  topicCount,
  responseCount,
  validationCount,
  isVisible = true,
  privacyMessage,
  className = '',
}: ProfileStatsProps) {
  // Count how many stats we have
  const hasStats =
    topicCount !== undefined || responseCount !== undefined || validationCount !== undefined;

  // Privacy restriction
  if (!isVisible) {
    return (
      <div
        className={`text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}
      >
        <span className="text-2xl mb-2 block">🔒</span>
        <p>{privacyMessage || 'Activity statistics are private'}</p>
      </div>
    );
  }

  // No stats available
  if (!hasStats) {
    return (
      <div
        className={`text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}
      >
        <p>No activity statistics available yet</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-4 ${className}`}>
      {topicCount !== undefined && <StatItem value={topicCount} label="Topics" icon="📝" />}
      {responseCount !== undefined && (
        <StatItem value={responseCount} label="Responses" icon="💬" />
      )}
      {validationCount !== undefined && (
        <StatItem value={validationCount} label="Validations" icon="✓" />
      )}
    </div>
  );
}

export default ProfileStats;
