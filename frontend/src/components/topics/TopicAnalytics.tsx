/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T042 [US5] - Topic Analytics Component (Feature 016)
 *
 * Displays topic participation and engagement metrics:
 * - Summary cards (total views, responses, participants)
 * - Line charts for views, responses, participants over time
 * - Engagement trend indicator
 * - Growth percentages
 */

import { useState } from 'react';
import { useTopicAnalytics, type DailyAnalytics } from '../../hooks/useTopicAnalytics';

export interface TopicAnalyticsProps {
  topicId: string;
}

function SummaryCard({
  title,
  value,
  growth,
  icon,
}: {
  title: string;
  value: string | number;
  growth?: number;
  icon: React.ReactNode;
}) {
  const growthColor = growth
    ? growth > 0
      ? 'text-green-600'
      : growth < 0
        ? 'text-red-600'
        : 'text-gray-600'
    : 'text-gray-600';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {growth !== undefined && (
            <p className={`text-xs ${growthColor} mt-1`}>
              {growth > 0 ? '+' : ''}
              {growth.toFixed(1)}% from prev period
            </p>
          )}
        </div>
        <div className="text-blue-600">{icon}</div>
      </div>
    </div>
  );
}

function SimpleLineChart({
  data,
  dataKey,
  label,
  color = '#3b82f6',
}: {
  data: DailyAnalytics[];
  dataKey: keyof DailyAnalytics;
  label: string;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">No data available</div>
    );
  }

  // Find min and max values for scaling
  const values = data.map((d) => Number(d[dataKey]) || 0);
  const maxValue = Math.max(...values, 1); // Ensure at least 1 to avoid division by zero
  const minValue = Math.min(...values);

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 30, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Generate points for the line
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1 || 1)) * chartWidth + padding.left;
      const value = Number(d[dataKey]) || 0;
      const y =
        chartHeight - ((value - minValue) / (maxValue - minValue || 1)) * chartHeight + padding.top;
      return `${x},${y}`;
    })
    .join(' ');

  // Generate grid lines (5 horizontal lines)
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const y = (i / 4) * chartHeight + padding.top;
    const value = maxValue - (i / 4) * (maxValue - minValue);
    return { y, value };
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{label}</h4>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={width - padding.right}
              y2={line.y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={line.y + 4}
              textAnchor="end"
              className="text-xs fill-gray-500"
            >
              {Math.round(line.value)}
            </text>
          </g>
        ))}

        {/* X-axis labels (show first, middle, last dates) */}
        {[0, Math.floor(data.length / 2), data.length - 1].map((i) => {
          const dataPoint = data[i];
          if (i >= data.length || !dataPoint) return null;
          const x = (i / (data.length - 1 || 1)) * chartWidth + padding.left;
          const date = new Date(dataPoint.date);
          const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          return (
            <text
              key={i}
              x={x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
            >
              {label}
            </text>
          );
        })}

        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((d, i) => {
          const x = (i / (data.length - 1 || 1)) * chartWidth + padding.left;
          const value = Number(d[dataKey]) || 0;
          const y =
            chartHeight -
            ((value - minValue) / (maxValue - minValue || 1)) * chartHeight +
            padding.top;
          return (
            <circle key={i} cx={x} cy={y} r="3" fill={color} className="hover:r-5 transition-all">
              <title>{`${d.date}: ${value}`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

export function TopicAnalytics({ topicId }: TopicAnalyticsProps) {
  const [daysBack, setDaysBack] = useState(30);
  const { data, isLoading, error } = useTopicAnalytics(topicId, daysBack);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-red-600 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Failed to load analytics</p>
            <p className="text-sm text-red-700 mt-1">{error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { summary, dailyMetrics, trends } = data;

  // Engagement trend icon
  const getTrendIcon = () => {
    switch (trends.engagementTrend) {
      case 'increasing':
        return (
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
        );
      case 'decreasing':
        return (
          <svg
            className="w-5 h-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-5 h-5 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
          </svg>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Topic Analytics</h3>
        <select
          value={daysBack}
          onChange={(e) => setDaysBack(Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Views"
          value={summary.totalViews.toLocaleString()}
          growth={trends.viewsGrowth}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          }
        />

        <SummaryCard
          title="Total Responses"
          value={summary.totalResponses.toLocaleString()}
          growth={trends.responsesGrowth}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          }
        />

        <SummaryCard
          title="Total Participants"
          value={summary.totalParticipants.toLocaleString()}
          growth={trends.participantsGrowth}
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          }
        />

        <SummaryCard
          title="Engagement Score"
          value={`${summary.avgEngagementScore.toFixed(1)}/100`}
          icon={
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className="text-xs font-medium capitalize">{trends.engagementTrend}</span>
            </div>
          }
        />
      </div>

      {/* Charts */}
      <div className="space-y-4">
        <SimpleLineChart
          data={dailyMetrics}
          dataKey="viewCount"
          label="Views Over Time"
          color="#3b82f6"
        />

        <SimpleLineChart
          data={dailyMetrics}
          dataKey="responseCount"
          label="Responses Over Time"
          color="#10b981"
        />

        <SimpleLineChart
          data={dailyMetrics}
          dataKey="participantCount"
          label="Participants Over Time"
          color="#f59e0b"
        />

        <SimpleLineChart
          data={dailyMetrics}
          dataKey="engagementScore"
          label="Engagement Score Over Time"
          color="#8b5cf6"
        />
      </div>

      {/* Additional Insights */}
      {dailyMetrics.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Insights</h4>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • Peak activity typically occurs around{' '}
              {dailyMetrics.find((m) => m.peakActivityHour)?.peakActivityHour || 'N/A'}:00
            </li>
            <li>
              • Average response length:{' '}
              {Math.round(
                dailyMetrics.reduce((sum, m) => sum + m.avgResponseLength, 0) / dailyMetrics.length,
              )}{' '}
              characters
            </li>
            <li>• Engagement trend is {trends.engagementTrend} compared to previous period</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default TopicAnalytics;
