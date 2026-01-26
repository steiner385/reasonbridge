/**
 * Unit tests for Input component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import Input from '../Input';

describe('Input', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input aria-label="test input" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should forward ref to input element', () => {
      const ref = createRef<HTMLInputElement>();
      render(<Input ref={ref} aria-label="test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should pass through additional HTML attributes', () => {
      render(<Input placeholder="Enter text" data-testid="custom-input" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('should generate unique ID when not provided', () => {
      render(<Input label="Test Label" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id');
    });

    it('should use provided ID', () => {
      render(<Input id="custom-id" label="Test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('Label', () => {
    it('should render label when provided', () => {
      render(<Input label="Username" />);
      expect(screen.getByText('Username')).toBeInTheDocument();
    });

    it('should not render label when not provided', () => {
      render(<Input aria-label="no label" />);
      const labels = screen.queryAllByRole('label');
      expect(labels).toHaveLength(0);
    });

    it('should associate label with input', () => {
      render(<Input label="Email" id="email-input" />);
      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('for', 'email-input');
    });

    it('should show required indicator when required', () => {
      render(<Input label="Required Field" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });
  });

  describe('Helper Text', () => {
    it('should render helper text when provided', () => {
      render(<Input helperText="Enter your email address" aria-label="email" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('should not render helper text when error is present', () => {
      render(<Input helperText="Helper" error="Error message" aria-label="test" />);
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });

    it('should set aria-describedby for helper text', () => {
      render(<Input id="test" helperText="Helper text" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-helper');
    });
  });

  describe('Error State', () => {
    it('should render error message when provided', () => {
      render(<Input error="This field is required" aria-label="test" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have role="alert" on error message', () => {
      render(<Input error="Error" aria-label="test" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should set aria-invalid to true when error exists', () => {
      render(<Input error="Error" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('should set aria-describedby for error message', () => {
      render(<Input id="test" error="Error message" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('should apply error border styles', () => {
      render(<Input error="Error" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-fallacy-DEFAULT');
    });
  });

  describe('Sizes', () => {
    it('should apply medium size styles by default', () => {
      render(<Input aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('should apply small size styles', () => {
      render(<Input inputSize="sm" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should apply large size styles', () => {
      render(<Input inputSize="lg" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-5', 'py-3', 'text-lg');
    });
  });

  describe('Icons', () => {
    it('should render left icon', () => {
      render(<Input leftIcon={<span data-testid="left-icon">L</span>} aria-label="test" />);
      expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    });

    it('should render right icon', () => {
      render(<Input rightIcon={<span data-testid="right-icon">R</span>} aria-label="test" />);
      expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    });

    it('should add left padding when left icon is present', () => {
      render(<Input leftIcon={<span>L</span>} aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pl-10');
    });

    it('should add right padding when right icon is present', () => {
      render(<Input rightIcon={<span>R</span>} aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('pr-10');
    });
  });

  describe('Full Width', () => {
    it('should be full width by default', () => {
      render(<Input aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('w-full');
    });

    it('should not be full width when fullWidth is false', () => {
      render(<Input fullWidth={false} aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('w-full');
    });
  });

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled aria-label="test" />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should apply disabled styles', () => {
      render(<Input disabled aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
    });
  });

  describe('User Interaction', () => {
    it('should handle text input', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} aria-label="test" />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'Hello');

      expect(handleChange).toHaveBeenCalled();
      expect(input).toHaveValue('Hello');
    });

    it('should handle focus and blur', async () => {
      const handleFocus = vi.fn();
      const handleBlur = vi.fn();
      render(<Input onFocus={handleFocus} onBlur={handleBlur} aria-label="test" />);

      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      expect(handleFocus).toHaveBeenCalled();

      await userEvent.tab();
      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('Input Types', () => {
    it('should accept type="text" by default', () => {
      render(<Input aria-label="test" />);
      // Default type is text for textboxes
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should accept type="password"', () => {
      render(<Input type="password" aria-label="password" />);
      // Password inputs don't have textbox role
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('should accept type="email"', () => {
      render(<Input type="email" aria-label="email" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<Input className="custom-class" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('rounded-lg'); // Still has base class
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(Input.displayName).toBe('Input');
    });
  });
});
