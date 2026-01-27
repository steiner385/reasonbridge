import React, { useState, useEffect } from 'react';
import { demoService, type DemoDiscussionsResponse } from '../../services/demoService';
import { DemoMetrics } from './DemoMetrics';
import { DemoDiscussionView } from './DemoDiscussionView';

interface InteractiveDemoProps {
  onJoinClick: () => void;
}

/**
 * InteractiveDemo component provides an interactive showcase of demo discussions
 * Allows users to explore discussions and see platform value before signing up
 */
export const InteractiveDemo: React.FC<InteractiveDemoProps> = ({ onJoinClick }) => {
  const [demoData, setDemoData] = useState<DemoDiscussionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const fetchDemoData = async () => {
      try {
        setLoading(true);
        const data = await demoService.getDemoDiscussions(5);
        setDemoData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load demo discussions');
      } finally {
        setLoading(false);
      }
    };

    fetchDemoData();
  }, []);

  const handlePrevious = () => {
    if (demoData && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (demoData && selectedIndex < demoData.discussions.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-600 dark:text-red-400">Error loading demo content: {error}</p>
      </div>
    );
  }

  if (!demoData || demoData.discussions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">No demo discussions available</p>
      </div>
    );
  }

  const currentDiscussion = demoData.discussions[selectedIndex];

  if (!currentDiscussion) {
    return null;
  }

  return (
    <div className="w-full">
      {/* Social Proof Metrics */}
      {demoData.socialProof && <DemoMetrics socialProof={demoData.socialProof} />}

      {/* Discussion Navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Featured Discussions</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevious}
            disabled={selectedIndex === 0}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Previous discussion"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIndex + 1} of {demoData.discussions.length}
          </span>
          <button
            onClick={handleNext}
            disabled={selectedIndex === demoData.discussions.length - 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Next discussion"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Current Discussion */}
      <DemoDiscussionView discussion={currentDiscussion} onJoinPrompt={onJoinClick} />

      {/* Discussion Thumbnails */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        {demoData.discussions.map((discussion, index) => (
          <button
            key={discussion.id}
            onClick={() => setSelectedIndex(index)}
            className={`p-3 text-left rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              index === selectedIndex
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            aria-label={`View discussion: ${discussion.title}`}
            aria-pressed={index === selectedIndex}
          >
            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 truncate">
              {discussion.topic}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
              {discussion.title}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span>{discussion.participantCount} people</span>
              <span>•</span>
              <span>{Math.round(discussion.commonGroundScore * 100)}% CG</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
