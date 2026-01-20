/**
 * Unit tests for SearchBar component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import SearchBar from '../SearchBar';

describe('SearchBar', () => {
  describe('Rendering', () => {
    it('should render search input', () => {
      render(<SearchBar />);
      expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
    });

    it('should render with default placeholder', () => {
      render(<SearchBar />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<SearchBar placeholder="Find topics..." />);
      expect(screen.getByPlaceholderText('Find topics...')).toBeInTheDocument();
    });

    it('should forward ref to input element', () => {
      const ref = createRef<HTMLInputElement>();
      render(<SearchBar ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('should render search button by default', () => {
      render(<SearchBar />);
      expect(screen.getByRole('button', { name: 'Submit search' })).toBeInTheDocument();
    });

    it('should hide search button when showButton is false', () => {
      render(<SearchBar showButton={false} />);
      expect(screen.queryByRole('button', { name: 'Submit search' })).not.toBeInTheDocument();
    });

    it('should render with initial value', () => {
      render(<SearchBar initialValue="test query" />);
      expect(screen.getByRole('textbox')).toHaveValue('test query');
    });
  });

  describe('Sizes', () => {
    it('should apply medium size styles by default', () => {
      render(<SearchBar />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-4', 'py-2', 'text-base');
    });

    it('should apply small size styles', () => {
      render(<SearchBar size="sm" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('should apply large size styles', () => {
      render(<SearchBar size="lg" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('px-5', 'py-3', 'text-lg');
    });
  });

  describe('Full Width', () => {
    it('should be full width by default', () => {
      render(<SearchBar />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('w-full');
    });

    it('should not be full width when fullWidth is false', () => {
      render(<SearchBar fullWidth={false} />);
      const input = screen.getByRole('textbox');
      expect(input).not.toHaveClass('w-full');
    });
  });

  describe('Input Handling', () => {
    it('should update value on input', async () => {
      render(<SearchBar />);
      const input = screen.getByRole('textbox');

      await userEvent.type(input, 'test');
      expect(input).toHaveValue('test');
    });

    it('should call onChange callback on input', async () => {
      const onChange = vi.fn();
      render(<SearchBar onChange={onChange} />);
      const input = screen.getByRole('textbox');

      await userEvent.type(input, 'abc');
      expect(onChange).toHaveBeenCalledWith('a');
      expect(onChange).toHaveBeenCalledWith('ab');
      expect(onChange).toHaveBeenCalledWith('abc');
    });
  });

  describe('Search Submission', () => {
    it('should call onSearch when form is submitted', async () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'search query');

      const submitButton = screen.getByRole('button', { name: 'Submit search' });
      await userEvent.click(submitButton);

      expect(onSearch).toHaveBeenCalledWith('search query');
    });

    it('should call onSearch when Enter is pressed', async () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'search query{Enter}');

      expect(onSearch).toHaveBeenCalledWith('search query');
    });
  });

  describe('Clear Button', () => {
    it('should show clear button when there is text and showClearButton is true', async () => {
      render(<SearchBar showClearButton={true} />);
      const input = screen.getByRole('textbox');

      // Initially no clear button
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();

      // Type text - clear button should appear
      await userEvent.type(input, 'test');
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('should not show clear button when showClearButton is false', async () => {
      render(<SearchBar showClearButton={false} />);
      const input = screen.getByRole('textbox');

      await userEvent.type(input, 'test');
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('should clear input when clear button is clicked', async () => {
      const onChange = vi.fn();
      render(<SearchBar onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test');
      expect(input).toHaveValue('test');

      const clearButton = screen.getByLabelText('Clear search');
      await userEvent.click(clearButton);

      expect(input).toHaveValue('');
      expect(onChange).toHaveBeenLastCalledWith('');
    });

    it('should call onSearch with empty string when clear button is clicked', async () => {
      const onSearch = vi.fn();
      render(<SearchBar onSearch={onSearch} />);

      const input = screen.getByRole('textbox');
      await userEvent.type(input, 'test');

      const clearButton = screen.getByLabelText('Clear search');
      await userEvent.click(clearButton);

      expect(onSearch).toHaveBeenCalledWith('');
    });
  });

  describe('Loading State', () => {
    it('should disable input when isLoading is true', () => {
      render(<SearchBar isLoading />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should disable submit button when isLoading is true', () => {
      render(<SearchBar isLoading />);
      expect(screen.getByRole('button', { name: 'Submit search' })).toBeDisabled();
    });

    it('should show loading spinner when isLoading is true', () => {
      render(<SearchBar isLoading />);
      // Look for the spinner SVG with animate-spin class
      const spinner = document.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should hide clear button when loading', async () => {
      render(<SearchBar isLoading initialValue="test" />);
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      render(<SearchBar className="custom-class" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('custom-class');
      expect(input).toHaveClass('rounded-lg'); // Still has base class
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(SearchBar.displayName).toBe('SearchBar');
    });
  });
});
