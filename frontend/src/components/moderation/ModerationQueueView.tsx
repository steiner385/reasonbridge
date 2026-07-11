/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Moderation Queue View Component
 *
 * Displays a comprehensive queue of pending moderation actions with:
 * - Filtering by status, severity, action type
 * - Sorting by date, severity, etc.
 * - Pagination for large queues
 * - Quick action buttons (approve/reject)
 * - Detailed action information
 */

import { useEffect, useState } from 'react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Tooltip } from '../ui/Tooltip';
import {
  getModerationActions,
  approveModerationAction,
  rejectModerationAction,
} from '../../lib/moderation-api';
import { getModerationStatusDescription } from '../../lib/statusDescriptions';
import type {
  ModerationAction,
  ModerationActionStatus,
  ModerationActionType,
  ModerationSeverity,
} from '../../types/moderation';

export interface ModerationQueueViewProps {
  /**
   * Initial filter for status
   */
  initialStatus?: ModerationActionStatus;
  /**
   * Callback when an action is updated
   */
  onActionUpdated?: (action: ModerationAction) => void;
}

type SortField = 'createdAt' | 'severity';
type SortOrder = 'asc' | 'desc';

/**
 * ModerationQueueView component
 */
export default function ModerationQueueView({
  initialStatus = 'pending',
  onActionUpdated,
}: ModerationQueueViewProps) {
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<ModerationActionStatus | 'all'>(
    initialStatus || 'pending',
  );
  const [severityFilter, setSeverityFilter] = useState<ModerationSeverity | 'all'>('all');
  const [actionTypeFilter, setActionTypeFilter] = useState<ModerationActionType | 'all'>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Cursor-based pagination. The backend is cursor-based, not page-based, so we
  // track the current cursor, the next-page cursor it returns, and a stack of
  // prior cursors to support "Previous" (Issue #1397).
  const limit = 20;
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);

  // Action states
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);

  // Reject-reason capture. The backend requires a non-empty reason (Issue #1393).
  const [rejectTarget, setRejectTarget] = useState<ModerationAction | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Load actions
  useEffect(() => {
    const loadActions = async () => {
      try {
        setLoading(true);
        setError(null);

        const options: {
          status?: ModerationActionStatus;
          severity?: ModerationSeverity;
          limit?: number;
          cursor?: string;
        } = {
          limit,
          ...(cursor ? { cursor } : {}),
        };

        if (statusFilter !== 'all') {
          options.status = statusFilter;
        }
        if (severityFilter !== 'all') {
          options.severity = severityFilter;
        }

        const response = await getModerationActions(options);
        setNextCursor(response.nextCursor);

        let filteredActions = response.actions;

        // Filter by action type if specified
        if (actionTypeFilter !== 'all') {
          filteredActions = filteredActions.filter((a) => a.actionType === actionTypeFilter);
        }

        // Sort actions
        const sorted = [...filteredActions].sort((a, b) => {
          let aVal: number | string;
          let bVal: number | string;

          if (sortField === 'severity') {
            // Sort severity: consequential > non_punitive
            const severityOrder: Record<ModerationSeverity, number> = {
              consequential: 1,
              non_punitive: 0,
            };
            aVal = severityOrder[a.severity];
            bVal = severityOrder[b.severity];
          } else if (sortField === 'createdAt') {
            aVal = new Date(a.createdAt).getTime();
            bVal = new Date(b.createdAt).getTime();
          } else {
            aVal = 0;
            bVal = 0;
          }

          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return sortOrder === 'desc' ? -comparison : comparison;
        });

        setActions(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load moderation queue');
      } finally {
        setLoading(false);
      }
    };

    loadActions();
  }, [statusFilter, severityFilter, actionTypeFilter, cursor, sortField, sortOrder]);

  // Reset pagination to the first page whenever a filter changes, so the cursor
  // stack never points into a differently-filtered result set.
  useEffect(() => {
    setCursor(undefined);
    setPrevCursors([]);
  }, [statusFilter, severityFilter, actionTypeFilter]);

  // Handle action approval
  const handleApprove = async (actionId: string) => {
    try {
      setProcessingActionId(actionId);
      setProcessingAction('approve');
      const updatedAction = await approveModerationAction(actionId);
      setActions(actions.filter((a) => a.id !== actionId));
      onActionUpdated?.(updatedAction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve action');
    } finally {
      setProcessingActionId(null);
      setProcessingAction(null);
    }
  };

  // Open the reject-reason modal for an action (the backend requires a reason,
  // Issue #1393).
  const openRejectModal = (action: ModerationAction) => {
    setRejectTarget(action);
    setRejectReason('');
    setRejectError(null);
  };

  // Confirm rejection with the entered reason.
  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectError('Please provide a reason for rejecting this action');
      return;
    }
    const actionId = rejectTarget.id;
    try {
      setProcessingActionId(actionId);
      setProcessingAction('reject');
      await rejectModerationAction(actionId, reason);
      setActions(actions.filter((a) => a.id !== actionId));
      onActionUpdated?.({ ...rejectTarget, status: 'reversed' });
      setRejectTarget(null);
      setRejectReason('');
    } catch (err) {
      setRejectError(err instanceof Error ? err.message : 'Failed to reject action');
    } finally {
      setProcessingActionId(null);
      setProcessingAction(null);
    }
  };

  // Format action type for display
  const formatActionType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  // Get severity color class
  const getSeverityColor = (severity: string): string => {
    if (severity === 'consequential') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  // Get status color class
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'appealed':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'reversed':
        return 'bg-gray-100 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <Card>
          <CardBody>
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
              <p className="text-red-700">{error}</p>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Queue Filters</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label
                htmlFor="queue-status-filter"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Status
              </label>
              <select
                id="queue-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ModerationActionStatus | 'all');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="appealed">Appealed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label
                htmlFor="queue-severity-filter"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Severity
              </label>
              <select
                id="queue-severity-filter"
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value as ModerationSeverity | 'all');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
              >
                <option value="all">All</option>
                <option value="non_punitive">Non-Punitive</option>
                <option value="consequential">Consequential</option>
              </select>
            </div>

            {/* Action Type Filter */}
            <div>
              <label
                htmlFor="queue-action-type-filter"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Action Type
              </label>
              <select
                id="queue-action-type-filter"
                value={actionTypeFilter}
                onChange={(e) => {
                  setActionTypeFilter(e.target.value as ModerationActionType | 'all');
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
              >
                <option value="all">All</option>
                <option value="educate">Educate</option>
                <option value="warn">Warn</option>
                <option value="hide">Hide</option>
                <option value="remove">Remove</option>
                <option value="suspend">Suspend</option>
                <option value="ban">Ban</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Moderation Queue</h2>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {actions.length} action{actions.length !== 1 ? 's' : ''} shown
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              <p className="text-gray-600 dark:text-gray-400 mt-3">Loading queue...</p>
            </div>
          ) : actions.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12">
              No actions to review
            </p>
          ) : (
            <div className="space-y-3">
              {/* Sort Controls */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => toggleSort('createdAt')}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    sortField === 'createdAt'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Date {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => toggleSort('severity')}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    sortField === 'severity'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  Severity {sortField === 'severity' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>

              {/* Actions List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full border ${getSeverityColor(action.severity)}`}
                        >
                          {action.severity.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-gray-100 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700">
                          {formatActionType(action.actionType)}
                        </span>
                        <Tooltip content={getModerationStatusDescription(action.status)}>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full border cursor-help ${getStatusColor(action.status)}`}
                          >
                            {action.status}
                          </span>
                        </Tooltip>
                        {action.aiRecommended && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-purple-100 text-purple-800 border-purple-200">
                            AI Recommended
                            {action.aiConfidence && ` (${Math.round(action.aiConfidence * 100)}%)`}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        {formatDate(action.createdAt)}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mb-1">
                        Target: {action.targetType}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{action.reasoning}</p>
                    </div>

                    {action.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleApprove(action.id)}
                          disabled={processingActionId === action.id}
                        >
                          {processingActionId === action.id && processingAction === 'approve'
                            ? 'Approving...'
                            : 'Approve'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openRejectModal(action)}
                          disabled={processingActionId === action.id}
                        >
                          {processingActionId === action.id && processingAction === 'reject'
                            ? 'Rejecting...'
                            : 'Reject'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination (cursor-based) */}
      {(prevCursors.length > 0 || nextCursor) && (
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setPrevCursors((stack) => {
                const next = [...stack];
                const previous = next.pop();
                setCursor(previous);
                return next;
              });
            }}
            disabled={prevCursors.length === 0 || loading}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (!nextCursor) return;
              setPrevCursors((stack) => [...stack, cursor ?? '']);
              setCursor(nextCursor);
            }}
            disabled={!nextCursor || loading}
          >
            Next
          </Button>
        </div>
      )}

      {/* Reject-reason modal (Issue #1393) */}
      <Modal
        isOpen={rejectTarget !== null}
        onClose={() => setRejectTarget(null)}
        title="Reject moderation action"
        size="md"
        showCloseButton={processingAction !== 'reject'}
        closeOnBackdropClick={processingAction !== 'reject'}
        closeOnEscape={processingAction !== 'reject'}
        footer={
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => setRejectTarget(null)}
              disabled={processingAction === 'reject'}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              isLoading={processingAction === 'reject'}
              disabled={processingAction === 'reject'}
            >
              Confirm Reject
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Rejecting dismisses this recommended action. Please explain why so there is a record of
            the decision.
          </p>
          {rejectError && (
            <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {rejectError}
            </div>
          )}
          <label htmlFor="queue-reject-reason" className="sr-only">
            Reason for rejection
          </label>
          <textarea
            id="queue-reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejecting this action"
            rows={4}
            disabled={processingAction === 'reject'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </Modal>
    </div>
  );
}
