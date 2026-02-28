/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Collapsed Metadata Bar
 *
 * A 48px wide vertical icon bar that displays when the metadata panel
 * is collapsed. Icons provide quick access to different panel tabs.
 *
 * @remarks
 * **Layout**:
 * - Vertical stack of icon buttons
 * - 48px width to accommodate 44px touch targets (WCAG 2.1 AA)
 * - Fixed position on right edge of layout
 *
 * **Icons**:
 * - Propositions: List/document icon
 * - Common Ground: Handshake/people icon
 * - Bridging: Lightning/connection icon
 * - Preview: Eye icon (shown only when composing)
 * - Expand: Chevron left to expand panel
 *
 * **Interaction**:
 * - Click icon → Expand panel to that specific tab
 * - Tooltips on hover for accessibility
 *
 * @example
 * ```tsx
 * <CollapsedMetadataBar
 *   onExpandToTab={(tab) => handleExpandToTab(tab)}
 *   isComposing={isComposing}
 *   activeTab={activeTab}
 * />
 * ```
 */

import type { MetadataPanelTab } from './MetadataPanel';

export interface CollapsedMetadataBarProps {
  /** Callback when an icon is clicked to expand to that tab */
  onExpandToTab: (tab: MetadataPanelTab) => void;
  /** Whether user is currently composing (shows Preview icon) */
  isComposing?: boolean;
  /** Currently active tab (for highlighting) */
  activeTab?: MetadataPanelTab;
  /** Callback when expand button is clicked */
  onExpand: () => void;
  /** CSS class name */
  className?: string;
}

interface IconButtonProps {
  tab: MetadataPanelTab;
  label: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onClick: () => void;
}

/**
 * Individual icon button with tooltip
 */
function IconButton({ tab, label, icon, isActive, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-11 h-11 flex items-center justify-center rounded-lg
        transition-colors duration-150
        ${
          isActive
            ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
        }
      `}
      aria-label={`Open ${label} panel`}
      title={label}
      data-tab={tab}
    >
      {icon}
    </button>
  );
}

/**
 * SVG Icons for each tab
 */
const PropositionsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
    />
  </svg>
);

const CommonGroundIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

const BridgingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

const PreviewIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const ExpandIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

export function CollapsedMetadataBar({
  onExpandToTab,
  isComposing = false,
  activeTab = 'propositions',
  onExpand,
  className = '',
}: CollapsedMetadataBarProps) {
  const handleIconClick = (tab: MetadataPanelTab) => {
    onExpandToTab(tab);
  };

  return (
    <div
      className={`
        collapsed-metadata-bar
        w-12 h-full flex flex-col items-center
        bg-gray-50 dark:bg-gray-900
        border-l border-gray-200 dark:border-gray-700
        py-2 gap-1
        ${className}
      `}
      role="toolbar"
      aria-label="Metadata panel shortcuts"
      aria-orientation="vertical"
    >
      {/* Tab Icons */}
      <div className="flex flex-col items-center gap-1">
        <IconButton
          tab="propositions"
          label="Propositions"
          icon={<PropositionsIcon />}
          isActive={activeTab === 'propositions'}
          onClick={() => handleIconClick('propositions')}
        />

        <IconButton
          tab="commonGround"
          label="Common Ground"
          icon={<CommonGroundIcon />}
          isActive={activeTab === 'commonGround'}
          onClick={() => handleIconClick('commonGround')}
        />

        <IconButton
          tab="bridging"
          label="Bridging Suggestions"
          icon={<BridgingIcon />}
          isActive={activeTab === 'bridging'}
          onClick={() => handleIconClick('bridging')}
        />

        {/* Preview icon - only shown when composing */}
        {isComposing && (
          <IconButton
            tab="preview"
            label="Preview Feedback"
            icon={<PreviewIcon />}
            isActive={activeTab === 'preview'}
            onClick={() => handleIconClick('preview')}
          />
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="w-8 h-px bg-gray-200 dark:bg-gray-700 my-2" />

      {/* Expand Button */}
      <button
        type="button"
        onClick={onExpand}
        className="
          w-11 h-11 flex items-center justify-center rounded-lg
          text-gray-600 dark:text-gray-400
          hover:bg-gray-100 dark:hover:bg-gray-800
          hover:text-gray-900 dark:hover:text-gray-100
          transition-colors duration-150
        "
        aria-label="Expand metadata panel"
        title="Expand panel"
      >
        <ExpandIcon />
      </button>
    </div>
  );
}
