/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Moderation Dashboard Page
 *
 * Displays moderation overview with:
 * - Queue statistics and pending actions
 * - Recent moderation actions
 * - Recent appeals
 * - Action type distribution
 */

import { useEffect, useState } from 'react';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ModerationQueueView } from '../../components/moderation';
import {
  getModerationActions,
  getAppeals,
  getQueueStats,
  approveModerationAction,
  rejectModerationAction,
  reviewAppeal,
} from '../../lib/moderation-api';
import type {
  ModerationAction,
  Appeal,
  QueueStats,
  ModerationActionStatus,
} from '../../types/moderation';

/**
 * ModerationDashboardPage component
 */
export default function ModerationDashboardPage() {
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'actions' | 'appeals' | 'queue'>(
    'overview',
  );
  const [actionFilter, setActionFilter] = useState<ModerationActionStatus | 'all'>('pending');
  const [approvingActionId, setApprovingActionId] = useState<string | null>(null);
  const [rejectingActionId, setRejectingActionId] = useState<string | null>(null);
  const [reviewingAppealId, setReviewingAppealId] = useState<string | null>(null);

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [statsData, actionsData, appealsData] = await Promise.all([
          getQueueStats(),
          getModerationActions(actionFilter === 'all' ? {} : { status: actionFilter }),
          getAppeals({ status: 'pending' }),
        ]);

        setStats(statsData);
        setActions(actionsData.data);
        setAppeals(appealsData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load moderation data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [actionFilter]);

  // Handle action approval
  const handleApproveAction = async (actionId: string) => {
    try {
      setApprovingActionId(actionId);
      await approveModerationAction(actionId);
      setActions(actions.filter((a) => a.id !== actionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve action');
    } finally {
      setApprovingActionId(null);
    }
  };

  // Handle action rejection
  const handleRejectAction = async (actionId: string) => {
    try {
      setRejectingActionId(actionId);
      await rejectModerationAction(actionId);
      setActions(actions.filter((a) => a.id !== actionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject action');
    } finally {
      setRejectingActionId(null);
    }
  };

  // Handle appeal review (upheld)
  const handleUpholdAppeal = async (appealId: string) => {
    try {
      setReviewingAppealId(appealId);
      await reviewAppeal(appealId, 'upheld');
      setAppeals(appeals.filter((a) => a.id !== appealId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to uphold appeal');
    } finally {
      setReviewingAppealId(null);
    }
  };

  // Handle appeal review (denied)
  const handleDenyAppeal = async (appealId: string) => {
    try {
      setReviewingAppealId(appealId);
      await reviewAppeal(appealId, 'denied');
      setAppeals(appeals.filter((a) => a.id !== appealId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny appeal');
    } finally {
      setReviewingAppealId(null);
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

  // Get appeal status color class
  const getAppealStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'under_review':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'upheld':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'denied':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
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
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Moderation Dashboard</h1>
        <p className="text-gray-600">Monitor and manage moderation actions and appeals</p>
      </div>

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Moderation dashboard sections"
        className="flex gap-2 mb-6 border-b border-gray-200"
      >
        <button
          role="tab"
          aria-selected={activeTab === 'overview'}
          aria-controls="panel-overview"
          id="tab-overview"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'overview'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Overview
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'queue'}
          aria-controls="panel-queue"
          id="tab-queue"
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'queue'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Queue
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'actions'}
          aria-controls="panel-actions"
          id="tab-actions"
          onClick={() => setActiveTab('actions')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'actions'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Actions
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'appeals'}
          aria-controls="panel-appeals"
          id="tab-appeals"
          onClick={() => setActiveTab('appeals')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'appeals'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Appeals
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          className="space-y-6"
        >
          {loading ? (
            <Card>
              <CardBody>
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                  <p className="text-gray-600 mt-3">Loading dashboard...</p>
                </div>
              </CardBody>
            </Card>
          ) : stats ? (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardBody>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-gray-900 mb-1">
                        {stats.totalPending ?? 0}
                      </p>
                      <p className="text-sm text-gray-600">Pending Actions</p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-red-600 mb-1">
                        {stats.criticalActions ?? 0}
                      </p>
                      <p className="text-sm text-gray-600">Critical Actions</p>
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-gray-900 mb-1">
                        {stats.avgReviewTimeMinutes != null
                          ? Math.round(stats.avgReviewTimeMinutes)
                          : 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">Avg Review Time (min)</p>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Action Type Distribution */}
              {stats.pendingByType && Object.keys(stats.pendingByType).length > 0 && (
                <Card>
                  <CardHeader>
                    <h2 className="text-xl font-semibold">Pending Actions by Type</h2>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-3">
                      {Object.entries(stats.pendingByType).map(([type, count]) => (
                        <div key={type}>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">
                              {formatActionType(type)}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">{count}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-primary-500 h-2 rounded-full"
                              style={{
                                width: `${stats.totalPending > 0 ? (count / stats.totalPending) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}

              {/* Recent Actions */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Recent Pending Actions</h2>
                </CardHeader>
                <CardBody>
                  {actions.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending actions</p>
                  ) : (
                    <div className="space-y-4">
                      {actions.slice(0, 5).map((action) => (
                        <div key={action.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-full border ${getSeverityColor(action.severity)}`}
                              >
                                {action.severity}
                              </span>
                              <span className="ml-2 text-xs font-semibold px-2 py-1 rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                                {formatActionType(action.actionType)}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(action.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{action.reasoning}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleApproveAction(action.id)}
                              disabled={approvingActionId === action.id}
                            >
                              {approvingActionId === action.id ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectAction(action.id)}
                              disabled={rejectingActionId === action.id}
                            >
                              {rejectingActionId === action.id ? 'Rejecting...' : 'Reject'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Recent Appeals */}
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-semibold">Recent Appeals</h2>
                </CardHeader>
                <CardBody>
                  {appeals.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No pending appeals</p>
                  ) : (
                    <div className="space-y-4">
                      {appeals.slice(0, 5).map((appeal) => (
                        <div key={appeal.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-start justify-between mb-2">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full border ${getAppealStatusColor(appeal.status)}`}
                            >
                              {appeal.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatDate(appeal.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">{appeal.reason}</p>
                          {appeal.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleUpholdAppeal(appeal.id)}
                                disabled={reviewingAppealId === appeal.id}
                              >
                                {reviewingAppealId === appeal.id
                                  ? 'Processing...'
                                  : 'Uphold Appeal'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDenyAppeal(appeal.id)}
                                disabled={reviewingAppealId === appeal.id}
                              >
                                {reviewingAppealId === appeal.id ? 'Processing...' : 'Deny Appeal'}
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </>
          ) : null}
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div id="panel-queue" role="tabpanel" aria-labelledby="tab-queue">
          <ModerationQueueView initialStatus="pending" />
        </div>
      )}

      {/* Actions Tab */}
      {activeTab === 'actions' && (
        <div id="panel-actions" role="tabpanel" aria-labelledby="tab-actions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Moderation Actions</h2>
                <select
                  value={actionFilter}
                  onChange={(e) =>
                    setActionFilter(e.target.value as ModerationActionStatus | 'all')
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="appealed">Appealed</option>
                  <option value="reversed">Reversed</option>
                </select>
              </div>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                  <p className="text-gray-600 mt-3">Loading actions...</p>
                </div>
              ) : actions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No actions found</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {actions.map((action) => (
                    <div
                      key={action.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex gap-2">
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full border ${getSeverityColor(action.severity)}`}
                          >
                            {action.severity}
                          </span>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-gray-100 text-gray-800 border-gray-200">
                            {formatActionType(action.actionType)}
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(action.status)}`}
                          >
                            {action.status}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(action.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{action.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Appeals Tab */}
      {activeTab === 'appeals' && (
        <div id="panel-appeals" role="tabpanel" aria-labelledby="tab-appeals" className="space-y-4">
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Appeals</h2>
            </CardHeader>
            <CardBody>
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
                  <p className="text-gray-600 mt-3">Loading appeals...</p>
                </div>
              ) : appeals.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No appeals found</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {appeals.map((appeal) => (
                    <div
                      key={appeal.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full border ${getAppealStatusColor(appeal.status)}`}
                        >
                          {appeal.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(appeal.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">{appeal.reason}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
