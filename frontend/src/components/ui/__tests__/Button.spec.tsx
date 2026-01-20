/**
 * Unit tests for Button component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import Button from '../Button';

describe('Button', () => {
  describe('Rendering', () => {
    it('should render children text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('should render with default props', () => {
      render(<Button>Default</Button>);
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });

    it('should forward ref to button element', () => {
      const ref = createRef<HTMLButtonElement>();
      render(<Button ref={ref}>With ref</Button>);
      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('should pass through additional HTML attributes', () => {
      render(
        <Button data-testid="custom-button" aria-label="Custom label">
          Test
        </Button>,
      );
      expect(screen.getByTestId('custom-button')).toBeInTheDocument();
      expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply primary variant styles by default', () => {
      render(<Button>Primary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary-600');
    });

    it('should apply secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-secondary-600');
    });

    it('should apply outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-primary-600');
      expect(button).toHaveClass('text-primary-600');
    });

    it('should apply ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('text-primary-600');
    });

    it('should apply danger variant styles', () => {
      render(<Button variant="danger">Danger</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-fallacy-DEFAULT');
    });
  });

  describe('Sizes', () => {
    it('should apply medium size styles by default', () => {
      render(<Button>Medium</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('should apply small size styles', () => {
      render(<Button size="sm">Small</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should apply large size styles', () => {
      render(<Button size="lg">Large</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);
      const button = screen.getByRole('button');
      const svg = button.querySelector('svg.animate-spin');
      expect(svg).toBeInTheDocument();
    });

    it('should disable button when isLoading is true', () => {
      render(<Button isLoading>Loading</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should hide left icon when loading', () => {
      render(
        <Button isLoading leftIcon={<span data-testid="left-icon">Icon</span>}>
          Loading
        </Button>,
      );
      expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    });

    it('should hide right icon when loading', () => {
      render(
        <Button isLoading rightIcon={<span data-testid="right-icon">Icon</span>}>
          Loading
        </Button>,
      );
      expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
    });

    it('should still render children text when loading', () => {
      render(<Button isLoading>Loading text</Button>);
      expect(screen.getByText('Loading text')).toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      render(<Button leftIcon={<span data-testid="left-icon">L</span>}>With Left Icon</Button>);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(<Button rightIcon={<span data-testid="right-icon">R</span>}>With Right Icon</Button>);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should render both icons', () => {
      render(
        <Button
          leftIcon={<span data-testid="left-icon">L</span>}
          rightIcon={<span data-testid="right-icon">R</span>}
        >
          With Both Icons
        </Button>,
      );
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });
  });

  describe('Full Width', () => {
    it('should not be full width by default', () => {
      render(<Button>Not Full</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveClass('w-full');
    });

    it('should apply full width class when fullWidth is true', () => {
      render(<Button fullWidth>Full Width</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('w-full');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });

    it('should not trigger click handler when disabled', async () => {
      const handleClick = vi.fn();
      render(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>,
      );

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Click Handling', () => {
    it('should call onClick handler when clicked', async () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Clickable</Button>);

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when loading', async () => {
      const handleClick = vi.fn();
      render(
        <Button isLoading onClick={handleClick}>
          Loading
        </Button>,
      );

      await userEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Button className="custom-class">Custom</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
      expect(button).toHaveClass('bg-primary-600'); // Still has default variant class
    });
  });

  describe('Button Types', () => {
    it('should render as button type by default', () => {
      render(<Button>Default Type</Button>);
      const button = screen.getByRole('button');
      expect(button).not.toHaveAttribute('type', 'submit');
    });

    it('should accept type="submit"', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should accept type="reset"', () => {
      render(<Button type="reset">Reset</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(Button.displayName).toBe('Button');
    });
  });
});
