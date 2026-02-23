/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Safety Reports Page
 *
 * Administrative interface for managing CSAM reports and NCMEC compliance.
 * This page is restricted to authorized child safety moderators only.
 *
 * Features:
 * - View pending CSAM reports with deadline tracking
 * - Submit reports to NCMEC
 * - Track evidence preservation status
 * - Audit trail for compliance
 */

import { useEffect, useState } from 'react';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import {
  getCsamReports,
  getSafetyReportsStats,
  updateCsamReportStatus,
  submitToNcmec,
} from '../../lib/moderation-api';
import type { CsamReport, CsamReportStatus, SafetyReportsStats } from '../../types/moderation';

/**
 * SafetyReportsPage component
 */
export default function SafetyReportsPage() {
  const [stats, setStats] = useState<SafetyReportsStats | null>(null);
  const [reports, setReports] = useState<CsamReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<CsamReportStatus | 'all'>('PENDING_REVIEW');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, reportsData] = await Promise.all([
          getSafetyReportsStats(),
          getCsamReports(statusFilter === 'all' ? {} : { status: statusFilter }),
        ]);

        setStats(statsData);
        setReports(reportsData.reports);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load safety reports data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [statusFilter]);

  // Handle NCMEC submission
  const handleSubmitToNcmec = async (reportId: string) => {
    try {
      setProcessingId(reportId);
      await submitToNcmec(reportId);
      // Refresh the list
      const reportsData = await getCsamReports(
        statusFilter === 'all' ? {} : { status: statusFilter },
      );
      setReports(reportsData.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit to NCMEC');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle status update
  const handleStatusUpdate = async (reportId: string, newStatus: CsamReportStatus) => {
    try {
      setProcessingId(reportId);
      await updateCsamReportStatus(reportId, newStatus);
      // Refresh the list
      const reportsData = await getCsamReports(
        statusFilter === 'all' ? {} : { status: statusFilter },
      );
      setReports(reportsData.reports);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setProcessingId(null);
    }
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

  // Calculate time remaining until deadline
  const getDeadlineStatus = (deadline: string): { text: string; isUrgent: boolean } => {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) {
      return { text: 'OVERDUE', isUrgent: true };
    } else if (hoursRemaining < 6) {
      return { text: `${Math.floor(hoursRemaining)}h remaining`, isUrgent: true };
    } else if (hoursRemaining < 24) {
      return { text: `${Math.floor(hoursRemaining)}h remaining`, isUrgent: false };
    } else {
      const days = Math.floor(hoursRemaining / 24);
      return { text: `${days}d remaining`, isUrgent: false };
    }
  };

  // Get status color
  const getStatusColor = (status: CsamReportStatus): string => {
    switch (status) {
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'EVIDENCE_PRESERVED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SUBMITTED_NCMEC':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CONFIRMED':
        return 'bg-green-200 text-green-900 border-green-300';
      case 'REJECTED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get detection source label
  const getDetectionSourceLabel = (source: string): string => {
    switch (source) {
      case 'AI_DETECTION':
        return 'AI Detection';
      case 'USER_REPORT':
        return 'User Report';
      case 'MODERATOR_REVIEW':
        return 'Moderator Review';
      case 'HASH_MATCH':
        return 'Hash Match';
      default:
        return source;
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
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setError(null)}>
                Dismiss
              </Button>
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Safety Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">
          CSAM report management and NCMEC compliance tracking
        </p>
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Legal Notice:</strong> All reports must be submitted to NCMEC within 24 hours of
            detection as required by 18 U.S.C. 2258A. Evidence is preserved with legal hold.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {loading ? (
        <Card className="mb-6">
          <CardBody>
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              <p className="text-gray-600 dark:text-gray-400 mt-3">Loading statistics...</p>
            </div>
          </CardBody>
        </Card>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardBody>
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {stats.totalPending}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Pending Review</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-700 mb-1">{stats.approachingDeadline}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Approaching Deadline</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-700 mb-1">{stats.submittedToday}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Submitted Today</p>
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-700 mb-1">{stats.awaitingEvidence}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Awaiting Evidence</p>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}

      {/* Reports List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">CSAM Reports</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as CsamReportStatus | 'all')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="EVIDENCE_PRESERVED">Evidence Preserved</option>
              <option value="SUBMITTED_NCMEC">Submitted to NCMEC</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              <p className="text-gray-600 dark:text-gray-400 mt-3">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">No reports found</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const deadlineStatus = getDeadlineStatus(report.ncmecDeadline);

                return (
                  <div
                    key={report.id}
                    className={`p-4 border rounded-lg ${
                      deadlineStatus.isUrgent
                        ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex gap-2 flex-wrap">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(report.status)}`}
                        >
                          {report.status.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-600">
                          {getDetectionSourceLabel(report.detectionSource)}
                        </span>
                        {report.aiConfidenceScore && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-purple-100 text-purple-800 border-purple-200">
                            AI: {Math.round(report.aiConfidenceScore * 100)}%
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-xs font-bold ${
                            deadlineStatus.isUrgent
                              ? 'text-red-700'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {deadlineStatus.text}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Created: {formatDate(report.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Content Type:</span>
                        <span className="ml-2 text-gray-900 dark:text-gray-100">
                          {report.contentType}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Content ID:</span>
                        <span className="ml-2 font-mono text-xs text-gray-900 dark:text-gray-100">
                          {report.contentId.slice(0, 8)}...
                        </span>
                      </div>
                      {report.evidenceHash && (
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">Evidence Hash:</span>
                          <span className="ml-2 font-mono text-xs text-gray-900 dark:text-gray-100">
                            {report.evidenceHash.slice(0, 16)}...
                          </span>
                        </div>
                      )}
                      {report.ncmecReportId && (
                        <div className="col-span-2">
                          <span className="text-gray-500 dark:text-gray-400">NCMEC Report ID:</span>
                          <span className="ml-2 font-mono text-gray-900 dark:text-gray-100">
                            {report.ncmecReportId}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      {report.status === 'PENDING_REVIEW' && (
                        <>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleStatusUpdate(report.id, 'EVIDENCE_PRESERVED')}
                            disabled={processingId === report.id}
                          >
                            {processingId === report.id ? 'Processing...' : 'Preserve Evidence'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(report.id, 'REJECTED')}
                            disabled={processingId === report.id}
                          >
                            Reject (False Positive)
                          </Button>
                        </>
                      )}
                      {report.status === 'EVIDENCE_PRESERVED' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleSubmitToNcmec(report.id)}
                          disabled={processingId === report.id}
                        >
                          {processingId === report.id ? 'Submitting...' : 'Submit to NCMEC'}
                        </Button>
                      )}
                      {report.status === 'SUBMITTED_NCMEC' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleStatusUpdate(report.id, 'CONFIRMED')}
                          disabled={processingId === report.id}
                        >
                          {processingId === report.id ? 'Processing...' : 'Mark Confirmed'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
