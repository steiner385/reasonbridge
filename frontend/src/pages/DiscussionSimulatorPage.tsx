import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  generatePositions,
  generateResponse,
  type CustomPersonaConfig,
  type PersonaTone,
  type PositionResult,
} from '../lib/simulator-api';

/**
 * Discussion Simulator Page
 *
 * Interactive tool for simulating AI-driven discussions between different viewpoints.
 * Useful for:
 * - Exploring multiple perspectives on a topic
 * - Testing argument quality and tone
 * - Understanding how different personas might respond
 * - Generating diverse content for seeding discussions
 */
export const DiscussionSimulatorPage: React.FC = () => {
  // Topic configuration
  const [topicTitle, setTopicTitle] = useState('');
  const [topicContext, setTopicContext] = useState('');

  // Generated positions
  const [positions, setPositions] = useState<{
    positionA: PositionResult;
    positionB: PositionResult;
  } | null>(null);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  // Persona configuration
  const [selectedPosition, setSelectedPosition] = useState<'A' | 'B' | null>(null);
  const [personaName, setPersonaName] = useState('');
  const [personaValues, setPersonaValues] = useState<string>('');
  const [personaTone, setPersonaTone] = useState<PersonaTone>('measured');
  const [receptiveness, setReceptiveness] = useState(0.5);
  const [usesEmotionalAppeals, setUsesEmotionalAppeals] = useState(false);
  const [citesData, setCitesData] = useState(true);
  const [asksQuestions, setAsksQuestions] = useState(false);

  // Discussion state
  const [discussionHistory, setDiscussionHistory] = useState<
    Array<{ persona: string; content: string }>
  >([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);

  /**
   * Generate opposing positions for the topic
   */
  const handleGeneratePositions = async () => {
    if (!topicTitle.trim()) {
      setPositionsError('Please enter a topic title');
      return;
    }

    setLoadingPositions(true);
    setPositionsError(null);

    try {
      const result = await generatePositions({
        topicTitle: topicTitle.trim(),
        context: topicContext.trim() || undefined,
      });
      setPositions(result);
      setPositionsError(null);
    } catch (error) {
      setPositionsError(error instanceof Error ? error.message : 'Failed to generate positions');
      setPositions(null);
    } finally {
      setLoadingPositions(false);
    }
  };

  /**
   * Auto-fill persona from selected position
   */
  const handleSelectPosition = (position: 'A' | 'B') => {
    if (!positions) return;

    setSelectedPosition(position);
    const selectedPos = position === 'A' ? positions.positionA : positions.positionB;

    setPersonaName(selectedPos.suggestedPersona);
    setPersonaValues(selectedPos.summary);
  };

  /**
   * Generate a response from the configured persona
   */
  const handleGenerateResponse = async () => {
    if (!personaName.trim() || !personaValues.trim()) {
      setResponseError('Please configure persona name and values');
      return;
    }

    setLoadingResponse(true);
    setResponseError(null);

    const customPersona: CustomPersonaConfig = {
      name: personaName.trim(),
      values: personaValues
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0),
      tone: personaTone,
      receptiveness,
      usesEmotionalAppeals,
      citesData,
      asksQuestions,
    };

    try {
      const result = await generateResponse({
        discussionId: `sim-${Date.now()}`,
        customPersona,
        action: 'draft',
        topicTitle: topicTitle.trim(),
        discussionHistory: discussionHistory.map((msg) => `${msg.persona}: ${msg.content}`),
      });

      setCurrentResponse(result.content);
      setReasoning(result.reasoning);
      setResponseError(null);
    } catch (error) {
      setResponseError(error instanceof Error ? error.message : 'Failed to generate response');
    } finally {
      setLoadingResponse(false);
    }
  };

  /**
   * Add current response to discussion history
   */
  const handleAddToDiscussion = () => {
    if (!currentResponse.trim()) return;

    setDiscussionHistory([
      ...discussionHistory,
      {
        persona: personaName || 'Anonymous',
        content: currentResponse,
      },
    ]);
    setCurrentResponse('');
    setReasoning('');
  };

  /**
   * Clear discussion and start over
   */
  const handleClearDiscussion = () => {
    setDiscussionHistory([]);
    setCurrentResponse('');
    setReasoning('');
    setPositions(null);
    setSelectedPosition(null);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-fluid-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Discussion Simulator
        </h1>
        <p className="text-fluid-base text-gray-600 dark:text-gray-400">
          Generate AI-driven discussions between different viewpoints to explore topics and test
          arguments.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          {/* Topic Configuration */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              1. Define Topic
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="topicTitle"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Topic Title *
                </label>
                <input
                  type="text"
                  id="topicTitle"
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  placeholder="e.g., Should AI-generated content require disclosure?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="topicContext"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Context (optional)
                </label>
                <textarea
                  id="topicContext"
                  value={topicContext}
                  onChange={(e) => setTopicContext(e.target.value)}
                  placeholder="Additional context or constraints for the discussion..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleGeneratePositions}
                disabled={loadingPositions || !topicTitle.trim()}
                className="w-full"
              >
                {loadingPositions ? 'Generating Positions...' : '🎯 Generate Opposing Positions'}
              </Button>

              {positionsError && (
                <p className="text-sm text-red-600 dark:text-red-400">{positionsError}</p>
              )}
            </div>
          </Card>

          {/* Generated Positions */}
          {positions && (
            <Card variant="elevated" padding="lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                2. Select Position
              </h2>

              <div className="space-y-4">
                {/* Position A */}
                <button
                  onClick={() => handleSelectPosition('A')}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                    selectedPosition === 'A'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {positions.positionA.label}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {positions.positionA.summary}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Suggested persona: {positions.positionA.suggestedPersona}
                      </p>
                    </div>
                    {selectedPosition === 'A' && (
                      <span className="ml-2 text-primary-600 dark:text-primary-400 text-xl">✓</span>
                    )}
                  </div>
                </button>

                {/* Position B */}
                <button
                  onClick={() => handleSelectPosition('B')}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                    selectedPosition === 'B'
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {positions.positionB.label}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {positions.positionB.summary}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Suggested persona: {positions.positionB.suggestedPersona}
                      </p>
                    </div>
                    {selectedPosition === 'B' && (
                      <span className="ml-2 text-primary-600 dark:text-primary-400 text-xl">✓</span>
                    )}
                  </div>
                </button>
              </div>
            </Card>
          )}

          {/* Persona Configuration */}
          <Card variant="elevated" padding="lg">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              3. Configure Persona
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="personaName"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Persona Name *
                </label>
                <input
                  type="text"
                  id="personaName"
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  placeholder="e.g., Tech Advocate"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="personaValues"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Core Values (comma-separated) *
                </label>
                <input
                  type="text"
                  id="personaValues"
                  value={personaValues}
                  onChange={(e) => setPersonaValues(e.target.value)}
                  placeholder="e.g., transparency, innovation, consumer rights"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label
                  htmlFor="personaTone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Tone
                </label>
                <select
                  id="personaTone"
                  value={personaTone}
                  onChange={(e) => setPersonaTone(e.target.value as PersonaTone)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="measured">Measured</option>
                  <option value="analytical">Analytical</option>
                  <option value="passionate">Passionate</option>
                  <option value="confrontational">Confrontational</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="receptiveness"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Receptiveness to opposing views: {receptiveness.toFixed(1)}
                </label>
                <input
                  type="range"
                  id="receptiveness"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={receptiveness}
                  onChange={(e) => setReceptiveness(parseFloat(e.target.value))}
                  className="w-full accent-primary-600"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Closed-minded</span>
                  <span>Very open</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={usesEmotionalAppeals}
                    onChange={(e) => setUsesEmotionalAppeals(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 dark:text-primary-400 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Uses emotional appeals
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={citesData}
                    onChange={(e) => setCitesData(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 dark:text-primary-400 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Cites data and statistics
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={asksQuestions}
                    onChange={(e) => setAsksQuestions(e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600 text-primary-600 dark:text-primary-400 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Asks clarifying questions
                  </span>
                </label>
              </div>

              <Button
                variant="success"
                size="md"
                onClick={handleGenerateResponse}
                disabled={loadingResponse || !personaName.trim() || !personaValues.trim()}
                className="w-full"
              >
                {loadingResponse ? 'Generating Response...' : '🤖 Generate Response'}
              </Button>

              {responseError && (
                <p className="text-sm text-red-600 dark:text-red-400">{responseError}</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Discussion & Results */}
        <div className="space-y-6">
          {/* Generated Response */}
          {(currentResponse || reasoning) && (
            <Card variant="elevated" padding="lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Generated Response
                </h2>
                <Button variant="secondary" size="sm" onClick={handleAddToDiscussion}>
                  Add to Discussion
                </Button>
              </div>

              {currentResponse && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {personaName}:
                  </p>
                  <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                    {currentResponse}
                  </p>
                </div>
              )}

              {reasoning && (
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-md border border-primary-200 dark:border-primary-800">
                  <p className="text-xs font-semibold text-primary-900 dark:text-primary-200 mb-2">
                    AI Reasoning:
                  </p>
                  <p className="text-sm text-primary-800 dark:text-primary-300">{reasoning}</p>
                </div>
              )}
            </Card>
          )}

          {/* Discussion History */}
          <Card variant="elevated" padding="lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Discussion History ({discussionHistory.length})
              </h2>
              {discussionHistory.length > 0 && (
                <Button variant="danger" size="sm" onClick={handleClearDiscussion}>
                  Clear All
                </Button>
              )}
            </div>

            {discussionHistory.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No messages yet. Generate responses to build a discussion.
              </p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {discussionHistory.map((message, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700"
                  >
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {message.persona}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Usage Tips */}
          <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-200 dark:border-primary-800 p-8">
            <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-200 mb-2">
              💡 Tips for Using the Simulator
            </h3>
            <ul className="text-sm text-primary-800 dark:text-primary-300 space-y-1">
              <li>• Start by generating positions to see contrasting viewpoints</li>
              <li>
                • Adjust persona tone and receptiveness to explore different communication styles
              </li>
              <li>• Add responses to discussion history to see how conversations evolve</li>
              <li>• Switch between positions to simulate a full debate</li>
              <li>• Use this to test argument quality before posting real responses</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscussionSimulatorPage;
