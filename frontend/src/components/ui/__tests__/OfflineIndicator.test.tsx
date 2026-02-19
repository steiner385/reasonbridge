/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';

// Mock the useOnlineStatus hook
vi.mock('../../../hooks/useOnlineStatus', () => ({
  useOnlineStatus: vi.fn(),
}));

import { useOnlineStatus } from '../../../hooks/useOnlineStatus';

const mockUseOnlineStatus = vi.mocked(useOnlineStatus);

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default to online state
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isTransitioning: false,
      lastChangedAt: null,
      offlineDuration: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should not render when online', () => {
    render(<OfflineIndicator />);

    expect(screen.queryByTestId('offline-indicator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('online-indicator')).not.toBeInTheDocument();
  });

  it('should render offline banner when offline', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isTransitioning: false,
      lastChangedAt: new Date(),
      offlineDuration: 1000,
    });

    render(<OfflineIndicator />);

    expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  });

  it('should display custom offline message', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isTransitioning: false,
      lastChangedAt: new Date(),
      offlineDuration: 1000,
    });

    render(<OfflineIndicator offlineMessage="Custom offline message" />);

    expect(screen.getByText('Custom offline message')).toBeInTheDocument();
  });

  it('should show online confirmation when transitioning back online', async () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isTransitioning: true,
      lastChangedAt: new Date(),
      offlineDuration: null,
    });

    render(<OfflineIndicator showOnlineConfirmation />);

    expect(screen.getByTestId('online-indicator')).toBeInTheDocument();
    expect(screen.getByText(/You're back online/)).toBeInTheDocument();
  });

  it('should display custom online message', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isTransitioning: true,
      lastChangedAt: new Date(),
      offlineDuration: null,
    });

    render(<OfflineIndicator showOnlineConfirmation onlineMessage="Connection restored!" />);

    expect(screen.getByText('Connection restored!')).toBeInTheDocument();
  });

  it('should hide online confirmation when hook transitions complete', () => {
    // Component derives visibility from hook's isTransitioning state
    // First render: transitioning (shows banner)
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isTransitioning: true,
      lastChangedAt: new Date(),
      offlineDuration: null,
    });

    const { rerender } = render(<OfflineIndicator showOnlineConfirmation />);
    expect(screen.getByTestId('online-indicator')).toBeInTheDocument();

    // Simulate hook's isTransitioning clearing (handled internally by hook timer)
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isTransitioning: false,
      lastChangedAt: new Date(),
      offlineDuration: null,
    });

    rerender(<OfflineIndicator showOnlineConfirmation />);
    expect(screen.queryByTestId('online-indicator')).not.toBeInTheDocument();
  });

  it('should not show online confirmation if disabled', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isTransitioning: true,
      lastChangedAt: new Date(),
      offlineDuration: null,
    });

    render(<OfflineIndicator showOnlineConfirmation={false} />);

    expect(screen.queryByTestId('online-indicator')).not.toBeInTheDocument();
  });

  it('should render at top position by default', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isTransitioning: false,
      lastChangedAt: new Date(),
      offlineDuration: 1000,
    });

    render(<OfflineIndicator />);

    const indicator = screen.getByTestId('offline-indicator');
    expect(indicator.className).toContain('top-0');
  });

  it('should render at bottom position when specified', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isTransitioning: false,
      lastChangedAt: new Date(),
      offlineDuration: 1000,
    });

    render(<OfflineIndicator position="bottom" />);

    const indicator = screen.getByTestId('offline-indicator');
    expect(indicator.className).toContain('bottom-0');
  });

  it('should have proper accessibility attributes for offline state', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isTransitioning: false,
      lastChangedAt: new Date(),
      offlineDuration: 1000,
    });

    render(<OfflineIndicator />);

    const indicator = screen.getByTestId('offline-indicator');
    expect(indicator).toHaveAttribute('role', 'alert');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
    expect(indicator).toHaveAttribute('aria-atomic', 'true');
  });

  it('should have proper accessibility attributes for online state', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: true,
      isTransitioning: true,
      lastChangedAt: new Date(),
      offlineDuration: null,
    });

    render(<OfflineIndicator showOnlineConfirmation />);

    const indicator = screen.getByTestId('online-indicator');
    expect(indicator).toHaveAttribute('role', 'status');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
  });

  it('should apply custom className', () => {
    mockUseOnlineStatus.mockReturnValue({
      isOnline: false,
      isTransitioning: false,
      lastChangedAt: new Date(),
      offlineDuration: 1000,
    });

    render(<OfflineIndicator className="custom-class" />);

    const indicator = screen.getByTestId('offline-indicator');
    expect(indicator.className).toContain('custom-class');
  });
});
