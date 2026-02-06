import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../../../src/components/ui/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  describe('rendering', () => {
    it('should render spinner element', () => {
      const { container } = render(<LoadingSpinner />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have role="status"', () => {
      const { container } = render(<LoadingSpinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('role', 'status');
    });

    it('should have aria-busy="true"', () => {
      const { container } = render(<LoadingSpinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-busy', 'true');
    });

    it('should have default aria-label="Loading"', () => {
      const { container } = render(<LoadingSpinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Loading');
    });

    it('should use custom label when provided', () => {
      const { container } = render(<LoadingSpinner label="Loading data..." />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Loading data...');
    });
  });

  describe('size variants', () => {
    it('should render small size (sm)', () => {
      const { container } = render(<LoadingSpinner size="sm" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-4');
      expect(svg).toHaveClass('w-4');
    });

    it('should render medium size (md) by default', () => {
      const { container } = render(<LoadingSpinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-8');
      expect(svg).toHaveClass('w-8');
    });

    it('should render large size (lg)', () => {
      const { container } = render(<LoadingSpinner size="lg" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-12');
      expect(svg).toHaveClass('w-12');
    });

    it('should render extra-large size (xl)', () => {
      const { container } = render(<LoadingSpinner size="xl" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('h-16');
      expect(svg).toHaveClass('w-16');
    });
  });

  describe('color variants', () => {
    it('should use primary color by default', () => {
      const { container } = render(<LoadingSpinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-primary-600');
    });

    it('should use secondary color', () => {
      const { container } = render(<LoadingSpinner variant="secondary" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-secondary-600');
    });

    it('should use white color', () => {
      const { container } = render(<LoadingSpinner variant="white" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-white');
    });
  });

  describe('label display', () => {
    it('should display label text when label prop is provided', () => {
      render(<LoadingSpinner label="Loading data..." />);

      const labelElement = screen.getByText('Loading data...');
      expect(labelElement).toBeInTheDocument();
      expect(labelElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should not display label text when label prop is not provided', () => {
      render(<LoadingSpinner />);

      // Only aria-label on SVG, no visible text
      const { container } = render(<LoadingSpinner />);
      const span = container.querySelector('span[aria-live="polite"]');
      expect(span).not.toBeInTheDocument();
    });
  });

  describe('centered positioning', () => {
    it('should not be centered by default', () => {
      const { container } = render(<LoadingSpinner />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).not.toContain('justify-center');
    });

    it('should center spinner when centered prop is true', () => {
      const { container } = render(<LoadingSpinner centered />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('justify-center');
    });

    it('should have flex container when centered', () => {
      const { container } = render(<LoadingSpinner centered label="Loading..." />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('items-center');
    });
  });

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<LoadingSpinner className="custom-class" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should preserve default classes with custom className', () => {
      const { container } = render(<LoadingSpinner className="my-spinner" centered />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('my-spinner');
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('justify-center');
    });
  });

  describe('animation', () => {
    it('should have spin animation class', () => {
      const { container } = render(<LoadingSpinner />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });
  });

  describe('dark mode support', () => {
    it('should have dark mode color for primary variant', () => {
      const { container } = render(<LoadingSpinner variant="primary" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('dark:text-primary-400');
    });

    it('should have dark mode color for secondary variant', () => {
      const { container } = render(<LoadingSpinner variant="secondary" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('dark:text-secondary-400');
    });

    it('should not have dark mode override for white variant', () => {
      const { container } = render(<LoadingSpinner variant="white" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('text-white');
      expect(svg).not.toHaveClass('dark:text-primary-400');
      expect(svg).not.toHaveClass('dark:text-secondary-400');
    });
  });
});
