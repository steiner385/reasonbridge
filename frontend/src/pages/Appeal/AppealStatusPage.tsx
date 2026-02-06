/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Appeal Status Page
 *
 * Displays the status of user appeals against moderation actions.
 * Allows users to:
 * - View all their appeals
 * - Check appeal status (pending, under_review, upheld, denied)
 * - View original moderation action details
 * - See moderator decisions and reasoning
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getAppeals, getModerationAction } from '../../lib/moderation-api';
import type { Appeal, ModerationAction, AppealStatus } from '../../types/moderation';

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: AppealStatus }) {
  const statusConfig: Record<AppealStatus, { label: string; className: string }> = {
    pending: {
      label: 'Pending Review',
      className: 'bg-yellow-100 text-yellow-800',
    },
    under_review: {
      label: 'Under Review',
      className: 'bg-blue-100 text-blue-800',
    },
    upheld: {
      label: 'Upheld',
      className: 'bg-green-100 text-green-800',
    },
    denied: {
      label: 'Denied',
      className: 'bg-red-100 text-red-800',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}

/**
 * Appeal detail card component
 */
function AppealDetailCard({
  appeal,
  moderationAction,
  isExpanded,
  onToggle,
}: {
  appeal: Appeal;
  moderationAction: ModerationAction | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className="mb-4">
      <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div>
              <div className="font-semibold text-gray-900">Appeal {appeal.id.slice(0, 8)}</div>
              <div className="text-sm text-gray-600">
                Submitted {new Date(appeal.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          <StatusBadge status={appeal.status} />
          <span className="ml-4 text-gray-600">{isExpanded ? '▼' : '▶'}</span>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardBody className="border-t border-gray-200">
          <div className="space-y-4">
            {/* Appeal Details */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Appeal Details</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div>
                  <div className="text-sm text-gray-600">Your Reason for Appeal</div>
                  <p className="text-gray-900">{appeal.reason}</p>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Submitted</div>
                  <p className="text-gray-900">{new Date(appeal.createdAt).toLocaleString()}</p>
                </div>
                {appeal.resolvedAt && (
                  <div>
                    <div className="text-sm text-gray-600">Resolved</div>
                    <p className="text-gray-900">{new Date(appeal.resolvedAt).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Original Moderation Action */}
            {moderationAction && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Original Moderation Action</h3>
                <div className="bg-blue-50 p-4 rounded-lg space-y-2 border border-blue-200">
                  <div>
                    <div className="text-sm text-gray-600">Action Type</div>
                    <p className="text-gray-900 capitalize">{moderationAction.actionType}</p>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Severity</div>
                    <p className="text-gray-900 capitalize">
                      {moderationAction.severity === 'non_punitive'
                        ? 'Non-Punitive'
                        : 'Consequential'}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Reasoning</div>
                    <p className="text-gray-900">{moderationAction.reasoning}</p>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">AI Recommended</div>
                    <p className="text-gray-900">
                      {moderationAction.aiRecommended ? 'Yes' : 'No'}
                      {moderationAction.aiConfidence &&
                        ` (${(moderationAction.aiConfidence * 100).toFixed(0)}% confidence)`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Decision (if resolved) */}
            {appeal.status !== 'pending' &&
              appeal.status !== 'under_review' &&
              appeal.decisionReasoning && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Moderator Decision</h3>
                  <div
                    className={`p-4 rounded-lg ${
                      appeal.status === 'upheld'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="mb-2">
                      <div className="text-sm text-gray-600">Decision</div>
                      <p className="text-gray-900 font-semibold capitalize">
                        {appeal.status === 'upheld' ? 'Original action upheld' : 'Appeal denied'}
                      </p>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Reasoning</div>
                      <p className="text-gray-900">{appeal.decisionReasoning}</p>
                    </div>
                  </div>
                </div>
              )}

            {/* Status Message */}
            {(appeal.status === 'pending' || appeal.status === 'under_review') && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  {appeal.status === 'pending'
                    ? 'Your appeal is awaiting review by our moderation team.'
                    : 'Your appeal is currently under review. We will notify you once a decision has been made.'}
                </p>
              </div>
            )}
          </div>
        </CardBody>
      )}
    </Card>
  );
}

/**
 * AppealStatusPage component
 */
export default function AppealStatusPage() {
  const [searchParams] = useSearchParams();
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [appealDetails, setAppealDetails] = useState<Map<string, ModerationAction>>(new Map());
  const [expandedAppealId, setExpandedAppealId] = useState<string | null>(
    searchParams.get('appeal'),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AppealStatus | 'all'>('all');

  // Load appeals on mount
  useEffect(() => {
    const loadAppeals = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getAppeals(filterStatus === 'all' ? {} : { status: filterStatus });
        setAppeals(response.appeals);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load appeals');
      } finally {
        setLoading(false);
      }
    };

    loadAppeals();
  }, [filterStatus]);

  // Load moderation action details for expanded appeal
  useEffect(() => {
    const loadModerationAction = async () => {
      if (!expandedAppealId) return;

      const appeal = appeals.find((a) => a.id === expandedAppealId);
      if (!appeal || appealDetails.has(expandedAppealId)) return;

      try {
        const action = await getModerationAction(appeal.moderationActionId);
        setAppealDetails((prev) => new Map(prev).set(expandedAppealId, action));
      } catch {
        // Silently fail - details not critical
      }
    };

    loadModerationAction();
  }, [expandedAppealId, appeals, appealDetails]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Loading appeals...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Appeal Status</h1>
        <p className="text-gray-600">Track the status of your appeals against moderation actions</p>
      </div>

      {error && (
        <Card className="mb-6 bg-red-50 border border-red-200">
          <CardBody>
            <p className="text-red-800">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'pending', 'under_review', 'upheld', 'denied'] as const).map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? 'primary' : 'outline'}
            onClick={() => setFilterStatus(status)}
            size="sm"
          >
            {status === 'all'
              ? 'All Appeals'
              : status === 'under_review'
                ? 'Under Review'
                : status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Appeals List */}
      {appeals.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-gray-600 mb-2">No appeals found</p>
              <p className="text-sm text-gray-500">
                {filterStatus === 'all'
                  ? 'You have not submitted any appeals.'
                  : `You have no ${filterStatus} appeals.`}
              </p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {appeals.map((appeal) => (
            <AppealDetailCard
              key={appeal.id}
              appeal={appeal}
              moderationAction={appealDetails.get(appeal.id) || null}
              isExpanded={expandedAppealId === appeal.id}
              onToggle={() =>
                setExpandedAppealId(expandedAppealId === appeal.id ? null : appeal.id)
              }
            />
          ))}
        </div>
      )}

      {/* Help Section */}
      <Card className="mt-8 bg-blue-50 border border-blue-200">
        <CardHeader>
          <h3 className="font-semibold text-blue-900">What happens next?</h3>
        </CardHeader>
        <CardBody className="text-sm text-blue-900 space-y-2">
          <p>
            • <strong>Pending:</strong> Your appeal has been received and is waiting to be reviewed
          </p>
          <p>
            • <strong>Under Review:</strong> Our moderation team is actively reviewing your appeal
          </p>
          <p>
            • <strong>Upheld:</strong> The original moderation action has been confirmed
          </p>
          <p>
            • <strong>Denied:</strong> Your appeal has been reviewed and the decision has been made
          </p>
          <p className="mt-4">
            You will receive a notification when your appeal has been reviewed. If you have
            questions, please contact our support team.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
