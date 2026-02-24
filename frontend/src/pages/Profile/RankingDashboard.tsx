/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * RankingDashboard Page
 *
 * Comprehensive dashboard for users to view and manage their ranking profile:
 * - Global ranking with tier progress
 * - Leaderboard preview
 * - Domain expertise across topic categories
 * - Credentials management
 * - Appeals status and submission
 *
 * @remarks
 * - **Responsive**: Mobile-first with sm:/md:/lg: breakpoints
 * - **Dark mode**: Full Tailwind dark mode support
 * - **Accessibility**: Proper headings, ARIA labels, and keyboard navigation
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import TierProgressCard from '../../components/ranking/TierProgressCard';
import TierBadge from '../../components/ranking/TierBadge';
import ExpertiseBadge from '../../components/ranking/ExpertiseBadge';
import { CredentialSubmitForm } from '../../components/credentials/CredentialSubmitForm';
import {
  useMyRanking,
  useMyExpertise,
  useMyCredentials,
  useMyAppeals,
  useLeaderboardPreview,
} from '../../hooks/useRankingData';
import { rankingService } from '../../services/rankingService';
import { tagService } from '../../services/tagService';
import type { SubmitCredentialInput } from '../../types/ranking';
import { CREDENTIAL_STATUS_LABELS, CREDENTIAL_TYPE_LABELS } from '../../types/ranking';

/**
 * Skeleton loading component for the dashboard
 */
const RankingDashboardSkeleton = () => (
  <div
    className="max-w-4xl mx-auto space-y-6 animate-pulse"
    data-testid="ranking-dashboard-skeleton"
  >
    {/* Header skeleton */}
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />

    {/* Tier progress skeleton */}
    <div className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24" />
      </div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
    </div>

    {/* Leaderboard skeleton */}
    <div className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    </div>

    {/* Expertise skeleton */}
    <div className="rounded-xl border bg-white dark:bg-gray-800 dark:border-gray-700 p-6">
      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-36 mb-4" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Format date for display
 */
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Get status badge color classes
 */
const getStatusClasses = (
  status:
    | 'PENDING'
    | 'VERIFIED'
    | 'REJECTED'
    | 'EXPIRED'
    | 'pending'
    | 'under_review'
    | 'upheld'
    | 'denied',
) => {
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'verified':
    case 'upheld':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'pending':
    case 'under_review':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'rejected':
    case 'denied':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'expired':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

function RankingDashboard() {
  // Fetch data using custom hooks
  const {
    data: rankData,
    isLoading: rankLoading,
    error: rankError,
    refetch: refetchRank,
  } = useMyRanking();
  const { data: expertiseData, isLoading: expertiseLoading } = useMyExpertise();
  const {
    data: credentialsData,
    isLoading: credentialsLoading,
    refetch: refetchCredentials,
  } = useMyCredentials();
  const {
    data: appealsData,
    canSubmit: canSubmitAppeal,
    cooldownEndsAt,
    refetch: refetchAppeals,
  } = useMyAppeals();
  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboardPreview(5);

  // Modal state
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [isAppealModalOpen, setIsAppealModalOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [isSubmittingAppeal, setIsSubmittingAppeal] = useState(false);
  const [appealError, setAppealError] = useState<string | null>(null);
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch tags for credential form
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const popularTags = await tagService.getPopularTags(50);
        setTags(popularTags.map((tag) => ({ id: tag.id, name: tag.name })));
      } catch {
        // Silently fail - credential form can still work with empty tags
      }
    };
    fetchTags();
  }, []);

  // Handle credential submission - must be defined before early returns (Rules of Hooks)
  const handleCredentialSubmit = useCallback(
    async (data: SubmitCredentialInput) => {
      await rankingService.submitCredential(data);
      refetchCredentials();
    },
    [refetchCredentials],
  );

  // Handle appeal submission - must be defined before early returns (Rules of Hooks)
  const handleAppealSubmit = useCallback(async () => {
    if (!appealReason.trim()) return;

    setIsSubmittingAppeal(true);
    setAppealError(null);

    try {
      await rankingService.submitAppeal(appealReason.trim());
      setAppealReason('');
      setIsAppealModalOpen(false);
      refetchAppeals();
    } catch {
      setAppealError('Failed to submit appeal. Please try again.');
    } finally {
      setIsSubmittingAppeal(false);
    }
  }, [appealReason, refetchAppeals]);

  // Show loading skeleton
  const isLoading = rankLoading || expertiseLoading;
  if (isLoading) {
    return <RankingDashboardSkeleton />;
  }

  // Show error state
  if (rankError || !rankData) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Unable to Load Ranking Data
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {rankError || 'An error occurred while loading your ranking data.'}
              </p>
              <Button variant="primary" onClick={refetchRank}>
                Retry
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Always show appeals section - users can submit appeals or see existing ones
  const showAppealsSection = true;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <h1
        id="ranking-section-title"
        className="text-2xl font-bold text-gray-900 dark:text-gray-100"
      >
        My Ranking
      </h1>

      {/* Global Ranking Section */}
      <section aria-labelledby="ranking-section-title">
        <TierProgressCard rank={rankData} />
      </section>

      {/* Leaderboard Preview */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Top Contributors
          </h2>
        </CardHeader>
        <CardBody>
          {leaderboardLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : leaderboardData.length > 0 ? (
            <div className="space-y-3">
              {leaderboardData.map((user, index) => (
                <div
                  key={user.userId}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-gray-500 dark:text-gray-400 w-6">
                      #{index + 1}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {user.displayName || 'Anonymous'}
                    </span>
                    <TierBadge tier={user.tierLevel} variant="icon" size="sm" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {user.compositeScore.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No leaderboard data available
            </p>
          )}
          <div className="mt-4 text-center">
            <Link
              to="/leaderboard"
              className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
            >
              View Full Leaderboard
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Domain Expertise Section */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Domain Expertise
          </h2>
        </CardHeader>
        <CardBody>
          {expertiseData.length > 0 ? (
            <div className="space-y-4">
              {expertiseData.map((expertise) => (
                <div
                  key={expertise.tagId}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {expertise.tagName}
                    </span>
                    <ExpertiseBadge expertise={expertise} variant="full" size="sm" />
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {expertise.responseCount} responses
                    </span>
                  </div>
                </div>
              ))}
              <div className="text-center pt-2">
                <Link
                  to="/profile/expertise"
                  className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium"
                >
                  View Full Expertise
                </Link>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No domain expertise yet. Participate in discussions to build your expertise!
            </p>
          )}
        </CardBody>
      </Card>

      {/* Credentials Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Credentials</h2>
            <Button variant="primary" size="sm" onClick={() => setIsCredentialModalOpen(true)}>
              Add Credential
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {credentialsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : credentialsData.length > 0 ? (
            <div className="space-y-4">
              {credentialsData.map((credential) => (
                <div
                  key={credential.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {credential.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {credential.institution}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {CREDENTIAL_TYPE_LABELS[credential.type]} - {credential.tagName}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(credential.status)}`}
                    >
                      {CREDENTIAL_STATUS_LABELS[credential.status]}
                    </span>
                  </div>
                  {credential.expiresAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Expires: {formatDate(credential.expiresAt)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No credentials submitted yet. Add credentials to boost your expertise score.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Appeals Section - Show if there are appeals, cooldown is active, or user can submit */}
      {showAppealsSection && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Appeals</h2>
              {canSubmitAppeal && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAppealModalOpen(true)}
                  data-testid="submit-appeal-button"
                >
                  Submit Appeal
                </Button>
              )}
            </div>
          </CardHeader>
          <CardBody>
            {appealsData.length > 0 ? (
              <div className="space-y-4">
                {appealsData.map((appeal) => (
                  <div
                    key={appeal.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Submitted {formatDate(appeal.createdAt)}
                        </p>
                        <p className="text-gray-900 dark:text-gray-100 mt-1">{appeal.reason}</p>
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusClasses(appeal.status)}`}
                      >
                        {appeal.status.replace('_', ' ')}
                      </span>
                    </div>
                    {appeal.decisionReasoning && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <span className="font-medium">Decision:</span> {appeal.decisionReasoning}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : cooldownEndsAt ? (
              <div className="text-center py-4">
                <p className="text-gray-500 dark:text-gray-400">
                  Appeal cooldown active until {formatDate(cooldownEndsAt)}
                </p>
              </div>
            ) : canSubmitAppeal ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No appeals submitted yet. You can submit an appeal if you believe a moderation
                decision was incorrect.
              </p>
            ) : null}
          </CardBody>
        </Card>
      )}

      {/* Credential Submission Modal */}
      <Modal
        isOpen={isCredentialModalOpen}
        onClose={() => setIsCredentialModalOpen(false)}
        title="Add Credential"
        size="lg"
      >
        <CredentialSubmitForm
          tags={tags}
          onSubmit={handleCredentialSubmit}
          onSuccess={() => setIsCredentialModalOpen(false)}
          onCancel={() => setIsCredentialModalOpen(false)}
        />
      </Modal>

      {/* Appeal Submission Modal */}
      <Modal
        isOpen={isAppealModalOpen}
        onClose={() => {
          setIsAppealModalOpen(false);
          setAppealReason('');
          setAppealError(null);
        }}
        title="Submit Appeal"
        size="md"
      >
        <div className="space-y-4">
          {/* Error Banner */}
          {appealError && (
            <div
              className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 p-4"
              role="alert"
            >
              <p className="text-sm text-red-700 dark:text-red-300">{appealError}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="appeal-reason"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Reason for Appeal <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <textarea
              id="appeal-reason"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              disabled={isSubmittingAppeal}
              placeholder="Explain why you believe the moderation decision should be reconsidered..."
              rows={4}
              className={`
                w-full rounded-lg border px-4 py-2 text-base transition-colors
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-offset-1
                disabled:opacity-50 disabled:cursor-not-allowed
                border-gray-300 focus:border-primary-500 focus:ring-primary-500/20
                dark:border-gray-600 dark:focus:border-primary-400
              `}
              aria-required="true"
              data-testid="appeal-reason-textarea"
            />
            <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
              Please provide specific details about why you believe this decision was incorrect.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAppealModalOpen(false);
                setAppealReason('');
                setAppealError(null);
              }}
              disabled={isSubmittingAppeal}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleAppealSubmit}
              disabled={!appealReason.trim() || isSubmittingAppeal}
              isLoading={isSubmittingAppeal}
              className="flex-1"
              data-testid="submit-appeal-confirm-button"
            >
              {isSubmittingAppeal ? 'Submitting...' : 'Submit Appeal'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default RankingDashboard;
