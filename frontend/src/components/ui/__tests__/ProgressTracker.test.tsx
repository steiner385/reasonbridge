/**
 * Unit tests for ProgressTracker component
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressTracker from '../ProgressTracker';

const defaultSteps = ['Initialize', 'Process', 'Validate', 'Complete'];

describe('ProgressTracker', () => {
  describe('Rendering', () => {
    it('should render current step name', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} />);
      expect(screen.getByText('Process')).toBeInTheDocument();
    });

    it('should render step progress count', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={2} />);
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    });

    it('should render progress bar with progressbar role', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should not show step list by default', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} />);
      // Only the current step name should be visible in the header
      expect(screen.getByText('Process')).toBeInTheDocument();
      // Other step names should not be visible
      expect(screen.queryByText('Initialize')).not.toBeInTheDocument();
      expect(screen.queryByText('Validate')).not.toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should have correct aria attributes', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={2} />);
      const progressBar = screen.getByRole('progressbar');

      expect(progressBar).toHaveAttribute('aria-valuenow', '3');
      expect(progressBar).toHaveAttribute('aria-valuemin', '1');
      expect(progressBar).toHaveAttribute('aria-valuemax', '4');
      expect(progressBar).toHaveAttribute('aria-label', 'Validate - Step 3 of 4');
    });

    it('should show 0% progress at first step', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={0} />);
      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('div');
      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('should show 100% progress at last step', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={3} />);
      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('div');
      expect(fill).toHaveStyle({ width: '100%' });
    });

    it('should show intermediate progress for middle steps', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} />);
      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('div');
      // Step 1 of 4 (0-indexed): 1/3 = 33.33%
      expect(fill).toHaveStyle({ width: '33.33333333333333%' });
    });
  });

  describe('Step List', () => {
    it('should show all step names when showStepList is true', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} showStepList />);
      // Initialize only appears in step list (not current step)
      expect(screen.getByText('Initialize')).toBeInTheDocument();
      // Process appears in both header and step list (current step)
      expect(screen.getAllByText('Process').length).toBe(2);
      expect(screen.getByText('Validate')).toBeInTheDocument();
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('should show checkmark for completed steps', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={2} showStepList />);
      // Completed steps have checkmark SVG
      const checkmarks = document.querySelectorAll('svg');
      expect(checkmarks.length).toBe(2); // Initialize and Process completed
    });

    it('should show step number for current and pending steps', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={2} showStepList />);
      // Current step shows number 3, pending step shows number 4
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('should apply correct styles to completed steps', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={2} showStepList />);
      // Find the step list container and get the Initialize step text within it
      // The step list items have the text span as a direct child (not inside aria-hidden div)
      const stepListItems = document.querySelectorAll('.mt-4.space-y-2 > div');
      const initializeStepItem = stepListItems[0];
      // Get the span that's a direct child of the step item (not inside the indicator div)
      const initializeText = initializeStepItem.querySelector(':scope > span.text-sm');
      expect(initializeText).toHaveClass('text-green-700');
    });

    it('should apply correct styles to current step', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={2} showStepList />);
      // Find the step list container and get the Validate step text (index 2)
      const stepListItems = document.querySelectorAll('.mt-4.space-y-2 > div');
      const validateStepItem = stepListItems[2];
      const validateText = validateStepItem.querySelector(':scope > span.text-sm');
      expect(validateText).toHaveClass('text-gray-900');
    });

    it('should apply correct styles to pending steps', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={2} showStepList />);
      // Find the step list container and get the Complete step text (index 3)
      const stepListItems = document.querySelectorAll('.mt-4.space-y-2 > div');
      const completeStepItem = stepListItems[3];
      const completeText = completeStepItem.querySelector(':scope > span.text-sm');
      expect(completeText).toHaveClass('text-gray-500');
    });

    it('should include screen reader text for step status', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} showStepList />);
      expect(screen.getByText('(completed)')).toBeInTheDocument();
      expect(screen.getByText('(current step)')).toBeInTheDocument();
      expect(screen.getAllByText('(pending)').length).toBe(2);
    });
  });

  describe('Size Variants', () => {
    it('should apply small size styles', () => {
      render(
        <ProgressTracker steps={defaultSteps} currentStep={1} size="sm" data-testid="tracker" />,
      );
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('h-1');
    });

    it('should apply medium size styles by default', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('h-2');
    });

    it('should apply large size styles', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} size="lg" />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('h-3');
    });
  });

  describe('Edge Cases', () => {
    it('should clamp currentStep to valid range (too low)', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={-1} />);
      expect(screen.getByText('Initialize')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('should clamp currentStep to valid range (too high)', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={10} />);
      expect(screen.getByText('Complete')).toBeInTheDocument();
      expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    });

    it('should handle single step', () => {
      render(<ProgressTracker steps={['Only Step']} currentStep={0} />);
      expect(screen.getByText('Only Step')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 1')).toBeInTheDocument();
      // Single step at index 0 should show 0% progress
      const progressBar = screen.getByRole('progressbar');
      const fill = progressBar.querySelector('div');
      expect(fill).toHaveStyle({ width: '0%' });
    });

    it('should handle empty steps array gracefully', () => {
      render(<ProgressTracker steps={[]} currentStep={0} />);
      // Should show fallback text
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      const { container } = render(
        <ProgressTracker steps={defaultSteps} currentStep={1} className="custom-class" />,
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
      expect(wrapper).toHaveClass('text-base'); // Still has size class
    });
  });

  describe('Accessibility', () => {
    it('should have accessible progress bar', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAccessibleName('Process - Step 2 of 4');
    });

    it('should have aria-hidden on status icons', () => {
      render(<ProgressTracker steps={defaultSteps} currentStep={1} showStepList />);
      const icons = document.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(ProgressTracker.displayName).toBe('ProgressTracker');
    });
  });
});
