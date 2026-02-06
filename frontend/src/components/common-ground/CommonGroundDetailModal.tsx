/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import type { AgreementZone, Misunderstanding, Disagreement } from '../../types/common-ground';

/**
 * Detail type discriminator for the modal
 */
export type DetailType = 'agreementZone' | 'misunderstanding' | 'disagreement';

/**
 * Props for displaying an agreement zone
 */
interface AgreementZoneDetailProps {
  type: 'agreementZone';
  data: AgreementZone;
}

/**
 * Props for displaying a misunderstanding
 */
interface MisunderstandingDetailProps {
  type: 'misunderstanding';
  data: Misunderstanding;
}

/**
 * Props for displaying a disagreement
 */
interface DisagreementDetailProps {
  type: 'disagreement';
  data: Disagreement;
}

/**
 * Union type for detail content
 */
type DetailContent =
  | AgreementZoneDetailProps
  | MisunderstandingDetailProps
  | DisagreementDetailProps;

export interface CommonGroundDetailModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;

  /**
   * The detail content to display (null when closed)
   */
  detail: DetailContent | null;

  /**
   * Optional callback when navigating to a related item
   */
  onNavigateToRelated?: (type: DetailType, id: string) => void;
}

/**
 * Get consensus level styling
 */
const getConsensusStyles = (level: 'high' | 'medium' | 'low') => {
  const styles = {
    high: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      badge: 'bg-green-100 text-green-800',
      progress: 'bg-green-500',
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      badge: 'bg-yellow-100 text-yellow-800',
      progress: 'bg-yellow-500',
    },
    low: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-800',
      badge: 'bg-orange-100 text-orange-800',
      progress: 'bg-orange-500',
    },
  };

  return styles[level];
};

/**
 * Renders agreement zone details
 */
const AgreementZoneDetail: React.FC<{ zone: AgreementZone }> = ({ zone }) => {
  const styles = getConsensusStyles(zone.consensusLevel);

  return (
    <div className="space-y-6" data-testid="agreement-zone-detail">
      {/* Header */}
      <div className={`p-4 rounded-lg ${styles.bg} border ${styles.border}`}>
        <div className="flex items-center justify-between mb-2">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${styles.badge}`}
            data-testid="consensus-level"
          >
            {zone.consensusLevel.toUpperCase()} CONSENSUS
          </span>
          <span
            className="text-sm text-gray-600 dark:text-gray-400"
            data-testid="participant-count"
          >
            {zone.participantCount} participants
          </span>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mt-2">{zone.description}</p>
      </div>

      {/* Propositions */}
      {zone.propositions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Shared Propositions ({zone.propositions.length})
          </h4>
          <div className="space-y-3">
            {zone.propositions.map((prop) => (
              <div
                key={prop.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                data-testid="proposition-item"
              >
                <p className="text-gray-800 mb-3">{prop.text}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Agreement</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {prop.agreementPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${styles.progress} h-2 rounded-full transition-all duration-300`}
                    style={{ width: `${prop.agreementPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={prop.agreementPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <div className="mt-3 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    <span className="text-green-600 font-medium">
                      {prop.supportingParticipants.length}
                    </span>{' '}
                    supporting
                  </span>
                  <span>
                    <span className="text-red-600 font-medium">
                      {prop.opposingParticipants.length}
                    </span>{' '}
                    opposing
                  </span>
                  <span>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      {prop.neutralParticipants.length}
                    </span>{' '}
                    neutral
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Renders misunderstanding details
 */
const MisunderstandingDetail: React.FC<{ misunderstanding: Misunderstanding }> = ({
  misunderstanding,
}) => {
  return (
    <div className="space-y-6" data-testid="misunderstanding-detail">
      {/* Header */}
      <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
        <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-purple-100 text-purple-800">
          TERM CONFUSION
        </span>
        <p className="text-gray-700 dark:text-gray-300 mt-3">
          Participants are using the term <strong>"{misunderstanding.term}"</strong> with different
          meanings, which may be causing confusion in the discussion.
        </p>
      </div>

      {/* Definitions */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Different Definitions ({misunderstanding.definitions.length})
        </h4>
        <div className="space-y-3">
          {misunderstanding.definitions.map((def, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              data-testid="definition-item"
            >
              <blockquote className="text-gray-800 italic border-l-4 border-purple-300 pl-3 mb-3">
                "{def.definition}"
              </blockquote>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <span>
                  Used by <strong>{def.participants.length}</strong> participant(s)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clarification Suggestion */}
      {misunderstanding.clarificationSuggestion && (
        <div
          className="bg-blue-50 border border-blue-200 rounded-lg p-4"
          data-testid="clarification-suggestion"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Suggested Clarification</h4>
              <p className="text-sm text-blue-800">{misunderstanding.clarificationSuggestion}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Renders disagreement details
 */
const DisagreementDetail: React.FC<{ disagreement: Disagreement }> = ({ disagreement }) => {
  return (
    <div className="space-y-6" data-testid="disagreement-detail">
      {/* Header */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
        <span className="inline-block text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800">
          VALUE DIFFERENCE
        </span>
        <p className="text-gray-700 dark:text-gray-300 mt-3">{disagreement.description}</p>
      </div>

      {/* Positions */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Different Positions ({disagreement.positions.length})
        </h4>
        <div className="space-y-4">
          {disagreement.positions.map((position, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              data-testid="position-item"
            >
              <div className="flex items-start justify-between mb-3">
                <h5 className="font-medium text-gray-900 dark:text-gray-100">{position.stance}</h5>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  {position.participants.length} participant(s)
                </span>
              </div>

              <p className="text-gray-700 dark:text-gray-300 mb-4">{position.reasoning}</p>

              {(position.underlyingValue || position.underlyingAssumption) && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  {position.underlyingValue && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[80px]">
                        Core Value
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {position.underlyingValue}
                      </span>
                    </div>
                  )}
                  {position.underlyingAssumption && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide min-w-[80px]">
                        Assumption
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {position.underlyingAssumption}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Moral Foundations */}
      {disagreement.moralFoundations && disagreement.moralFoundations.length > 0 && (
        <div
          className="bg-gray-50 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          data-testid="moral-foundations"
        >
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Related Moral Foundations
          </h4>
          <div className="flex flex-wrap gap-2">
            {disagreement.moralFoundations.map((foundation, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
              >
                {foundation}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            These moral foundations may help explain the underlying values driving this
            disagreement.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Get modal title based on detail type
 */
const getModalTitle = (detail: DetailContent | null): string => {
  if (!detail) return 'Details';

  switch (detail.type) {
    case 'agreementZone':
      return detail.data.title;
    case 'misunderstanding':
      return `Term: "${detail.data.term}"`;
    case 'disagreement':
      return detail.data.topic;
    default:
      return 'Details';
  }
};

/**
 * CommonGroundDetailModal - Displays detailed information about agreement zones,
 * misunderstandings, or disagreements from a common ground analysis.
 *
 * This modal provides an expanded view of:
 * - Agreement zones with full proposition details and participant breakdown
 * - Misunderstandings with all definitions and clarification suggestions
 * - Disagreements with positions, underlying values, and moral foundations
 */
const CommonGroundDetailModal: React.FC<CommonGroundDetailModalProps> = ({
  isOpen,
  onClose,
  detail,
}) => {
  if (!detail) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle(detail)}
      size="lg"
      data-testid="common-ground-detail-modal"
      footer={
        <Button variant="outline" onClick={onClose} data-testid="close-modal">
          Close
        </Button>
      }
    >
      {detail.type === 'agreementZone' && <AgreementZoneDetail zone={detail.data} />}
      {detail.type === 'misunderstanding' && (
        <MisunderstandingDetail misunderstanding={detail.data} />
      )}
      {detail.type === 'disagreement' && <DisagreementDetail disagreement={detail.data} />}
    </Modal>
  );
};

export default CommonGroundDetailModal;
