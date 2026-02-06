/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Orientation Step Content Components
 *
 * Visual content for the 3-step orientation overlay explaining how the platform works.
 */

import React from 'react';

/**
 * Step 1: How proposition-based discussions work
 */
export const Step1PropositionBased: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Welcome to Proposition-Based Discussions
        </h2>
        <p className="text-lg text-gray-600">
          Discussions are built from individual propositions. Vote on each one to show your
          perspective.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-2 border-primary-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          How It Works: Breaking Down Complex Topics
        </h3>

        <div className="space-y-4">
          {/* Example Proposition 1 */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-500">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium">
                  Public transit infrastructure must improve before implementing car bans
                </p>
                <p className="text-sm text-gray-600 mt-1">73% Agreement</p>
              </div>
            </div>
          </div>

          {/* Example Proposition 2 */}
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg p-4 border-l-4 border-yellow-500">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium">
                  A hard deadline creates urgency but may be unrealistic for some regions
                </p>
                <p className="text-sm text-gray-600 mt-1">Mixed Views (45% Agreement)</p>
              </div>
            </div>
          </div>

          {/* Example Proposition 3 */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-500">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-medium">
                  Electric vehicle incentives should increase to accelerate adoption
                </p>
                <p className="text-sm text-gray-600 mt-1">62% Agreement</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Your Turn:</span> Vote on each proposition to share your
            perspective. Your votes help identify common ground and areas of disagreement.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Step 2: What AI feedback provides
 */
export const Step2AIFeedback: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">AI-Powered Discussion Insights</h2>
        <p className="text-lg text-gray-600">
          Our AI analyzes discussions to find areas of agreement and highlight diverse viewpoints.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-2 border-primary-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Sample AI Insights</h3>

        <div className="space-y-6">
          {/* Common Ground Finding */}
          <div className="bg-green-50 rounded-lg p-5 border border-green-200">
            <div className="flex items-start mb-3">
              <div className="flex-shrink-0 mr-3">
                <div className="bg-green-500 rounded-full p-2">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 mb-1">Common Ground Identified</h4>
                <p className="text-gray-700 text-sm">
                  Despite different views on the main question, participants broadly agree that
                  infrastructure improvements are a prerequisite for success.
                </p>
              </div>
            </div>
          </div>

          {/* Bridging Opportunity */}
          <div className="bg-blue-50 rounded-lg p-5 border border-blue-200">
            <div className="flex items-start mb-3">
              <div className="flex-shrink-0 mr-3">
                <div className="bg-blue-500 rounded-full p-2">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 mb-1">Bridging Opportunity</h4>
                <p className="text-gray-700 text-sm">
                  Propositions about phased implementation and regional flexibility could bridge
                  perspectives between immediate action advocates and gradual transition supporters.
                </p>
              </div>
            </div>
          </div>

          {/* Diverse Perspectives */}
          <div className="bg-purple-50 rounded-lg p-5 border border-purple-200">
            <div className="flex items-start mb-3">
              <div className="flex-shrink-0 mr-3">
                <div className="bg-purple-500 rounded-full p-2">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-purple-900 mb-1">Diverse Perspectives Valued</h4>
                <p className="text-gray-700 text-sm">
                  This discussion includes voices from urban planners, environmental scientists, and
                  automotive industry workers, enriching the conversation with varied expertise.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Remember:</span> AI insights are helpful suggestions to
            improve your thinking, not criticism. They help you see connections and perspectives you
            might have missed.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Step 3: How to find common ground
 */
export const Step3CommonGround: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Finding Common Ground Together</h2>
        <p className="text-lg text-gray-600">
          See what percentage of participants agree, and explore the spectrum of opinions.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 border-2 border-primary-200">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">
          Visualizing Agreement and Disagreement
        </h3>

        <div className="space-y-6">
          {/* Agreement Spectrum Visualization */}
          <div className="bg-gradient-to-r from-red-50 via-yellow-50 to-green-50 rounded-lg p-5 border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">Agreement Spectrum</h4>
            <div className="relative h-8 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full">
              {/* Sample distribution markers */}
              <div className="absolute top-0 left-[15%] w-1 h-full bg-gray-800 opacity-30"></div>
              <div className="absolute top-0 left-[35%] w-1 h-full bg-gray-800 opacity-30"></div>
              <div className="absolute top-0 left-[55%] w-1 h-full bg-gray-800 opacity-50"></div>
              <div className="absolute top-0 left-[70%] w-1 h-full bg-gray-800 opacity-30"></div>
              <div className="absolute top-0 left-[85%] w-1 h-full bg-gray-800 opacity-30"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-2">
              <span>Strongly Disagree</span>
              <span>Neutral</span>
              <span>Strongly Agree</span>
            </div>
            <p className="text-sm text-gray-700 mt-3">
              See where other participants stand on each proposition. Clustering shows areas of
              consensus, while spread indicates diverse views.
            </p>
          </div>

          {/* Voting Results Example */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3">Example: Discussion Results</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Strong Agreement</span>
                  <span className="font-semibold text-green-600">45%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-500 h-3 rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Moderate Agreement</span>
                  <span className="font-semibold text-green-400">28%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-green-300 h-3 rounded-full" style={{ width: '28%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Neutral</span>
                  <span className="font-semibold text-yellow-500">12%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-yellow-300 h-3 rounded-full" style={{ width: '12%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">Disagreement</span>
                  <span className="font-semibold text-red-400">15%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-red-300 h-3 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              <span className="font-semibold">Common Ground Found:</span> 73% of participants agree
              or strongly agree on this proposition.
            </p>
          </div>

          {/* What This Means */}
          <div className="bg-primary-50 rounded-lg p-5 border border-primary-200">
            <h4 className="font-semibold text-primary-900 mb-2">What This Means For You</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <svg
                  className="h-5 w-5 text-primary-600 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Focus on propositions with high agreement to build momentum</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="h-5 w-5 text-primary-600 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Explore diverse perspectives to understand different viewpoints</span>
              </li>
              <li className="flex items-start">
                <svg
                  className="h-5 w-5 text-primary-600 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  Contribute your unique perspective to help the community find new common ground
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Ready to Start:</span> Jump into discussions and add
            your voice. Every perspective helps us understand the full picture.
          </p>
        </div>
      </div>
    </div>
  );
};
