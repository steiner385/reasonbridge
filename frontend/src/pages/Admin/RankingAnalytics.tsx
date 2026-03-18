/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Admin Ranking Analytics Page
 *
 * Dashboard for viewing ranking system analytics including:
 * - Tier distribution across all users
 * - Appeals overview with urgency indicators
 * - Credentials overview and verification queue status
 * - System health metrics
 * - Top contributors preview
 */

import { Link } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useRankingAnalytics } from '../../hooks/useAdminRankingData';
import { getTierInfo, CREDENTIAL_TYPE_LABELS } from '../../types/ranking';
import type { CredentialType, UserRank, TierDistribution } from '../../types/ranking';

/**
 * Loading skeleton for the analytics page
 */
function AnalyticsSkeleton() {
  return (
    <div data-testid="ranking-analytics-skeleton" className="space-y-6">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/**
 * Tier bar component for distribution chart
 */
function TierBar({ distribution, maxCount }: { distribution: TierDistribution; maxCount: number }) {
  const tierInfo = getTierInfo(distribution.tier);
  const widthPercent = maxCount > 0 ? (distribution.count / maxCount) * 100 : 0;

  return (
    <div data-testid={`tier-bar-${distribution.tier}`} className="flex items-center gap-4 py-2">
      <div className="w-28 shrink-0">
        <span className={`text-sm font-medium ${tierInfo.color} ${tierInfo.darkColor}`}>
          {tierInfo.name}
        </span>
      </div>
      <div className="flex-1">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
          <div
            className={`h-full ${tierInfo.bgColor} ${tierInfo.darkBgColor} transition-all duration-500`}
            style={{ width: `${widthPercent}%` }}
          />
        </div>
      </div>
      <div className="w-16 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
        {distribution.count}
      </div>
      <div className="w-12 text-right text-sm text-gray-600 dark:text-gray-400">
        {distribution.percentage}%
      </div>
    </div>
  );
}

/**
 * Stat card for key metrics
 */
function StatCard({
  label,
  value,
  testId,
  ariaLabel,
  accent = 'indigo',
  urgent = false,
}: {
  label: string;
  value: number | string;
  testId?: string;
  ariaLabel?: string;
  accent?: 'indigo' | 'green' | 'red' | 'amber';
  urgent?: boolean;
}) {
  const accentColors = {
    indigo: 'border-indigo-500 dark:border-indigo-400',
    green: 'border-green-500 dark:border-green-400',
    red: 'border-red-500 dark:border-red-400',
    amber: 'border-amber-500 dark:border-amber-400',
  };

  return (
    <div
      className={`p-4 bg-white dark:bg-gray-800 rounded-lg border-l-4 ${accentColors[accent]} shadow-sm`}
    >
      <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
      <p
        data-testid={testId}
        aria-label={ariaLabel || label}
        className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"
      >
        {value}
        {urgent && (
          <span
            data-testid="appeals-urgency-indicator"
            className="inline-flex h-3 w-3 rounded-full bg-red-500 animate-pulse"
            aria-label="Requires attention"
          />
        )}
      </p>
    </div>
  );
}

/**
 * Top contributor row
 */
function ContributorRow({ user, rank }: { user: UserRank; rank: number }) {
  const tierInfo = getTierInfo(user.tierLevel);

  return (
    <div className="flex items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">
        {rank}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {user.displayName || 'Anonymous'}
        </p>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${tierInfo.bgColor} ${tierInfo.darkBgColor} ${tierInfo.color} ${tierInfo.darkColor}`}
        >
          {tierInfo.name}
        </span>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {user.compositeScore.toFixed(2)}
      </span>
    </div>
  );
}

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return (
    date.toLocaleDateString() +
    ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

/**
 * Get credential type display name
 */
function getCredentialTypeLabel(type: CredentialType): string {
  return CREDENTIAL_TYPE_LABELS[type] || type;
}

/**
 * RankingAnalytics page component
 */
export default function RankingAnalyticsPage() {
  const { data: analytics, isLoading, error, refetch } = useRankingAnalytics();

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <AnalyticsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <Card>
          <CardBody>
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h2>
              <p className="text-red-700 dark:text-red-300 mb-4">{error}</p>
              <Button variant="primary" onClick={refetch}>
                Retry
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  const maxTierCount = Math.max(...analytics.tierDistribution.map((d) => d.count));

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Ranking Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of user ranking system performance and health metrics
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={analytics.totalUsers}
          testId="summary-total-users"
          accent="indigo"
        />
        <StatCard
          label="Pending Appeals"
          value={analytics.appeals.pending}
          testId="summary-appeals-pending"
          ariaLabel="Number of pending appeals"
          accent={analytics.appeals.pending > 0 ? 'red' : 'indigo'}
          urgent={analytics.appeals.pending > 0}
        />
        <StatCard
          label="Pending Credentials"
          value={analytics.credentials.pending}
          testId="summary-credentials-pending"
          ariaLabel="Number of pending credentials"
          accent="amber"
        />
        <StatCard
          label="Avg Composite Score"
          value={analytics.systemHealth.avgCompositeScore.toFixed(2)}
          testId="summary-avg-score"
          ariaLabel="Average composite score"
          accent="green"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Tier Distribution */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Tier Distribution
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-1">
              {analytics.tierDistribution.map((dist) => (
                <TierBar key={dist.tier} distribution={dist} maxCount={maxTierCount} />
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Appeals Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Appeals Overview
              </h2>
              <Link
                to="/admin/appeals"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View appeals queue
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p
                  data-testid="appeals-pending-count"
                  aria-label="Pending appeals count"
                  className="text-2xl font-bold text-amber-600 dark:text-amber-400"
                >
                  {analytics.appeals.pending}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Pending</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p
                  data-testid="appeals-approved-count"
                  aria-label="Approved appeals count"
                  className="text-2xl font-bold text-green-600 dark:text-green-400"
                >
                  {analytics.appeals.approved}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Approved</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p
                  data-testid="appeals-denied-count"
                  aria-label="Denied appeals count"
                  className="text-2xl font-bold text-red-600 dark:text-red-400"
                >
                  {analytics.appeals.denied}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Denied</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Avg Resolution Time</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {analytics.appeals.avgResolutionHours.toFixed(1)} hours
              </span>
            </div>
          </CardBody>
        </Card>

        {/* Credentials Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Credentials Overview
              </h2>
              <Link
                to="/admin/credentials"
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                View credentials queue
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p
                  data-testid="credentials-pending-count"
                  aria-label="Pending credentials count"
                  className="text-2xl font-bold text-amber-600 dark:text-amber-400"
                >
                  {analytics.credentials.pending}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Pending</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p
                  data-testid="credentials-verified-count"
                  aria-label="Verified credentials count"
                  className="text-2xl font-bold text-green-600 dark:text-green-400"
                >
                  {analytics.credentials.verified}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Verified</p>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p
                  data-testid="credentials-rejected-count"
                  aria-label="Rejected credentials count"
                  className="text-2xl font-bold text-red-600 dark:text-red-400"
                >
                  {analytics.credentials.rejected}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Rejected</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Most Common Types
              </p>
              {analytics.credentials.byType.slice(0, 4).map((cred) => (
                <div
                  key={cred.type}
                  className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400"
                >
                  <span>{getCredentialTypeLabel(cred.type)}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {cred.count}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              System Health
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Last Recalculation</span>
                <span
                  data-testid="last-recalculation"
                  className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                >
                  {formatDate(analytics.systemHealth.lastRecalculation)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Min Score</p>
                  <p
                    data-testid="min-score"
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {analytics.systemHealth.minScore.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Max Score</p>
                  <p
                    data-testid="max-score"
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {analytics.systemHealth.maxScore.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Median Score</p>
                  <p
                    data-testid="median-score"
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                  >
                    {analytics.systemHealth.medianScore.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Avg Score</p>
                  <p
                    data-testid="avg-composite-score"
                    className="text-lg font-semibold text-indigo-600 dark:text-indigo-400"
                  >
                    {analytics.systemHealth.avgCompositeScore.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Top Contributors */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Top Contributors
            </h2>
            <Link
              to="/leaderboard"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View full leaderboard
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          {analytics.topContributors.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No contributors yet</p>
          ) : (
            <div className="space-y-1">
              {analytics.topContributors.slice(0, 10).map((user, index) => (
                <ContributorRow key={user.userId} user={user} rank={index + 1} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
