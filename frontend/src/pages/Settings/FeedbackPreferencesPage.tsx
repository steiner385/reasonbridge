/**
 * Feedback Preferences Settings Page
 * Allows users to configure their AI feedback preferences
 */

import { useState } from 'react';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import type { FeedbackPreferences, FeedbackSensitivity } from '../../types/feedback';

/**
 * Default feedback preferences
 */
const DEFAULT_PREFERENCES: FeedbackPreferences = {
  enabled: true,
  sensitivity: 'medium',
  minConfidenceThreshold: 0.7,
  showEducationalResources: true,
  autoDismissLowConfidence: false,
  enabledTypes: {
    fallacy: true,
    inflammatory: true,
    unsourced: true,
    bias: true,
    affirmation: true,
  },
};

/**
 * Sensitivity level configurations
 */
const SENSITIVITY_CONFIGS: Record<FeedbackSensitivity, { threshold: number; description: string }> = {
  low: {
    threshold: 0.9,
    description: 'Only show high-confidence feedback (90%+)',
  },
  medium: {
    threshold: 0.7,
    description: 'Show moderate to high-confidence feedback (70%+)',
  },
  high: {
    threshold: 0.5,
    description: 'Show all feedback including low-confidence items (50%+)',
  },
};

function FeedbackPreferencesPage() {
  // In a real implementation, this would load from user settings API
  const [preferences, setPreferences] = useState<FeedbackPreferences>(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleToggleEnabled = () => {
    setPreferences((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleSensitivityChange = (sensitivity: FeedbackSensitivity) => {
    setPreferences((prev) => ({
      ...prev,
      sensitivity,
      minConfidenceThreshold: SENSITIVITY_CONFIGS[sensitivity].threshold,
    }));
  };

  const handleToggleType = (type: keyof FeedbackPreferences['enabledTypes']) => {
    setPreferences((prev) => ({
      ...prev,
      enabledTypes: {
        ...prev.enabledTypes,
        [type]: !prev.enabledTypes[type],
      },
    }));
  };

  const handleToggleEducationalResources = () => {
    setPreferences((prev) => ({
      ...prev,
      showEducationalResources: !prev.showEducationalResources,
    }));
  };

  const handleToggleAutoDismiss = () => {
    setPreferences((prev) => ({
      ...prev,
      autoDismissLowConfidence: !prev.autoDismissLowConfidence,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // In a real implementation, this would save to the backend
      // await saveFeedbackPreferences(preferences);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSaveMessage('Preferences saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setSaveMessage('Preferences reset to defaults');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-bold text-gray-900">Feedback Preferences</h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure how AI-generated feedback is displayed in your responses
          </p>
        </CardHeader>
        <CardBody>
          <div className="space-y-6">
            {/* Global Enable/Disable */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Enable Feedback</h3>
                <p className="text-sm text-gray-600">
                  Show AI-generated feedback on your responses
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleEnabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  preferences.enabled ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={preferences.enabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sensitivity Level */}
            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Sensitivity Level</h3>
              <p className="text-sm text-gray-600 mb-4">
                Control how often feedback is shown based on AI confidence
              </p>
              <div className="space-y-2">
                {(['low', 'medium', 'high'] as FeedbackSensitivity[]).map((level) => (
                  <label key={level} className="flex items-start cursor-pointer">
                    <input
                      type="radio"
                      name="sensitivity"
                      value={level}
                      checked={preferences.sensitivity === level}
                      onChange={() => handleSensitivityChange(level)}
                      className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      disabled={!preferences.enabled}
                    />
                    <div className="ml-3">
                      <span className="block text-sm font-medium text-gray-900 capitalize">
                        {level}
                      </span>
                      <span className="block text-sm text-gray-600">
                        {SENSITIVITY_CONFIGS[level].description}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback Types */}
            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Feedback Types</h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose which types of feedback to display
              </p>
              <div className="space-y-3">
                {Object.entries({
                  fallacy: 'Logical Fallacies',
                  inflammatory: 'Inflammatory Language',
                  unsourced: 'Unsourced Claims',
                  bias: 'Potential Bias',
                  affirmation: 'Positive Affirmations',
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.enabledTypes[key as keyof typeof preferences.enabledTypes]}
                      onChange={() => handleToggleType(key as keyof typeof preferences.enabledTypes)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      disabled={!preferences.enabled}
                    />
                    <span className="ml-3 text-sm text-gray-900">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Options */}
            <div className="pb-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Additional Options</h3>
              <div className="space-y-3">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.showEducationalResources}
                    onChange={handleToggleEducationalResources}
                    className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    disabled={!preferences.enabled}
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">
                      Show Educational Resources
                    </span>
                    <span className="block text-sm text-gray-600">
                      Display links to articles and resources related to feedback
                    </span>
                  </div>
                </label>

                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.autoDismissLowConfidence}
                    onChange={handleToggleAutoDismiss}
                    className="mt-0.5 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    disabled={!preferences.enabled}
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-gray-900">
                      Auto-dismiss Low Confidence Feedback
                    </span>
                    <span className="block text-sm text-gray-600">
                      Automatically hide feedback below your sensitivity threshold after viewing
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Message */}
            {saveMessage && (
              <div
                className={`p-3 rounded-md ${
                  saveMessage.includes('success')
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {saveMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="secondary"
                onClick={handleReset}
                disabled={isSaving}
              >
                Reset to Defaults
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default FeedbackPreferencesPage;
