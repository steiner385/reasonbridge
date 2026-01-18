import { useCommonGroundHistory } from '../../lib/useCommonGroundHistory';
import Card, { CardHeader, CardBody } from '../ui/Card';
import type { CommonGround } from '../../types/commonGround';

export interface CommonGroundHistoryProps {
  topicId: string;
  onVersionSelect?: (version: number) => void;
}

/**
 * Displays the history of common ground analyses for a topic,
 * showing changes over time as the discussion evolves.
 */
export function CommonGroundHistory({
  topicId,
  onVersionSelect,
}: CommonGroundHistoryProps) {
  const { data: history, isLoading, error } = useCommonGroundHistory(topicId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader title="Common Ground History" />
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">Loading history...</div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader title="Common Ground History" />
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-red-600">
              Error loading history: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader title="Common Ground History" />
        <CardBody>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">
              No common ground analysis available yet.
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Common Ground History"
        subtitle={`${history.length} version${history.length === 1 ? '' : 's'}`}
      />
      <CardBody>
        <div className="space-y-3">
          {history.map((item, index) => (
            <HistoryItem
              key={item.version}
              item={item}
              isLatest={index === 0}
              onClick={() => onVersionSelect?.(item.version)}
            />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

interface HistoryItemProps {
  item: CommonGround;
  isLatest: boolean;
  onClick?: () => void;
}

function HistoryItem({ item, isLatest, onClick }: HistoryItemProps) {
  const formattedDate = new Date(item.generatedAt).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const consensusColor = getConsensusColor(item.overallConsensusScore);

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md hover:border-primary-300' : ''
      } ${isLatest ? 'border-primary-300 bg-primary-50' : 'border-gray-200 bg-white'}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">
            Version {item.version}
          </span>
          {isLatest && (
            <span className="px-2 py-0.5 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
              Latest
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{formattedDate}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Participants:</div>
          <div className="text-sm font-medium text-gray-900">
            {item.participantCountAtGeneration}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-500">Responses:</div>
          <div className="text-sm font-medium text-gray-900">
            {item.responseCountAtGeneration}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Overall Consensus</span>
          <span className={`text-sm font-semibold ${consensusColor}`}>
            {Math.round(item.overallConsensusScore * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-gray-600">
              {item.agreementZones.length} agreement{item.agreementZones.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600">
              {item.misunderstandings.length} misunderstanding{item.misunderstandings.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-gray-600">
              {item.genuineDisagreements.length} disagreement{item.genuineDisagreements.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getConsensusColor(score: number): string {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-blue-600';
  if (score >= 0.4) return 'text-yellow-600';
  return 'text-red-600';
}

export default CommonGroundHistory;
