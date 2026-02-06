/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { ToneIndicatorProps, ToneLevel } from '../../types/feedback';

/**
 * Configuration for each tone level
 */
const TONE_CONFIG: Record<
  ToneLevel,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
    position: number;
  }
> = {
  calm: {
    label: 'Calm',
    color: 'text-green-700',
    bgColor: 'bg-green-500',
    borderColor: 'border-green-500',
    description: 'Constructive and measured tone',
    position: 0,
  },
  neutral: {
    label: 'Neutral',
    color: 'text-blue-700',
    bgColor: 'bg-blue-500',
    borderColor: 'border-blue-500',
    description: 'Balanced and objective tone',
    position: 25,
  },
  assertive: {
    label: 'Assertive',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-500',
    borderColor: 'border-yellow-500',
    description: 'Strong but respectful tone',
    position: 50,
  },
  heated: {
    label: 'Heated',
    color: 'text-orange-700',
    bgColor: 'bg-orange-500',
    borderColor: 'border-orange-500',
    description: 'Passionate and intense tone',
    position: 75,
  },
  hostile: {
    label: 'Hostile',
    color: 'text-red-700',
    bgColor: 'bg-red-500',
    borderColor: 'border-red-500',
    description: 'May contain inflammatory language',
    position: 100,
  },
};

/**
 * Size configurations for the indicator
 */
const SIZE_CONFIG = {
  sm: {
    gaugeHeight: 'h-2',
    markerSize: 'w-3 h-3',
    fontSize: 'text-xs',
    padding: 'p-2',
  },
  md: {
    gaugeHeight: 'h-3',
    markerSize: 'w-4 h-4',
    fontSize: 'text-sm',
    padding: 'p-3',
  },
  lg: {
    gaugeHeight: 'h-4',
    markerSize: 'w-5 h-5',
    fontSize: 'text-base',
    padding: 'p-4',
  },
};

/**
 * ToneIndicator - Visualizes the emotional tone of content
 *
 * Displays a gauge or compact indicator showing tone level from
 * calm (green) to hostile (red). Supports multiple variants:
 * - gauge: Full visual gauge with gradient and marker
 * - compact: Badge-style indicator with color coding
 * - inline: Minimal inline indicator for tight spaces
 */
const ToneIndicator: React.FC<ToneIndicatorProps> = ({
  tone,
  variant = 'gauge',
  showSuggestion = true,
  showConfidence = true,
  className = '',
  size = 'md',
  onClick,
}) => {
  const config = TONE_CONFIG[tone.level];
  const sizeConfig = SIZE_CONFIG[size];
  const isInteractive = Boolean(onClick);

  // Render inline variant
  if (variant === 'inline') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 ${className}`}
        role="status"
        aria-label={`Tone: ${config.label}`}
      >
        <span
          className={`inline-block w-2 h-2 rounded-full ${config.bgColor}`}
          aria-hidden="true"
        />
        <span className={`${sizeConfig.fontSize} ${config.color} font-medium`}>{config.label}</span>
      </span>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!isInteractive}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full
          border ${config.borderColor} ${config.bgColor} bg-opacity-10
          ${isInteractive ? 'cursor-pointer hover:bg-opacity-20 transition-colors' : 'cursor-default'}
          ${className}
        `}
        role="status"
        aria-label={`Tone: ${config.label}, ${Math.round(tone.confidenceScore * 100)}% confidence`}
      >
        <span className={`w-2.5 h-2.5 rounded-full ${config.bgColor}`} aria-hidden="true" />
        <span className={`${sizeConfig.fontSize} ${config.color} font-semibold`}>
          {config.label}
        </span>
        {showConfidence && (
          <span className={`${sizeConfig.fontSize} text-gray-500`}>
            {Math.round(tone.confidenceScore * 100)}%
          </span>
        )}
      </button>
    );
  }

  // Render full gauge variant
  return (
    <div
      className={`${sizeConfig.padding} rounded-lg bg-white shadow-sm border border-gray-200 ${className}`}
      role="region"
      aria-label="Tone analysis indicator"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${config.bgColor}`} aria-hidden="true" />
          <span className={`${sizeConfig.fontSize} font-semibold ${config.color}`}>
            {config.label} Tone
          </span>
        </div>
        {showConfidence && (
          <span className={`${sizeConfig.fontSize} text-gray-500`}>
            {Math.round(tone.confidenceScore * 100)}% confident
          </span>
        )}
      </div>

      {/* Gauge */}
      <div className="relative mb-4">
        {/* Gradient bar */}
        <div
          className={`${sizeConfig.gaugeHeight} rounded-full overflow-hidden`}
          style={{
            background: 'linear-gradient(to right, #22c55e, #3b82f6, #eab308, #f97316, #ef4444)',
          }}
          role="presentation"
        />

        {/* Marker */}
        <div
          className={`
            absolute top-1/2 -translate-y-1/2 ${sizeConfig.markerSize}
            rounded-full bg-white border-2 ${config.borderColor}
            shadow-md transition-all duration-300
          `}
          style={{
            left: `calc(${config.position}% - ${size === 'sm' ? 6 : size === 'md' ? 8 : 10}px)`,
          }}
          role="slider"
          aria-valuenow={config.position}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={config.label}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>Calm</span>
        <span>Neutral</span>
        <span>Assertive</span>
        <span>Heated</span>
        <span>Hostile</span>
      </div>

      {/* Description */}
      <p className={`${sizeConfig.fontSize} text-gray-600 mb-2`}>{config.description}</p>

      {/* Suggestion */}
      {showSuggestion && tone.suggestion && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className={`${sizeConfig.fontSize} text-gray-700`}>
            <span className="font-medium">Suggestion: </span>
            {tone.suggestion}
          </p>
        </div>
      )}

      {/* Subtype indicator */}
      {tone.subtype && (
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">
            {tone.subtype.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      {/* Interactive click area */}
      {isInteractive && (
        <button
          type="button"
          onClick={onClick}
          className="mt-3 w-full text-center text-sm text-primary-600 hover:text-primary-800 transition-colors"
        >
          View details
        </button>
      )}
    </div>
  );
};

export default ToneIndicator;
