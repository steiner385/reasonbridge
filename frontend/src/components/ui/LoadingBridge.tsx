import React from 'react';

export interface LoadingBridgeProps {
  /** Size of the loader */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional className for custom styling */
  className?: string;
  /** Accessible label for screen readers */
  label?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

/**
 * LoadingBridge - Animated loading indicator based on the ReasonBridge logo concept.
 *
 * Animation sequence:
 * 1. Two circles (Soft Blue + Teal) start apart
 * 2. They glide together, forming the Venn overlap
 * 3. Continue merging until they become one circle
 * 4. Flash bright white like an "atomic explosion" of understanding
 * 5. Fade back to two separate circles and repeat
 */
export const LoadingBridge: React.FC<LoadingBridgeProps> = ({
  size = 'md',
  className = '',
  label = 'Loading...',
}) => {
  const dimension = sizeMap[size];
  const viewBox = 100; // Internal coordinate system
  const circleRadius = 20;
  const startOffset = 35; // Starting distance from center

  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-label={label}
    >
      <svg
        width={dimension}
        height={dimension}
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        className="loading-bridge"
      >
        <defs>
          {/* Gradient for the intersection "football" */}
          <radialGradient id="intersectionGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="50%" stopColor="#A8DADC" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#A8DADC" stopOpacity="0" />
          </radialGradient>

          {/* Flash/explosion gradient */}
          <radialGradient id="explosionFlash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="70%" stopColor="#A8DADC" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A8DADC" stopOpacity="0" />
          </radialGradient>

          {/* Clip path for intersection (football shape) */}
          <clipPath id="footballClip">
            <circle className="clip-left" cx="50" cy="50" r={circleRadius} />
          </clipPath>
        </defs>

        {/* Background circle for explosion effect */}
        <circle className="explosion-ring" cx="50" cy="50" r="0" fill="url(#explosionFlash)" />

        {/* Left circle - Soft Blue */}
        <circle
          className="circle-left"
          cx={viewBox / 2 - startOffset}
          cy={viewBox / 2}
          r={circleRadius}
          fill="#6B9AC4"
          opacity="0.85"
        />

        {/* Right circle - Teal */}
        <circle
          className="circle-right"
          cx={viewBox / 2 + startOffset}
          cy={viewBox / 2}
          r={circleRadius}
          fill="#2A9D8F"
          opacity="0.85"
        />

        {/* Intersection glow overlay */}
        <circle
          className="intersection-glow"
          cx="50"
          cy="50"
          r={circleRadius}
          fill="url(#intersectionGlow)"
          opacity="0"
        />

        {/* Central flash for the explosion moment */}
        <circle
          className="central-flash"
          cx="50"
          cy="50"
          r={circleRadius}
          fill="#FFFFFF"
          opacity="0"
        />

        <style>{`
          .loading-bridge {
            --duration: 3s;
            --ease: cubic-bezier(0.4, 0, 0.2, 1);
          }

          /* Left circle animation - moves right then back */
          .circle-left {
            animation: moveLeft var(--duration) var(--ease) infinite;
          }

          @keyframes moveLeft {
            0% {
              transform: translateX(0);
              opacity: 0.85;
            }
            /* Approach */
            30% {
              transform: translateX(25px);
              opacity: 0.85;
            }
            /* Full merge */
            45% {
              transform: translateX(35px);
              opacity: 0.7;
            }
            /* Flash moment - circles at center */
            50% {
              transform: translateX(35px);
              opacity: 0;
            }
            /* Hold during flash */
            60% {
              transform: translateX(35px);
              opacity: 0;
            }
            /* Reappear separated */
            75% {
              transform: translateX(0);
              opacity: 0;
            }
            /* Fade back in */
            100% {
              transform: translateX(0);
              opacity: 0.85;
            }
          }

          /* Right circle animation - moves left then back */
          .circle-right {
            animation: moveRight var(--duration) var(--ease) infinite;
          }

          @keyframes moveRight {
            0% {
              transform: translateX(0);
              opacity: 0.85;
            }
            /* Approach */
            30% {
              transform: translateX(-25px);
              opacity: 0.85;
            }
            /* Full merge */
            45% {
              transform: translateX(-35px);
              opacity: 0.7;
            }
            /* Flash moment - circles at center */
            50% {
              transform: translateX(-35px);
              opacity: 0;
            }
            /* Hold during flash */
            60% {
              transform: translateX(-35px);
              opacity: 0;
            }
            /* Reappear separated */
            75% {
              transform: translateX(0);
              opacity: 0;
            }
            /* Fade back in */
            100% {
              transform: translateX(0);
              opacity: 0.85;
            }
          }

          /* Intersection glow - appears during overlap, intensifies */
          .intersection-glow {
            animation: glowIntersection var(--duration) var(--ease) infinite;
          }

          @keyframes glowIntersection {
            0% {
              opacity: 0;
              transform: scale(0.5);
            }
            /* Start glowing as circles overlap */
            25% {
              opacity: 0.3;
              transform: scale(0.6);
            }
            /* Intensify */
            40% {
              opacity: 0.8;
              transform: scale(0.9);
            }
            /* Peak before flash */
            48% {
              opacity: 1;
              transform: scale(1);
            }
            /* Flash takes over */
            50% {
              opacity: 0;
              transform: scale(1.2);
            }
            100% {
              opacity: 0;
              transform: scale(0.5);
            }
          }

          /* Central flash - the "atomic explosion" */
          .central-flash {
            animation: flash var(--duration) var(--ease) infinite;
          }

          @keyframes flash {
            0%, 45% {
              opacity: 0;
              transform: scale(0.8);
            }
            /* FLASH! */
            50% {
              opacity: 1;
              transform: scale(1);
            }
            /* Expand and fade */
            55% {
              opacity: 0.9;
              transform: scale(1.3);
            }
            60% {
              opacity: 0.5;
              transform: scale(1.6);
            }
            70% {
              opacity: 0;
              transform: scale(2);
            }
            100% {
              opacity: 0;
              transform: scale(0.8);
            }
          }

          /* Explosion ring - shockwave effect */
          .explosion-ring {
            animation: explode var(--duration) var(--ease) infinite;
            transform-origin: center;
          }

          @keyframes explode {
            0%, 48% {
              r: 0;
              opacity: 0;
            }
            50% {
              r: 15;
              opacity: 0.8;
            }
            60% {
              r: 40;
              opacity: 0.4;
            }
            70% {
              r: 50;
              opacity: 0;
            }
            100% {
              r: 0;
              opacity: 0;
            }
          }
        `}</style>
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingBridge;
