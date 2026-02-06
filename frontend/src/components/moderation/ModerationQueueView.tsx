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
import {
  getModerationActions,
  approveModerationAction,
  rejectModerationAction,
} from '../../lib/moderation-api';
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

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Action states
  const [processingActionId, setProcessingActionId] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);

  // Load actions
  useEffect(() => {
    const loadActions = async () => {
      try {
        setLoading(true);
        setError(null);

        const options: {
          status?: ModerationActionStatus;
          severity?: ModerationSeverity;
          page?: number;
          pageSize?: number;
        } = {
          page,
          pageSize,
        };

        if (statusFilter !== 'all') {
          options.status = statusFilter;
        }
        if (severityFilter !== 'all') {
          options.severity = severityFilter;
        }

        const response = await getModerationActions(options);

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
  }, [statusFilter, severityFilter, actionTypeFilter, page, sortField, sortOrder]);

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

  // Handle action rejection
  const handleReject = async (actionId: string) => {
    try {
      setProcessingActionId(actionId);
      setProcessingAction('reject');
      const updatedAction = await rejectModerationAction(actionId);
      setActions(actions.filter((a) => a.id !== actionId));
      onActionUpdated?.(updatedAction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject action');
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
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Status
              </label>
              <select
                id="queue-status-filter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ModerationActionStatus | 'all');
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
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
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Severity
              </label>
              <select
                id="queue-severity-filter"
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value as ModerationSeverity | 'all');
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
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
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Action Type
              </label>
              <select
                id="queue-action-type-filter"
                value={actionTypeFilter}
                onChange={(e) => {
                  setActionTypeFilter(e.target.value as ModerationActionType | 'all');
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
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
            <div className="text-sm text-gray-600">
              {actions.length} action{actions.length !== 1 ? 's' : ''} shown
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              <p className="text-gray-600 mt-3">Loading queue...</p>
            </div>
          ) : actions.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No actions to review</p>
          ) : (
            <div className="space-y-3">
              {/* Sort Controls */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => toggleSort('createdAt')}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    sortField === 'createdAt'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Date {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => toggleSort('severity')}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                    sortField === 'severity'
                      ? 'bg-primary-50 border-primary-300 text-primary-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
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
                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full border ${getSeverityColor(action.severity)}`}
                        >
                          {action.severity.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                          {formatActionType(action.actionType)}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(action.status)}`}
                        >
                          {action.status}
                        </span>
                        {action.aiRecommended && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-purple-100 text-purple-800 border-purple-200">
                            AI Recommended
                            {action.aiConfidence && ` (${Math.round(action.aiConfidence * 100)}%)`}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatDate(action.createdAt)}
                      </span>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-900 font-medium mb-1">
                        Target: {action.targetType}
                      </p>
                      <p className="text-sm text-gray-700">{action.reasoning}</p>
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
                          onClick={() => handleReject(action.id)}
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

      {/* Pagination */}
      {actions.length > 0 && (
        <div className="flex justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm text-gray-600">Page {page}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={actions.length < pageSize}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
