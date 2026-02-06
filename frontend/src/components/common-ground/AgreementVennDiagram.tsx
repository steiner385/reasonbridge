/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Disagreement } from '../../types/common-ground';

export interface AgreementVennDiagramProps {
  /**
   * Disagreement data to visualize (shows overlap in positions)
   */
  disagreement: Disagreement;

  /**
   * Optional title for the diagram
   */
  title?: string;

  /**
   * Optional callback when a position circle is clicked
   */
  onPositionClick?: (positionIndex: number) => void;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Size of the diagram (default: 'medium')
   */
  size?: 'small' | 'medium' | 'large';
}

/**
 * Get size dimensions based on size prop
 */
const getSizeDimensions = (size: 'small' | 'medium' | 'large') => {
  const dimensions = {
    small: { width: 300, height: 200, radius: 60 },
    medium: { width: 400, height: 250, radius: 75 },
    large: { width: 500, height: 300, radius: 90 },
  };
  return dimensions[size];
};

/**
 * Color palette for positions
 */
const POSITION_COLORS = [
  { fill: 'rgba(59, 130, 246, 0.5)', stroke: 'rgb(37, 99, 235)', text: 'text-blue-700' },
  { fill: 'rgba(239, 68, 68, 0.5)', stroke: 'rgb(220, 38, 38)', text: 'text-red-700' },
  { fill: 'rgba(34, 197, 94, 0.5)', stroke: 'rgb(22, 163, 74)', text: 'text-green-700' },
];

/**
 * AgreementVennDiagram - Visualizes position overlap in a disagreement
 *
 * This component shows how different positions in a disagreement relate to each other
 * using a Venn-style diagram. When there are 2-3 positions, circles are positioned
 * to show potential overlap or separation.
 */
const AgreementVennDiagram = ({
  disagreement,
  title,
  onPositionClick,
  className = '',
  size = 'medium',
}: AgreementVennDiagramProps) => {
  const { width, height, radius } = getSizeDimensions(size);
  const positions = disagreement.positions.slice(0, 3); // Max 3 positions for Venn

  if (positions.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sm text-gray-500">No positions to display</p>
      </div>
    );
  }

  // Calculate circle positions based on number of positions
  const getCirclePositions = () => {
    const centerX = width / 2;
    const centerY = height / 2;

    if (positions.length === 1) {
      return [{ x: centerX, y: centerY }];
    }

    if (positions.length === 2) {
      const offset = radius * 0.6;
      return [
        { x: centerX - offset, y: centerY },
        { x: centerX + offset, y: centerY },
      ];
    }

    // 3 positions - arranged in triangle
    const offset = radius * 0.5;
    return [
      { x: centerX, y: centerY - offset },
      { x: centerX - offset, y: centerY + offset * 0.7 },
      { x: centerX + offset, y: centerY + offset * 0.7 },
    ];
  };

  const circlePositions = getCirclePositions();

  return (
    <div className={className}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>}

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-md font-medium text-gray-800 mb-3">{disagreement.topic}</h4>
        <p className="text-sm text-gray-600 mb-6">{disagreement.description}</p>

        {/* SVG Venn Diagram */}
        <div className="flex justify-center mb-6">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="border border-gray-100 rounded"
            role="img"
            aria-label={`Venn diagram showing ${positions.length} positions on ${disagreement.topic}`}
          >
            {/* Background */}
            <rect width={width} height={height} fill="#f9fafb" />

            {/* Circles for each position */}
            {circlePositions.map((pos, idx) => {
              const color = POSITION_COLORS[idx % POSITION_COLORS.length]!;
              return (
                <g key={idx}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius}
                    fill={color.fill}
                    stroke={color.stroke}
                    strokeWidth="2"
                    className={onPositionClick ? 'cursor-pointer hover:opacity-80' : ''}
                    onClick={() => onPositionClick?.(idx)}
                    role={onPositionClick ? 'button' : undefined}
                    tabIndex={onPositionClick ? 0 : undefined}
                  />
                  {/* Position label */}
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-semibold pointer-events-none"
                    fill={color.stroke}
                  >
                    {positions[idx]?.participants.length ?? 0}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Position details */}
        <div className="space-y-4">
          {positions.map((position, idx) => {
            const color = POSITION_COLORS[idx % POSITION_COLORS.length]!;
            return (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 bg-gray-50 ${
                  onPositionClick ? 'cursor-pointer hover:bg-gray-100' : ''
                }`}
                style={{ borderColor: color.stroke }}
                onClick={() => onPositionClick?.(idx)}
                role={onPositionClick ? 'button' : 'article'}
                tabIndex={onPositionClick ? 0 : undefined}
                onKeyPress={(e) => {
                  if (onPositionClick && (e.key === 'Enter' || e.key === ' ')) {
                    onPositionClick(idx);
                  }
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-block w-4 h-4 rounded-full"
                    style={{ backgroundColor: color.stroke }}
                  />
                  <h5 className={`font-medium ${color.text}`}>{position.stance}</h5>
                  <span className="ml-auto text-xs text-gray-500">
                    {position.participants.length} participant(s)
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{position.reasoning}</p>
                {(position.underlyingValue || position.underlyingAssumption) && (
                  <div className="text-xs text-gray-600 space-y-1 mt-2 pt-2 border-t border-gray-200">
                    {position.underlyingValue && (
                      <p>
                        <span className="font-medium">Core value:</span> {position.underlyingValue}
                      </p>
                    )}
                    {position.underlyingAssumption && (
                      <p>
                        <span className="font-medium">Assumption:</span>{' '}
                        {position.underlyingAssumption}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Moral foundations if available */}
        {disagreement.moralFoundations && disagreement.moralFoundations.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">Relevant Moral Foundations:</p>
            <div className="flex flex-wrap gap-2">
              {disagreement.moralFoundations.map((foundation) => (
                <span
                  key={foundation}
                  className="inline-block text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded"
                >
                  {foundation}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Interpretation note */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <span className="font-medium">Note:</span> Circle size represents the number of
          participants holding each position. Overlapping areas suggest potential for finding common
          ground through dialogue.
        </p>
      </div>
    </div>
  );
};

export default AgreementVennDiagram;
