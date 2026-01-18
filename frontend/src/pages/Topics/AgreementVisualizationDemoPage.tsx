import { useState } from 'react';
import {
  AgreementBarChart,
  AgreementVennDiagram,
} from '../../components/common-ground';
import type { Proposition, Disagreement } from '../../types/common-ground';

/**
 * Demo page showcasing the agreement visualization components
 */
function AgreementVisualizationDemoPage() {
  const [selectedProposition, setSelectedProposition] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'agreement-desc' | 'agreement-asc' | 'original'>(
    'agreement-desc'
  );

  // Sample propositions for bar chart
  const samplePropositions: Proposition[] = [
    {
      id: 'prop-1',
      text: 'Climate change is primarily caused by human activity',
      agreementPercentage: 88,
      supportingParticipants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6', 'user7', 'user8'],
      opposingParticipants: ['user9'],
      neutralParticipants: ['user10'],
    },
    {
      id: 'prop-2',
      text: 'Renewable energy should be prioritized over fossil fuels',
      agreementPercentage: 75,
      supportingParticipants: ['user1', 'user2', 'user3', 'user4', 'user5', 'user6'],
      opposingParticipants: ['user7', 'user8'],
      neutralParticipants: [],
    },
    {
      id: 'prop-3',
      text: 'Carbon pricing is an effective climate policy tool',
      agreementPercentage: 62,
      supportingParticipants: ['user1', 'user2', 'user3', 'user4', 'user5'],
      opposingParticipants: ['user6', 'user7'],
      neutralParticipants: ['user8'],
    },
    {
      id: 'prop-4',
      text: 'Nuclear energy should be expanded to reduce emissions',
      agreementPercentage: 45,
      supportingParticipants: ['user1', 'user4', 'user9'],
      opposingParticipants: ['user2', 'user5', 'user7'],
      neutralParticipants: ['user3', 'user8'],
    },
    {
      id: 'prop-5',
      text: 'Individual behavior change is more important than policy',
      agreementPercentage: 28,
      supportingParticipants: ['user9', 'user10'],
      opposingParticipants: ['user1', 'user2', 'user3', 'user4', 'user5'],
      neutralParticipants: ['user6'],
    },
    {
      id: 'prop-6',
      text: 'Economic growth must be sacrificed for environmental protection',
      agreementPercentage: 18,
      supportingParticipants: ['user3'],
      opposingParticipants: ['user1', 'user4', 'user7', 'user9', 'user10'],
      neutralParticipants: ['user2', 'user5'],
    },
  ];

  // Sample disagreement for Venn diagram
  const sampleDisagreement: Disagreement = {
    id: 'dis-1',
    topic: 'Climate Policy Approach',
    description:
      'Fundamental disagreement about the best approach to address climate change.',
    positions: [
      {
        stance: 'Market-based solutions',
        reasoning:
          'Carbon pricing and market mechanisms incentivize innovation and efficiency while preserving economic growth.',
        participants: ['user1', 'user4', 'user9', 'user10'],
        underlyingValue: 'Economic freedom and innovation',
        underlyingAssumption: 'Markets are more efficient than government mandates',
      },
      {
        stance: 'Government regulation',
        reasoning:
          'Direct regulation and public investment are necessary to achieve the scale and speed of change required.',
        participants: ['user2', 'user5', 'user7'],
        underlyingValue: 'Collective action for public good',
        underlyingAssumption:
          'Climate crisis requires coordinated government intervention',
      },
      {
        stance: 'Hybrid approach',
        reasoning:
          'Combination of market mechanisms and strategic regulation balances effectiveness with economic concerns.',
        participants: ['user3', 'user6', 'user8'],
        underlyingValue: 'Pragmatic problem-solving',
        underlyingAssumption: 'No single approach is sufficient for complex problems',
      },
    ],
    moralFoundations: ['care-harm', 'liberty-oppression', 'fairness-cheating'],
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Agreement Visualization Demo
        </h1>
        <p className="text-gray-600">
          This page demonstrates the AgreementBarChart and AgreementVennDiagram
          components for visualizing discussion consensus and disagreement patterns.
        </p>
      </div>

      {/* Bar Chart Section */}
      <div className="mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Agreement Bar Chart
            </h2>
            <div className="flex items-center gap-2">
              <label htmlFor="sort-select" className="text-sm text-gray-700">
                Sort by:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'agreement-desc' | 'agreement-asc' | 'original'
                  )
                }
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="agreement-desc">Agreement (High to Low)</option>
                <option value="agreement-asc">Agreement (Low to High)</option>
                <option value="original">Original Order</option>
              </select>
            </div>
          </div>

          <AgreementBarChart
            propositions={samplePropositions}
            title="Climate Discussion Propositions"
            showParticipantCounts={true}
            sortBy={sortBy}
            onPropositionClick={(id) => {
              setSelectedProposition(id);
              console.log('Clicked proposition:', id);
            }}
          />

          {selectedProposition && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Selected Proposition:</strong> {selectedProposition}
                <button
                  type="button"
                  onClick={() => setSelectedProposition(null)}
                  className="ml-4 text-blue-600 hover:text-blue-800 underline"
                >
                  Clear
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Venn Diagram Section */}
      <div className="mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Agreement Venn Diagram
          </h2>

          <AgreementVennDiagram
            disagreement={sampleDisagreement}
            title="Position Overlap Visualization"
            size="medium"
            onPositionClick={(idx) => {
              setSelectedPosition(idx);
              console.log('Clicked position:', idx);
            }}
          />

          {selectedPosition !== null && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Selected Position:</strong>{' '}
                {sampleDisagreement.positions[selectedPosition]?.stance}
                <button
                  type="button"
                  onClick={() => setSelectedPosition(null)}
                  className="ml-4 text-blue-600 hover:text-blue-800 underline"
                >
                  Clear
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Component Features */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Bar Chart Features
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>Color-coded bars based on agreement level</li>
            <li>Interactive sorting (high to low, low to high, original)</li>
            <li>Participant breakdown (support/oppose/neutral)</li>
            <li>Click callbacks for navigation</li>
            <li>Responsive design with accessibility support</li>
            <li>Visual legend explaining color coding</li>
          </ul>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Venn Diagram Features
          </h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>SVG-based visualization for scalability</li>
            <li>Supports 1-3 positions with adaptive layout</li>
            <li>Circle size represents participant count</li>
            <li>Shows underlying values and assumptions</li>
            <li>Moral foundations integration</li>
            <li>Interactive position selection</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AgreementVisualizationDemoPage;
