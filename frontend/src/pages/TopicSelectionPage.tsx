import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopicCard from '../components/onboarding/TopicCard';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import {
  onboardingService,
  type Topic,
} from '../services/onboardingService';

interface SelectedTopicWithPriority {
  topic: Topic;
  priority: number;
}

/**
 * TopicSelectionPage component - Onboarding step for selecting 2-3 topics of interest
 * Features:
 * - Topic cards with activity level indicators
 * - 2-3 topic selection validation
 * - Priority assignment (1-3)
 * - Low activity warning modal
 * - Real-time feedback on selection count
 * - Responsive design with accessibility
 */
export const TopicSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Map<string, SelectedTopicWithPriority>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [showLowActivityWarning, setShowLowActivityWarning] = useState(false);
  const [lowActivityAlternatives, setLowActivityAlternatives] = useState<Topic[]>([]);

  // Load topics on mount
  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await onboardingService.getTopics(true);
      setTopics(response.topics);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load topics';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Toggle topic selection
   */
  const handleTopicClick = (topic: Topic) => {
    setSelectedTopics((prev) => {
      const newMap = new Map(prev);

      if (newMap.has(topic.id)) {
        // Deselect topic
        newMap.delete(topic.id);
        // Reassign priorities
        return reassignPriorities(newMap);
      } else {
        // Check if we already have 3 topics
        if (newMap.size >= 3) {
          return prev; // Don't allow more than 3
        }
        // Add new topic with next available priority
        const nextPriority = newMap.size + 1;
        newMap.set(topic.id, { topic, priority: nextPriority });
        return newMap;
      }
    });
  };

  /**
   * Update priority for a selected topic
   */
  const handlePriorityChange = (topicId: string, newPriority: number) => {
    setSelectedTopics((prev) => {
      const newMap = new Map(prev);
      const current = newMap.get(topicId);

      if (!current) return prev;

      // Find topic with the target priority and swap
      const swapTopic = Array.from(newMap.values()).find((t) => t.priority === newPriority);

      if (swapTopic) {
        // Swap priorities
        newMap.set(swapTopic.topic.id, { ...swapTopic, priority: current.priority });
        newMap.set(topicId, { ...current, priority: newPriority });
      } else {
        // Just update priority
        newMap.set(topicId, { ...current, priority: newPriority });
      }

      return newMap;
    });
  };

  /**
   * Reassign priorities sequentially after removing a topic
   */
  const reassignPriorities = (
    topicsMap: Map<string, SelectedTopicWithPriority>,
  ): Map<string, SelectedTopicWithPriority> => {
    const sorted = Array.from(topicsMap.values()).sort((a, b) => a.priority - b.priority);
    const newMap = new Map<string, SelectedTopicWithPriority>();

    sorted.forEach((item, index) => {
      newMap.set(item.topic.id, { ...item, priority: index + 1 });
    });

    return newMap;
  };

  /**
   * Check if all selected topics have LOW activity
   */
  const checkLowActivityWarning = (): boolean => {
    if (selectedTopics.size === 0) return false;

    const allLowActivity = Array.from(selectedTopics.values()).every(
      (item) => item.topic.activityLevel === 'LOW',
    );

    return allLowActivity;
  };

  /**
   * Get alternative high/medium activity topics
   */
  const getActivityAlternatives = (): Topic[] => {
    return topics.filter(
      (topic) =>
        (topic.activityLevel === 'HIGH' || topic.activityLevel === 'MEDIUM') &&
        !selectedTopics.has(topic.id),
    );
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    // Validate selection count
    if (selectedTopics.size < 2 || selectedTopics.size > 3) {
      setError('Please select 2-3 topics to continue');
      return;
    }

    // Check for low activity warning
    if (checkLowActivityWarning()) {
      const alternatives = getActivityAlternatives();
      if (alternatives.length > 0) {
        setLowActivityAlternatives(alternatives);
        setShowLowActivityWarning(true);
        return;
      }
    }

    await submitTopicSelection();
  };

  /**
   * Submit topic selection to API
   */
  const submitTopicSelection = async () => {
    try {
      setIsSubmitting(true);
      setError('');

      // Get topic IDs sorted by priority
      const sortedTopics = Array.from(selectedTopics.values()).sort(
        (a, b) => a.priority - b.priority,
      );
      const topicIds = sortedTopics.map((item) => item.topic.id);

      // Submit to API
      await onboardingService.selectTopics(topicIds);

      // Get next action URL from onboarding progress
      const progress = await onboardingService.getOnboardingProgress();
      const nextUrl = progress.nextAction?.actionUrl || '/onboarding/orientation';

      // Navigate to next step
      navigate(nextUrl, { replace: true });
    } catch (err) {
      setIsSubmitting(false);
      const message = err instanceof Error ? err.message : 'Failed to save topic selection';
      setError(message);
    }
  };

  /**
   * Switch to an alternative topic
   */
  const handleSwitchToAlternative = (alternative: Topic) => {
    // Remove first LOW activity topic and add alternative
    const lowActivityTopic = Array.from(selectedTopics.values()).find(
      (item) => item.topic.activityLevel === 'LOW',
    );

    if (lowActivityTopic) {
      setSelectedTopics((prev) => {
        const newMap = new Map(prev);
        newMap.delete(lowActivityTopic.topic.id);
        newMap.set(alternative.id, { topic: alternative, priority: lowActivityTopic.priority });
        return reassignPriorities(newMap);
      });
    }

    setShowLowActivityWarning(false);
  };

  /**
   * Proceed with low activity topics
   */
  const handleProceedWithLowActivity = () => {
    setShowLowActivityWarning(false);
    submitTopicSelection();
  };

  const selectedCount = selectedTopics.size;
  const isValidSelection = selectedCount >= 2 && selectedCount <= 3;
  const selectedArray = Array.from(selectedTopics.values()).sort((a, b) => a.priority - b.priority);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Choose Your Interests
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Select 2-3 topics you'd like to discuss. We'll personalize your feed based on your
            choices.
          </p>
        </div>

        {/* Selection Counter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                  ${
                    isValidSelection
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}
                aria-label={`${selectedCount} topics selected`}
              >
                {selectedCount}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedCount === 0 && 'No topics selected yet'}
                {selectedCount === 1 && 'Select 1-2 more topics'}
                {selectedCount === 2 && '2 topics selected - you can add 1 more'}
                {selectedCount === 3 && '3 topics selected'}
              </span>
            </div>

            {!isValidSelection && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Required: 2-3 topics
              </span>
            )}
          </div>

          {/* Selected Topics Preview */}
          {selectedCount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {selectedArray.map((item) => (
                  <div
                    key={item.topic.id}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                  >
                    <span className="font-bold">{item.priority}.</span>
                    <span>{item.topic.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6"
            role="alert"
            aria-live="polite"
          >
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading topics...</p>
          </div>
        )}

        {/* Topic Grid */}
        {!isLoading && topics.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 mb-8">
            {topics.map((topic) => {
              const selected = selectedTopics.get(topic.id);
              const topicCardProps = {
                key: topic.id,
                topic,
                isSelected: !!selected,
                onClick: () => handleTopicClick(topic),
                onPrioritySelect: (priority: number) => handlePriorityChange(topic.id, priority),
                enablePrioritySelection: true,
                ...(selected?.priority ? { priority: selected.priority } : {}),
              };
              return (
                <TopicCard
                  {...topicCardProps}
                />
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && topics.length === 0 && !error && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No topics available</p>
            <Button variant="outline" onClick={loadTopics} className="mt-4">
              Retry
            </Button>
          </div>
        )}

        {/* Submit Button */}
        {!isLoading && topics.length > 0 && (
          <div className="flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              disabled={!isValidSelection || isSubmitting}
              isLoading={isSubmitting}
              className="min-w-[200px]"
            >
              {isSubmitting ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        )}
      </div>

      {/* Low Activity Warning Modal */}
      <Modal
        isOpen={showLowActivityWarning}
        onClose={() => setShowLowActivityWarning(false)}
        title="Low Activity Topics Selected"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <svg
              className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                These topics have lower activity
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                All selected topics currently have low discussion activity. You might have a better
                experience with more active topics.
              </p>
            </div>
          </div>

          {lowActivityAlternatives.length > 0 && (
            <>
              <h4 className="font-medium text-gray-900 dark:text-white">
                Try these active topics instead:
              </h4>
              <div className="grid gap-3 max-h-[400px] overflow-y-auto">
                {lowActivityAlternatives.slice(0, 6).map((alternative) => (
                  <div
                    key={alternative.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 dark:text-white">
                        {alternative.name}
                      </h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {alternative.description}
                      </p>
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {alternative.activeDiscussionCount} active discussions •{' '}
                        {alternative.participantCount.toLocaleString()} participants
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSwitchToAlternative(alternative)}
                      className="ml-3"
                    >
                      Switch
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={handleProceedWithLowActivity}>
            Continue Anyway
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default TopicSelectionPage;
