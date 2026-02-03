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
  const viewBox = 120; // Internal coordinate system (extra padding for glow)
  const center = 60; // Center point
  const circleRadius = 18;
  const startOffset = 28; // Starting distance from center

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
          {/* Soft glow filter for halos */}
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Stronger glow for the flash */}
          <filter id="intenseGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient for left circle - Soft Blue */}
          <radialGradient id="gradientBlue" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#9BB8D8" stopOpacity="1" />
            <stop offset="60%" stopColor="#6B9AC4" stopOpacity="1" />
            <stop offset="100%" stopColor="#5A89B5" stopOpacity="1" />
          </radialGradient>

          {/* Gradient for right circle - Teal */}
          <radialGradient id="gradientTeal" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#4DBDAF" stopOpacity="1" />
            <stop offset="60%" stopColor="#2A9D8F" stopOpacity="1" />
            <stop offset="100%" stopColor="#1F7A6E" stopOpacity="1" />
          </radialGradient>

          {/* Gradient for intersection - transitions through Light Sky */}
          <radialGradient id="intersectionGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="30%" stopColor="#D4EEF0" stopOpacity="0.95" />
            <stop offset="60%" stopColor="#A8DADC" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#A8DADC" stopOpacity="0" />
          </radialGradient>

          {/* Flash/explosion gradient - white core with Light Sky edge */}
          <radialGradient id="explosionFlash" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="25%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="50%" stopColor="#D4EEF0" stopOpacity="0.7" />
            <stop offset="75%" stopColor="#A8DADC" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#A8DADC" stopOpacity="0" />
          </radialGradient>

          {/* Secondary ripple gradient - fainter */}
          <radialGradient id="secondaryRipple" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A8DADC" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#A8DADC" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#A8DADC" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Primary explosion ring */}
        <circle
          className="explosion-ring"
          cx={center}
          cy={center}
          r="0"
          fill="url(#explosionFlash)"
          filter="url(#intenseGlow)"
        />

        {/* Secondary ripple - delayed and fainter */}
        <circle
          className="secondary-ripple"
          cx={center}
          cy={center}
          r="0"
          fill="url(#secondaryRipple)"
        />

        {/* Left circle - Soft Blue with gradient and glow */}
        <circle
          className="circle-left"
          cx={viewBox / 2 - startOffset}
          cy={viewBox / 2}
          r={circleRadius}
          fill="url(#gradientBlue)"
          filter="url(#softGlow)"
          opacity="0.9"
        />

        {/* Right circle - Teal with gradient and glow */}
        <circle
          className="circle-right"
          cx={viewBox / 2 + startOffset}
          cy={viewBox / 2}
          r={circleRadius}
          fill="url(#gradientTeal)"
          filter="url(#softGlow)"
          opacity="0.9"
        />

        {/* Intersection glow - Light Sky blend */}
        <circle
          className="intersection-glow"
          cx={center}
          cy={center}
          r={circleRadius}
          fill="url(#intersectionGlow)"
          filter="url(#softGlow)"
          opacity="0"
        />

        {/* Central flash for the explosion moment */}
        <circle
          className="central-flash"
          cx={center}
          cy={center}
          r={circleRadius}
          fill="url(#explosionFlash)"
          filter="url(#intenseGlow)"
          opacity="0"
        />

        <style>{`
          .loading-bridge {
            --duration: 2s;
          }

          /* Left circle - gravity/attraction physics with brightening */
          .circle-left {
            animation: moveLeft var(--duration) linear infinite;
          }

          /*
           * Physics-based motion with brightening:
           * - Approach (0-48%): Accelerating, circles get BRIGHTER (not dimmer)
           * - Flash (48-52%): Merged at center, circles invisible during flash
           * - Return (52-100%): Fast push, decelerating settle, brightness normalizes
           */
          @keyframes moveLeft {
            /* Approach: slow start, accelerating, getting brighter */
            0% { transform: translateX(0); opacity: 0.7; filter: brightness(1); }
            5% { transform: translateX(0px); opacity: 0.72; filter: brightness(1); }
            10% { transform: translateX(1px); opacity: 0.74; filter: brightness(1.02); }
            15% { transform: translateX(2px); opacity: 0.76; filter: brightness(1.05); }
            20% { transform: translateX(3px); opacity: 0.78; filter: brightness(1.08); }
            25% { transform: translateX(6px); opacity: 0.82; filter: brightness(1.12); }
            30% { transform: translateX(10px); opacity: 0.86; filter: brightness(1.18); }
            35% { transform: translateX(16px); opacity: 0.90; filter: brightness(1.25); }
            40% { transform: translateX(22px); opacity: 0.94; filter: brightness(1.35); }
            45% { transform: translateX(26px); opacity: 0.97; filter: brightness(1.5); }
            48% { transform: translateX(28px); opacity: 0.6; filter: brightness(1.8); }
            /* Merged at center - fade out for explosion */
            50% { transform: translateX(28px); opacity: 0; filter: brightness(2); }
            52% { transform: translateX(28px); opacity: 0; filter: brightness(1); }
            /* Return: fast explosion push, decelerating settle */
            55% { transform: translateX(22px); opacity: 0.25; filter: brightness(1); }
            60% { transform: translateX(16px); opacity: 0.45; filter: brightness(1); }
            65% { transform: translateX(10px); opacity: 0.55; filter: brightness(1); }
            70% { transform: translateX(6px); opacity: 0.62; filter: brightness(1); }
            75% { transform: translateX(3px); opacity: 0.65; filter: brightness(1); }
            80% { transform: translateX(2px); opacity: 0.67; filter: brightness(1); }
            85% { transform: translateX(1px); opacity: 0.68; filter: brightness(1); }
            90% { transform: translateX(0.5px); opacity: 0.69; filter: brightness(1); }
            95% { transform: translateX(0px); opacity: 0.7; filter: brightness(1); }
            100% { transform: translateX(0); opacity: 0.7; filter: brightness(1); }
          }

          /* Right circle - mirrors left with same physics and brightening */
          .circle-right {
            animation: moveRight var(--duration) linear infinite;
          }

          @keyframes moveRight {
            /* Approach: slow start, accelerating, getting brighter */
            0% { transform: translateX(0); opacity: 0.7; filter: brightness(1); }
            5% { transform: translateX(0px); opacity: 0.72; filter: brightness(1); }
            10% { transform: translateX(-1px); opacity: 0.74; filter: brightness(1.02); }
            15% { transform: translateX(-2px); opacity: 0.76; filter: brightness(1.05); }
            20% { transform: translateX(-3px); opacity: 0.78; filter: brightness(1.08); }
            25% { transform: translateX(-6px); opacity: 0.82; filter: brightness(1.12); }
            30% { transform: translateX(-10px); opacity: 0.86; filter: brightness(1.18); }
            35% { transform: translateX(-16px); opacity: 0.90; filter: brightness(1.25); }
            40% { transform: translateX(-22px); opacity: 0.94; filter: brightness(1.35); }
            45% { transform: translateX(-26px); opacity: 0.97; filter: brightness(1.5); }
            48% { transform: translateX(-28px); opacity: 0.6; filter: brightness(1.8); }
            /* Merged at center - fade out for explosion */
            50% { transform: translateX(-28px); opacity: 0; filter: brightness(2); }
            52% { transform: translateX(-28px); opacity: 0; filter: brightness(1); }
            /* Return: fast explosion push, decelerating settle */
            55% { transform: translateX(-22px); opacity: 0.25; filter: brightness(1); }
            60% { transform: translateX(-16px); opacity: 0.45; filter: brightness(1); }
            65% { transform: translateX(-10px); opacity: 0.55; filter: brightness(1); }
            70% { transform: translateX(-6px); opacity: 0.62; filter: brightness(1); }
            75% { transform: translateX(-3px); opacity: 0.65; filter: brightness(1); }
            80% { transform: translateX(-2px); opacity: 0.67; filter: brightness(1); }
            85% { transform: translateX(-1px); opacity: 0.68; filter: brightness(1); }
            90% { transform: translateX(-0.5px); opacity: 0.69; filter: brightness(1); }
            95% { transform: translateX(0px); opacity: 0.7; filter: brightness(1); }
            100% { transform: translateX(0); opacity: 0.7; filter: brightness(1); }
          }

          /* Intersection glow - ONLY appears at merge point, not before */
          .intersection-glow {
            animation: glowIntersection var(--duration) linear infinite;
            transform-origin: 60px 60px;
          }

          @keyframes glowIntersection {
            /* Stay invisible until circles nearly merge */
            0% { opacity: 0; transform: scale(0.5); }
            45% { opacity: 0; transform: scale(0.5); }
            /* Quick buildup right at merge */
            48% { opacity: 0.4; transform: scale(0.85); }
            50% { opacity: 1; transform: scale(1); }
            52% { opacity: 0.8; transform: scale(1.1); }
            55% { opacity: 0.4; transform: scale(1.2); }
            60% { opacity: 0; transform: scale(1.3); }
            100% { opacity: 0; transform: scale(0.5); }
          }

          /* Central flash - ONLY at merge moment */
          .central-flash {
            animation: flash var(--duration) linear infinite;
            transform-origin: 60px 60px;
          }

          @keyframes flash {
            /* Stay invisible until merge */
            0% { opacity: 0; transform: scale(0.5); }
            47% { opacity: 0; transform: scale(0.8); }
            /* Instant flash at merge */
            49% { opacity: 0.7; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1); }
            51% { opacity: 0.95; transform: scale(1.2); }
            53% { opacity: 0.8; transform: scale(1.5); }
            56% { opacity: 0.5; transform: scale(1.8); }
            60% { opacity: 0.25; transform: scale(2.1); }
            65% { opacity: 0; transform: scale(2.4); }
            100% { opacity: 0; transform: scale(0.5); }
          }

          /* Primary explosion ring - ONLY at merge */
          .explosion-ring {
            animation: explode var(--duration) linear infinite;
            transform-origin: 60px 60px;
          }

          @keyframes explode {
            /* Stay invisible until merge */
            0% { r: 0; opacity: 0; }
            48% { r: 0; opacity: 0; }
            /* Expand at merge */
            50% { r: 12; opacity: 0.8; }
            53% { r: 25; opacity: 0.6; }
            57% { r: 35; opacity: 0.4; }
            62% { r: 43; opacity: 0.2; }
            68% { r: 50; opacity: 0; }
            100% { r: 0; opacity: 0; }
          }

          /* Secondary ripple - delayed after primary */
          .secondary-ripple {
            animation: secondaryExplode var(--duration) linear infinite;
            transform-origin: 60px 60px;
          }

          @keyframes secondaryExplode {
            /* Stay invisible until after primary explosion starts */
            0% { r: 0; opacity: 0; }
            52% { r: 0; opacity: 0; }
            /* Delayed expansion */
            55% { r: 8; opacity: 0.4; }
            60% { r: 20; opacity: 0.3; }
            67% { r: 35; opacity: 0.15; }
            75% { r: 45; opacity: 0; }
            100% { r: 0; opacity: 0; }
          }
        `}</style>
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default LoadingBridge;
