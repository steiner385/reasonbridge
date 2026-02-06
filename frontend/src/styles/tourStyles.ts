/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Styles } from 'react-joyride';

/**
 * Custom styles for Joyride tour tooltips with dark mode support
 */
export const getTourStyles = (isDark: boolean): Styles => ({
  options: {
    arrowColor: isDark ? '#1f2937' : '#ffffff',
    backgroundColor: isDark ? '#1f2937' : '#ffffff',
    overlayColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    primaryColor: isDark ? '#60a5fa' : '#2563eb',
    textColor: isDark ? '#e5e7eb' : '#1f2937',
    zIndex: 10000,
  },
  tooltip: {
    borderRadius: '0.75rem',
    padding: '1.25rem',
    boxShadow: isDark
      ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
      : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  tooltipContainer: {
    textAlign: 'left',
  },
  tooltipTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: isDark ? '#f3f4f6' : '#111827',
  },
  tooltipContent: {
    fontSize: '0.9375rem',
    lineHeight: 1.6,
    padding: '0.5rem 0',
    color: isDark ? '#d1d5db' : '#4b5563',
  },
  tooltipFooter: {
    marginTop: '1rem',
  },
  buttonNext: {
    backgroundColor: isDark ? '#2563eb' : '#3b82f6',
    color: '#ffffff',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '0.5rem 1rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 200ms',
  },
  buttonBack: {
    backgroundColor: 'transparent',
    color: isDark ? '#9ca3af' : '#6b7280',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '0.5rem 1rem',
    border: 'none',
    cursor: 'pointer',
    marginRight: '0.5rem',
    transition: 'color 200ms',
  },
  buttonSkip: {
    backgroundColor: 'transparent',
    color: isDark ? '#9ca3af' : '#6b7280',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '0.5rem 1rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'color 200ms',
  },
  buttonClose: {
    color: isDark ? '#9ca3af' : '#6b7280',
    width: '1.5rem',
    height: '1.5rem',
    padding: 0,
  },
  beacon: {
    backgroundColor: isDark ? '#3b82f6' : '#2563eb',
  },
  beaconInner: {
    backgroundColor: isDark ? '#60a5fa' : '#3b82f6',
  },
  beaconOuter: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.2)',
    border: `2px solid ${isDark ? '#3b82f6' : '#2563eb'}`,
  },
  spotlight: {
    borderRadius: '0.5rem',
  },
  spotlightLegacy: {
    borderRadius: '0.5rem',
  },
  overlay: {
    mixBlendMode: 'normal',
  },
  overlayLegacy: {
    mixBlendMode: 'normal',
  },
  overlayLegacyCenter: {
    backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
  },
  tooltipFooterSpacer: {
    flex: 1,
  },
});

/**
 * Custom locale strings for Joyride
 */
export const tourLocale = {
  back: 'Back',
  close: 'Close',
  last: 'Finish',
  next: 'Next',
  open: 'Open',
  skip: 'Skip tour',
};
