import { useState } from 'react';
import { CommonGroundSummaryPanel } from '../../components/common-ground';
import type { CommonGroundAnalysis } from '../../types/common-ground';

/**
 * Demo page showcasing the CommonGroundSummaryPanel component with sample data
 */
function CommonGroundDemoPage() {
  const [selectedItem, setSelectedItem] = useState<{
    type: 'agreement' | 'misunderstanding' | 'disagreement';
    id: string;
  } | null>(null);

  // Sample data for demonstration
  const sampleAnalysis: CommonGroundAnalysis = {
    id: 'analysis-1',
    discussionId: 'discussion-1',
    participantCount: 12,
    overallConsensusScore: 68,
    lastUpdated: new Date().toISOString(),
    agreementZones: [
      {
        id: 'zone-1',
        title: 'Shared commitment to evidence-based policy',
        description:
          'Participants across the political spectrum agree that policies should be informed by empirical data and scientific research.',
        consensusLevel: 'high',
        participantCount: 10,
        propositions: [
          {
            id: 'prop-1',
            text: 'Policy decisions should be informed by peer-reviewed research',
            agreementPercentage: 92,
            supportingParticipants: ['user1', 'user2', 'user3'],
            opposingParticipants: ['user4'],
            neutralParticipants: [],
          },
          {
            id: 'prop-2',
            text: 'We should measure outcomes to evaluate policy effectiveness',
            agreementPercentage: 85,
            supportingParticipants: ['user1', 'user2'],
            opposingParticipants: [],
            neutralParticipants: ['user5'],
          },
        ],
      },
      {
        id: 'zone-2',
        title: 'Need for transparent governance',
        description:
          'Most participants agree that government operations should be transparent and accountable to citizens.',
        consensusLevel: 'medium',
        participantCount: 8,
        propositions: [
          {
            id: 'prop-3',
            text: 'Government spending should be publicly auditable',
            agreementPercentage: 75,
            supportingParticipants: ['user1', 'user2', 'user3'],
            opposingParticipants: ['user6'],
            neutralParticipants: ['user7'],
          },
        ],
      },
    ],
    misunderstandings: [
      {
        id: 'mis-1',
        term: 'freedom',
        definitions: [
          {
            definition: 'Freedom from government interference in personal choices',
            participants: ['user1', 'user2', 'user3'],
          },
          {
            definition:
              'Freedom from systemic barriers that prevent equal opportunity',
            participants: ['user4', 'user5'],
          },
          {
            definition: 'Freedom to participate in democratic processes',
            participants: ['user6', 'user7'],
          },
        ],
        clarificationSuggestion:
          'Participants should specify whether they mean negative freedom (freedom from) or positive freedom (freedom to) when discussing liberty.',
      },
      {
        id: 'mis-2',
        term: 'equity',
        definitions: [
          {
            definition: 'Equal treatment under the law regardless of background',
            participants: ['user8', 'user9'],
          },
          {
            definition:
              'Tailored support to achieve equal outcomes across groups',
            participants: ['user10', 'user11'],
          },
        ],
        clarificationSuggestion:
          'Distinguishing between equality of opportunity and equality of outcome may help clarify positions.',
      },
    ],
    disagreements: [
      {
        id: 'dis-1',
        topic: 'Role of government in healthcare',
        description:
          'Fundamental disagreement about whether healthcare should be primarily government-provided or market-based.',
        positions: [
          {
            stance: 'Universal healthcare system',
            reasoning:
              'Healthcare is a fundamental right and should be guaranteed to all citizens regardless of ability to pay.',
            participants: ['user4', 'user5', 'user10'],
            underlyingValue: 'Care/harm - minimizing suffering',
            underlyingAssumption:
              'Healthcare markets inherently fail to serve all citizens adequately',
          },
          {
            stance: 'Market-based healthcare with safety net',
            reasoning:
              'Competition drives innovation and efficiency; government should only provide for those who cannot afford private insurance.',
            participants: ['user1', 'user2', 'user8'],
            underlyingValue: 'Liberty/oppression - individual choice',
            underlyingAssumption:
              'Markets are more efficient than government programs when properly regulated',
          },
          {
            stance: 'Hybrid public-private system',
            reasoning:
              'Government ensures basic coverage while allowing private options for those who want them.',
            participants: ['user6', 'user7', 'user9'],
            underlyingValue: 'Fairness/cheating - balanced approach',
            underlyingAssumption:
              'Both markets and government have roles to play in complex systems',
          },
        ],
        moralFoundations: ['care-harm', 'liberty-oppression', 'fairness-cheating'],
      },
      {
        id: 'dis-2',
        topic: 'Climate policy urgency',
        description:
          'Different assessments of how urgently climate action is needed and what trade-offs are acceptable.',
        positions: [
          {
            stance: 'Immediate radical action required',
            reasoning:
              'Climate change represents an existential threat requiring urgent systemic transformation.',
            participants: ['user3', 'user4'],
            underlyingValue: 'Care/harm - protecting future generations',
          },
          {
            stance: 'Gradual transition with economic considerations',
            reasoning:
              'Climate action must balance environmental goals with economic stability and energy security.',
            participants: ['user1', 'user8', 'user9'],
            underlyingValue: 'Fairness/cheating - balancing multiple priorities',
          },
        ],
        moralFoundations: ['care-harm', 'fairness-cheating'],
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Common Ground Analysis Demo
        </h1>
        <p className="text-gray-600">
          This page demonstrates the CommonGroundSummaryPanel component with sample
          data from a discussion about policy and governance.
        </p>
      </div>

      <CommonGroundSummaryPanel
        analysis={sampleAnalysis}
        onViewAgreementZone={(id) => {
          setSelectedItem({ type: 'agreement', id });
          console.log('View agreement zone:', id);
        }}
        onViewMisunderstanding={(id) => {
          setSelectedItem({ type: 'misunderstanding', id });
          console.log('View misunderstanding:', id);
        }}
        onViewDisagreement={(id) => {
          setSelectedItem({ type: 'disagreement', id });
          console.log('View disagreement:', id);
        }}
        showLastUpdated={true}
        showEmptyState={true}
      />

      {selectedItem && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Selected:</strong> {selectedItem.type} with ID: {selectedItem.id}
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="ml-4 text-blue-600 hover:text-blue-800 underline"
            >
              Clear
            </button>
          </p>
        </div>
      )}

      <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Component Features
        </h2>
        <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
          <li>
            <strong>Overall Consensus Score:</strong> Visual progress bar showing the
            level of agreement across all participants
          </li>
          <li>
            <strong>Agreement Zones:</strong> Areas of high consensus with specific
            propositions and agreement percentages
          </li>
          <li>
            <strong>Misunderstandings:</strong> Terms being used with different
            definitions by different participants
          </li>
          <li>
            <strong>Genuine Disagreements:</strong> Fundamental differences in values
            or assumptions with moral foundations analysis
          </li>
          <li>
            <strong>Interactive Callbacks:</strong> Click "View Details" buttons to
            trigger navigation to detailed views
          </li>
          <li>
            <strong>Accessible:</strong> Proper ARIA labels and semantic HTML for
            screen readers
          </li>
        </ul>
      </div>
    </div>
  );
}

export default CommonGroundDemoPage;
