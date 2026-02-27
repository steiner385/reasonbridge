/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PanicButton, SafetyReportReason } from '../PanicButton';
import * as ChildSafetyContext from '../../../contexts/ChildSafetyContext';

// Mock ChildSafetyContext
vi.mock('../../../contexts/ChildSafetyContext', () => ({
  useChildSafety: vi.fn(),
}));

describe('PanicButton', () => {
  const mockUseChildSafety = vi.mocked(ChildSafetyContext.useChildSafety);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: panic button should show
    mockUseChildSafety.mockReturnValue({
      isChildMode: true,
      uiTheme: 'child-friendly',
      restrictedFeatures: [],
      showPanicButton: true,
      isFeatureRestricted: () => false,
    });
  });

  describe('Visibility', () => {
    it('should render when showPanicButton is true from context', () => {
      render(<PanicButton />);

      expect(screen.getByTestId('panic-button')).toBeInTheDocument();
      expect(screen.getByText('Need Help?')).toBeInTheDocument();
    });

    it('should not render when showPanicButton is false from context', () => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: false,
        uiTheme: 'standard',
        restrictedFeatures: [],
        showPanicButton: false,
        isFeatureRestricted: () => false,
      });

      render(<PanicButton />);

      expect(screen.queryByTestId('panic-button')).not.toBeInTheDocument();
    });

    it('should respect show prop over context', () => {
      mockUseChildSafety.mockReturnValue({
        isChildMode: false,
        uiTheme: 'standard',
        restrictedFeatures: [],
        showPanicButton: false,
        isFeatureRestricted: () => false,
      });

      render(<PanicButton show={true} />);

      expect(screen.getByTestId('panic-button')).toBeInTheDocument();
    });

    it('should hide when show prop is false even if context says show', () => {
      render(<PanicButton show={false} />);

      expect(screen.queryByTestId('panic-button')).not.toBeInTheDocument();
    });
  });

  describe('Dialog Opening', () => {
    it('should open dialog when button is clicked', () => {
      render(<PanicButton />);

      fireEvent.click(screen.getByTestId('panic-button'));

      expect(screen.getByTestId('panic-dialog')).toBeInTheDocument();
      expect(screen.getByText("We're Here to Help")).toBeInTheDocument();
    });

    it('should show all reason options in dialog', () => {
      render(<PanicButton />);

      fireEvent.click(screen.getByTestId('panic-button'));

      expect(screen.getByText("I don't feel comfortable")).toBeInTheDocument();
      expect(screen.getByText('I saw something scary')).toBeInTheDocument();
      expect(screen.getByText('Someone is bothering me')).toBeInTheDocument();
      expect(screen.getByText('Someone asked personal questions')).toBeInTheDocument();
      expect(screen.getByText('I want to leave now')).toBeInTheDocument();
      expect(screen.getByText('Something else')).toBeInTheDocument();
    });
  });

  describe('Dialog Closing', () => {
    it('should close dialog when cancel is clicked', () => {
      render(<PanicButton />);

      fireEvent.click(screen.getByTestId('panic-button'));
      expect(screen.getByTestId('panic-dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Cancel'));

      expect(screen.queryByTestId('panic-dialog')).not.toBeInTheDocument();
    });
  });

  describe('Reason Selection', () => {
    it('should highlight selected reason', () => {
      render(<PanicButton />);

      fireEvent.click(screen.getByTestId('panic-button'));
      fireEvent.click(screen.getByTestId('reason-uncomfortable'));

      const button = screen.getByTestId('reason-uncomfortable');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should show additional info textarea when reason selected (except EXIT_QUICKLY)', () => {
      render(<PanicButton />);

      fireEvent.click(screen.getByTestId('panic-button'));
      fireEvent.click(screen.getByTestId('reason-uncomfortable'));

      expect(screen.getByText('Want to tell us more? (optional)')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('You can share more details if you want...'),
      ).toBeInTheDocument();
    });

    it('should show submit button when reason selected (except EXIT_QUICKLY)', () => {
      render(<PanicButton />);

      fireEvent.click(screen.getByTestId('panic-button'));
      fireEvent.click(screen.getByTestId('reason-scary_content'));

      expect(screen.getByTestId('submit-report')).toBeInTheDocument();
      expect(screen.getByText('Send Report')).toBeInTheDocument();
    });
  });

  describe('Exit Quickly', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // Create a mock location object
      const mockLocation = {
        ...originalLocation,
        replace: vi.fn(),
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      });
    });

    it('should redirect immediately when EXIT_QUICKLY is selected', () => {
      render(<PanicButton exitUrl="https://www.safe-site.com" />);

      fireEvent.click(screen.getByTestId('panic-button'));
      fireEvent.click(screen.getByTestId('reason-exit_quickly'));

      expect(window.location.replace).toHaveBeenCalledWith('https://www.safe-site.com');
    });

    it('should use default exit URL if not provided', () => {
      render(<PanicButton />);

      fireEvent.click(screen.getByTestId('panic-button'));
      fireEvent.click(screen.getByTestId('reason-exit_quickly'));

      expect(window.location.replace).toHaveBeenCalledWith('https://www.google.com');
    });
  });

  describe('Report Submission', () => {
    it('should call onReport with selected reason when submitted', async () => {
      const onReport = vi.fn();

      render(<PanicButton onReport={onReport} />);

      fireEvent.click(screen.getByTestId('panic-button'));
      fireEvent.click(screen.getByTestId('reason-stranger_contact'));
      fireEvent.click(screen.getByTestId('submit-report'));

      await waitFor(() => {
        expect(onReport).toHaveBeenCalledWith({
          reason: 'STRANGER_CONTACT' as SafetyReportReason,
          additionalInfo: undefined,
        });
      });
    });

    it('should include additional info when provided', async () => {
      const onReport = vi.fn();

      render(<PanicButton onReport={onReport} />);

      fireEvent.click(screen.getByTestId('panic-button'));
      fireEvent.click(screen.getByTestId('reason-personal_questions'));

      const textarea = screen.getByPlaceholderText('You can share more details if you want...');
      fireEvent.change(textarea, { target: { value: 'They asked where I live' } });

      fireEvent.click(screen.getByTestId('submit-report'));

      await waitFor(() => {
        expect(onReport).toHaveBeenCalledWith({
          reason: 'PERSONAL_QUESTIONS' as SafetyReportReason,
          additionalInfo: 'They asked where I live',
        });
      });
    });

    it('should close dialog after successful submission', async () => {
      const onReport = vi.fn().mockResolvedValue(undefined);

      render(<PanicButton onReport={onReport} />);

      fireEvent.click(screen.getByTestId('panic-button'));
      fireEvent.click(screen.getByTestId('reason-uncomfortable'));
      fireEvent.click(screen.getByTestId('submit-report'));

      await waitFor(() => {
        expect(screen.queryByTestId('panic-dialog')).not.toBeInTheDocument();
      });
    });

    it('should show loading state during submission', async () => {
      let resolveReport: () => void;
      const onReport = vi.fn().mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveReport = resolve;
          }),
      );

      render(<PanicButton onReport={onReport} />);

      fireEvent.click(screen.getByTestId('panic-button'));
      fireEvent.click(screen.getByTestId('reason-other'));
      fireEvent.click(screen.getByTestId('submit-report'));

      expect(screen.getByText('Sending...')).toBeInTheDocument();

      // Resolve the promise
      resolveReport!();

      await waitFor(() => {
        expect(screen.queryByText('Sending...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button label', () => {
      render(<PanicButton />);

      const button = screen.getByTestId('panic-button');
      expect(button).toHaveAttribute('aria-label', 'Get help or report a concern');
    });

    it('should have proper dialog role and attributes', () => {
      render(<PanicButton />);

      fireEvent.click(screen.getByTestId('panic-button'));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'panic-dialog-title');
    });

    it('should have aria-pressed on reason buttons', () => {
      render(<PanicButton />);

      fireEvent.click(screen.getByTestId('panic-button'));

      const reasonButton = screen.getByTestId('reason-uncomfortable');
      expect(reasonButton).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(reasonButton);
      expect(reasonButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Styling', () => {
    it('should have teal/calming color scheme', () => {
      render(<PanicButton />);

      const button = screen.getByTestId('panic-button');
      expect(button).toHaveClass('bg-teal-500');
    });

    it('should apply additional className', () => {
      render(<PanicButton className="custom-class" />);

      const button = screen.getByTestId('panic-button');
      expect(button).toHaveClass('custom-class');
    });
  });
});
