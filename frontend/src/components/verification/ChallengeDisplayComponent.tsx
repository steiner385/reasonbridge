/**
 * Challenge Display Component
 * Displays video verification challenges to users
 * Shows different UI based on challenge type (phrase, gesture, or timestamp)
 */

import type { VideoChallenge } from '../../types/verification';
import { VideoChallengeType } from '../../types/verification';
import Card from '../ui/Card';

interface ChallengeDisplayComponentProps {
  challenge: VideoChallenge;
  className?: string;
}

const ChallengeDisplayComponent: React.FC<ChallengeDisplayComponentProps> = ({
  challenge,
  className = '',
}) => {
  const getChallengeIcon = (): string => {
    switch (challenge.type) {
      case VideoChallengeType.RANDOM_PHRASE:
        return '🎤';
      case VideoChallengeType.RANDOM_GESTURE:
        return '👋';
      case VideoChallengeType.TIMESTAMP:
        return '⏰';
      default:
        return '✓';
    }
  };

  const getChallengeTitle = (): string => {
    switch (challenge.type) {
      case VideoChallengeType.RANDOM_PHRASE:
        return 'Say This Phrase';
      case VideoChallengeType.RANDOM_GESTURE:
        return 'Perform This Gesture';
      case VideoChallengeType.TIMESTAMP:
        return 'Show This Timestamp';
      default:
        return 'Complete This Challenge';
    }
  };

  const renderChallengeContent = () => {
    switch (challenge.type) {
      case VideoChallengeType.RANDOM_PHRASE:
        return (
          <div className="space-y-4">
            <p className="text-gray-700 mb-4">{challenge.instruction}</p>
            {challenge.randomValue && (
              <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Phrase to say:</p>
                <p className="text-xl font-bold text-blue-700 break-words">
                  "{challenge.randomValue}"
                </p>
              </div>
            )}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
              <p className="font-medium mb-1">Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Speak clearly and naturally</li>
                <li>Make sure your face is visible</li>
                <li>Good lighting helps verification</li>
              </ul>
            </div>
          </div>
        );

      case VideoChallengeType.RANDOM_GESTURE:
        return (
          <div className="space-y-4">
            <p className="text-gray-700 mb-4">{challenge.instruction}</p>
            {challenge.randomValue && (
              <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Action to perform:</p>
                <p className="text-lg font-bold text-green-700">
                  {challenge.randomValue}
                </p>
              </div>
            )}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
              <p className="font-medium mb-1">Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Perform the action slowly and clearly</li>
                <li>Keep your entire body in frame</li>
                <li>Use natural, deliberate movements</li>
              </ul>
            </div>
          </div>
        );

      case VideoChallengeType.TIMESTAMP:
        return (
          <div className="space-y-4">
            <p className="text-gray-700 mb-4">{challenge.instruction}</p>
            {challenge.timestamp && (
              <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Current timestamp:</p>
                <p className="text-lg font-bold text-purple-700 font-mono">
                  {new Date(challenge.timestamp).toISOString()}
                </p>
              </div>
            )}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
              <p className="font-medium mb-1">Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Display the timestamp on your screen</li>
                <li>Use a clock, computer time, or phone</li>
                <li>Make sure the time is clearly visible in video</li>
              </ul>
            </div>
          </div>
        );

      default:
        return <p className="text-gray-700">{challenge.instruction}</p>;
    }
  };

  return (
    <Card
      className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}
    >
      <div className="space-y-4">
        {/* Challenge Header */}
        <div className="flex items-center gap-3">
          <span className="text-4xl">{getChallengeIcon()}</span>
          <h3 className="text-2xl font-bold text-gray-900">
            {getChallengeTitle()}
          </h3>
        </div>

        {/* Challenge Content */}
        <div className="pt-2">{renderChallengeContent()}</div>

        {/* General Instructions */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Recording Instructions
          </h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">1</span>
              <span>Find good lighting and a quiet space</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">2</span>
              <span>Position your camera to capture your face clearly</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">3</span>
              <span>Complete the challenge as instructed above</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold mt-0.5">4</span>
              <span>Keep recording until all requirements are met</span>
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default ChallengeDisplayComponent;
