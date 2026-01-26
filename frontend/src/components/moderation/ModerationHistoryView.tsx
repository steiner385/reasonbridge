/**
 * Moderation History View Component
 *
 * Displays a complete history of moderation actions with:
 * - Filterable list of all actions (pending, active, appealed, reversed)
 * - Sorting by date, type, severity, and status
 * - Pagination support
 * - Detailed action information
 * - Visual status and severity indicators
 */

import { useEffect, useState } from 'react';
import Card, { CardHeader, CardBody } from '../ui/Card';
import { getModerationActions } from '../../lib/moderation-api';
import type {
  ModerationAction,
  ModerationActionStatus,
  ModerationActionType,
  ModerationSeverity,
} from '../../types/moderation';

export interface ModerationHistoryViewProps {
  /**
   * Optional initial status filter
   */
  initialStatus?: ModerationActionStatus | 'all';
  /**
   * Optional page size (default: 20)
   */
  pageSize?: number;
}

type SortField = 'date' | 'type' | 'severity' | 'status';
type SortOrder = 'asc' | 'desc';

/**
 * ModerationHistoryView component
 */
export default function ModerationHistoryView({
  initialStatus = 'all',
  pageSize = 20,
}: ModerationHistoryViewProps) {
  const [actions, setActions] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ModerationActionStatus | 'all'>(initialStatus);
  const [severityFilter, setSeverityFilter] = useState<ModerationSeverity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ModerationActionType | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Load moderation history
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

        let filteredActions = response.data;

        // Filter by type if specified
        if (typeFilter !== 'all') {
          filteredActions = filteredActions.filter((a) => a.actionType === typeFilter);
        }

        // Filter by search term if provided
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          filteredActions = filteredActions.filter(
            (a) =>
              a.reasoning.toLowerCase().includes(term) ||
              a.id.toLowerCase().includes(term) ||
              a.targetId.toLowerCase().includes(term),
          );
        }

        // Sort actions
        filteredActions.sort((a, b) => {
          let aVal: string | number;
          let bVal: string | number;

          switch (sortField) {
            case 'date':
              aVal = new Date(a.createdAt).getTime();
              bVal = new Date(b.createdAt).getTime();
              break;
            case 'type':
              aVal = a.actionType;
              bVal = b.actionType;
              break;
            case 'severity':
              aVal = a.severity === 'consequential' ? 1 : 0;
              bVal = b.severity === 'consequential' ? 1 : 0;
              break;
            case 'status':
              aVal = a.status;
              bVal = b.status;
              break;
            default:
              aVal = new Date(a.createdAt).getTime();
              bVal = new Date(b.createdAt).getTime();
          }

          const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          return sortOrder === 'asc' ? comparison : -comparison;
        });

        setActions(filteredActions);
        setTotalPages(Math.ceil(response.total / pageSize));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load moderation history');
      } finally {
        setLoading(false);
      }
    };

    loadActions();
  }, [statusFilter, severityFilter, page, pageSize, typeFilter, searchTerm, sortField, sortOrder]);

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  // Format action type for display
  const formatActionType = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
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

  // Get type color class
  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'educate':
        return 'bg-blue-50 text-blue-900 border-blue-200';
      case 'warn':
        return 'bg-yellow-50 text-yellow-900 border-yellow-200';
      case 'hide':
        return 'bg-orange-50 text-orange-900 border-orange-200';
      case 'remove':
        return 'bg-red-50 text-red-900 border-red-200';
      case 'suspend':
        return 'bg-red-50 text-red-900 border-red-200';
      case 'ban':
        return 'bg-red-50 text-red-900 border-red-200';
      default:
        return 'bg-gray-50 text-gray-900 border-gray-200';
    }
  };

  if (error) {
    return (
      <Card>
        <CardBody>
          <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-700">{error}</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Filters</h2>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search actions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as ModerationActionStatus | 'all');
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="appealed">Appealed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as ModerationActionType | 'all');
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value as ModerationSeverity | 'all');
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All</option>
                <option value="non_punitive">Non-Punitive</option>
                <option value="consequential">Consequential</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="date">Date</option>
                  <option value="type">Type</option>
                  <option value="severity">Severity</option>
                  <option value="status">Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* History List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Moderation History ({actions.length} results)</h2>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
              <p className="text-gray-600 mt-3">Loading history...</p>
            </div>
          ) : actions.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No moderation actions found</p>
          ) : (
            <div className="space-y-3">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-3">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full border ${getSeverityColor(action.severity)}`}
                      >
                        {action.severity === 'consequential' ? 'Consequential' : 'Non-Punitive'}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full border ${getTypeColor(action.actionType)}`}
                      >
                        {formatActionType(action.actionType)}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(action.status)}`}
                      >
                        {formatActionType(action.status)}
                      </span>
                      {action.aiRecommended && (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full border bg-purple-100 text-purple-800 border-purple-200">
                          AI Recommended
                          {action.aiConfidence && ` (${Math.round(action.aiConfidence * 100)}%)`}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(action.createdAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Target</p>
                      <p className="text-sm text-gray-800">
                        {action.targetType}: {action.targetId}
                      </p>
                    </div>
                    {action.approvedById && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Approved By</p>
                        <p className="text-sm text-gray-800">{action.approvedById}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Reasoning</p>
                    <p className="text-sm text-gray-700">{action.reasoning}</p>
                  </div>

                  {action.executedAt && (
                    <div className="mt-2 text-xs text-gray-500">
                      Executed: {formatDate(action.executedAt)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
