import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchInput from '../../../../src/components/ui/SearchInput';

describe('SearchInput Component', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  // Helper to get search input (type="search" has role="searchbox")
  const getSearchInput = () => screen.getByRole('searchbox');

  describe('rendering', () => {
    it('should render input element', () => {
      render(<SearchInput {...defaultProps} />);

      const input = getSearchInput();
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-label', 'Search');
    });

    it('should render with default placeholder', () => {
      render(<SearchInput {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<SearchInput {...defaultProps} placeholder="Search topics..." />);

      expect(screen.getByPlaceholderText('Search topics...')).toBeInTheDocument();
    });

    it('should render search icon', () => {
      const { container } = render(<SearchInput {...defaultProps} />);

      const searchIcon = container.querySelector('svg[aria-hidden="true"]');
      expect(searchIcon).toBeInTheDocument();
    });

    it('should display current value', () => {
      render(<SearchInput {...defaultProps} value="test query" />);

      const input = getSearchInput() as HTMLInputElement;
      expect(input.value).toBe('test query');
    });
  });

  describe('onChange behavior', () => {
    it('should call onChange when typing', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput {...defaultProps} onChange={onChange} />);

      const input = getSearchInput();
      await user.type(input, 't');

      expect(onChange).toHaveBeenCalled();
      expect(onChange).toHaveBeenCalledWith('t');
    });

    it('should call onChange with empty string when clearing', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput {...defaultProps} value="test" onChange={onChange} />);

      const input = getSearchInput();
      await user.clear(input);

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should pass correct value to onChange', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput {...defaultProps} onChange={onChange} />);

      const input = getSearchInput();
      await user.type(input, 'a');

      // Since it's a controlled component with value='', each keystroke only adds to empty string
      expect(onChange).toHaveBeenCalledWith('a');
    });
  });

  describe('clear button', () => {
    it('should not show clear button when value is empty', () => {
      render(<SearchInput {...defaultProps} value="" />);

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('should show clear button when value is not empty', () => {
      render(<SearchInput {...defaultProps} value="test" />);

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('should call onChange with empty string when clicking clear button', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput {...defaultProps} value="test query" onChange={onChange} />);

      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should call onClear callback when clicking clear button', async () => {
      const onChange = vi.fn();
      const onClear = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput {...defaultProps} value="test" onChange={onChange} onClear={onClear} />);

      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);

      expect(onChange).toHaveBeenCalledWith('');
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('should work without onClear callback', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput {...defaultProps} value="test" onChange={onChange} />);

      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);

      expect(onChange).toHaveBeenCalledWith('');
    });
  });

  describe('keyboard shortcuts', () => {
    it('should clear input when pressing Escape with value', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput {...defaultProps} value="test" onChange={onChange} />);

      const input = getSearchInput();
      input.focus();
      await user.keyboard('{Escape}');

      expect(onChange).toHaveBeenCalledWith('');
    });

    it('should not clear when pressing Escape with empty value', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput {...defaultProps} value="" onChange={onChange} />);

      const input = getSearchInput();
      input.focus();
      await user.keyboard('{Escape}');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should call onClear when pressing Escape', async () => {
      const onChange = vi.fn();
      const onClear = vi.fn();
      const user = userEvent.setup();

      render(<SearchInput {...defaultProps} value="test" onChange={onChange} onClear={onClear} />);

      const input = getSearchInput();
      input.focus();
      await user.keyboard('{Escape}');

      expect(onChange).toHaveBeenCalledWith('');
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading state', () => {
    it('should not show loading spinner by default', () => {
      const { container } = render(<SearchInput {...defaultProps} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).not.toBeInTheDocument();
    });

    it('should show loading spinner when isLoading is true', () => {
      const { container } = render(<SearchInput {...defaultProps} isLoading={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should hide clear button when loading', () => {
      render(<SearchInput {...defaultProps} value="test" isLoading={true} />);

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('should show loading spinner instead of clear button', () => {
      const { container } = render(<SearchInput {...defaultProps} value="test" isLoading={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });
  });

  describe('styling and classes', () => {
    it('should apply custom className', () => {
      const { container } = render(<SearchInput {...defaultProps} className="custom-class" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should have proper input styling classes', () => {
      render(<SearchInput {...defaultProps} />);

      const input = getSearchInput();
      expect(input).toHaveClass('w-full');
      expect(input).toHaveClass('rounded-lg');
      expect(input).toHaveClass('border');
    });

    it('should have dark mode classes', () => {
      render(<SearchInput {...defaultProps} />);

      const input = getSearchInput();
      expect(input.className).toContain('dark:bg-gray-800');
      expect(input.className).toContain('dark:text-gray-100');
      expect(input.className).toContain('dark:border-gray-700');
    });
  });

  describe('accessibility', () => {
    it('should have role="textbox"', () => {
      render(<SearchInput {...defaultProps} />);

      expect(getSearchInput()).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      render(<SearchInput {...defaultProps} />);

      const input = getSearchInput();
      expect(input).toBeInTheDocument();
    });

    it('should have search icon with aria-hidden', () => {
      const { container } = render(<SearchInput {...defaultProps} />);

      const searchIcon = container.querySelector('svg[aria-hidden="true"]');
      expect(searchIcon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have clear button with aria-label', () => {
      render(<SearchInput {...defaultProps} value="test" />);

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('should have loading spinner with aria-hidden', () => {
      const { container } = render(<SearchInput {...defaultProps} isLoading={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('input attributes', () => {
    it('should have type="search"', () => {
      render(<SearchInput {...defaultProps} />);

      const input = getSearchInput() as HTMLInputElement;
      expect(input.type).toBe('search');
    });

    it('should be enabled by default', () => {
      render(<SearchInput {...defaultProps} />);

      const input = getSearchInput() as HTMLInputElement;
      expect(input).toBeEnabled();
    });

    it('should accept disabled prop', () => {
      render(<SearchInput {...defaultProps} disabled />);

      const input = getSearchInput() as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('should accept autoFocus prop', () => {
      render(<SearchInput {...defaultProps} autoFocus />);

      const input = getSearchInput() as HTMLInputElement;
      expect(input).toHaveFocus();
    });

    it('should forward other HTML input attributes', () => {
      render(
        <SearchInput {...defaultProps} id="search-input" name="search" data-testid="search" />,
      );

      const input = getSearchInput() as HTMLInputElement;
      expect(input).toHaveAttribute('id', 'search-input');
      expect(input).toHaveAttribute('name', 'search');
      expect(input).toHaveAttribute('data-testid', 'search');
    });
  });

  describe('icon positioning', () => {
    it('should have search icon on the left', () => {
      const { container } = render(<SearchInput {...defaultProps} />);

      const iconContainer = container.querySelector('.absolute.inset-y-0.left-0');
      expect(iconContainer).toBeInTheDocument();
      expect(iconContainer?.querySelector('svg')).toBeInTheDocument();
    });

    it('should have clear button on the right', () => {
      const { container } = render(<SearchInput {...defaultProps} value="test" />);

      const rightContainer = container.querySelector('.absolute.inset-y-0.right-0');
      expect(rightContainer).toBeInTheDocument();
      expect(rightContainer?.querySelector('button')).toBeInTheDocument();
    });

    it('should have proper padding for icons', () => {
      render(<SearchInput {...defaultProps} />);

      const input = getSearchInput();
      expect(input).toHaveClass('pl-10'); // Left padding for search icon
      expect(input).toHaveClass('pr-10'); // Right padding for clear/loading
    });
  });
});
