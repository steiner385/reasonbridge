import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopicSearchFilter } from './TopicSearchFilter';

describe('TopicSearchFilter', () => {
  const mockOnChange = vi.fn();
  const mockOnStatusFilterChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input with placeholder', () => {
      render(<TopicSearchFilter value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search topics...');
      expect(input).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<TopicSearchFilter value="" onChange={mockOnChange} placeholder="Find a topic..." />);

      const input = screen.getByPlaceholderText('Find a topic...');
      expect(input).toBeInTheDocument();
    });

    it('should display current search value', () => {
      render(<TopicSearchFilter value="test query" onChange={mockOnChange} />);

      const input = screen.getByDisplayValue('test query');
      expect(input).toBeInTheDocument();
    });

    it('should not render status filter by default', () => {
      render(<TopicSearchFilter value="" onChange={mockOnChange} />);

      expect(screen.queryByText('All')).not.toBeInTheDocument();
      expect(screen.queryByText('Seeding')).not.toBeInTheDocument();
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });

    it('should render status filter when showStatusFilter is true', () => {
      render(
        <TopicSearchFilter
          value=""
          onChange={mockOnChange}
          showStatusFilter
          onStatusFilterChange={mockOnStatusFilterChange}
        />,
      );

      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Seeding')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('should call onChange when typing in search input', () => {
      render(<TopicSearchFilter value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search topics...');
      fireEvent.change(input, { target: { value: 'new search' } });

      expect(mockOnChange).toHaveBeenCalledWith('new search');
    });

    it('should show clear button when search value is not empty', () => {
      render(<TopicSearchFilter value="test" onChange={mockOnChange} />);

      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('should not show clear button when search value is empty', () => {
      render(<TopicSearchFilter value="" onChange={mockOnChange} />);

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', () => {
      render(<TopicSearchFilter value="test" onChange={mockOnChange} />);

      const clearButton = screen.getByLabelText('Clear search');
      fireEvent.click(clearButton);

      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('should clear search when Escape key is pressed', () => {
      render(<TopicSearchFilter value="test" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search topics...');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockOnChange).toHaveBeenCalledWith('');
    });
  });

  describe('Status filter functionality', () => {
    it('should call onStatusFilterChange when "All" is clicked', () => {
      render(
        <TopicSearchFilter
          value=""
          onChange={mockOnChange}
          showStatusFilter
          statusFilter="ACTIVE"
          onStatusFilterChange={mockOnStatusFilterChange}
        />,
      );

      const allButton = screen.getByLabelText('Show all topics');
      fireEvent.click(allButton);

      expect(mockOnStatusFilterChange).toHaveBeenCalledWith(null);
    });

    it('should call onStatusFilterChange when "Seeding" is clicked', () => {
      render(
        <TopicSearchFilter
          value=""
          onChange={mockOnChange}
          showStatusFilter
          statusFilter={null}
          onStatusFilterChange={mockOnStatusFilterChange}
        />,
      );

      const seedingButton = screen.getByLabelText('Show seeding topics');
      fireEvent.click(seedingButton);

      expect(mockOnStatusFilterChange).toHaveBeenCalledWith('SEEDING');
    });

    it('should call onStatusFilterChange when "Active" is clicked', () => {
      render(
        <TopicSearchFilter
          value=""
          onChange={mockOnChange}
          showStatusFilter
          statusFilter={null}
          onStatusFilterChange={mockOnStatusFilterChange}
        />,
      );

      const activeButton = screen.getByLabelText('Show active topics');
      fireEvent.click(activeButton);

      expect(mockOnStatusFilterChange).toHaveBeenCalledWith('ACTIVE');
    });

    it('should highlight "All" button when statusFilter is null', () => {
      render(
        <TopicSearchFilter
          value=""
          onChange={mockOnChange}
          showStatusFilter
          statusFilter={null}
          onStatusFilterChange={mockOnStatusFilterChange}
        />,
      );

      const allButton = screen.getByLabelText('Show all topics');
      expect(allButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should highlight "Active" button when statusFilter is ACTIVE', () => {
      render(
        <TopicSearchFilter
          value=""
          onChange={mockOnChange}
          showStatusFilter
          statusFilter="ACTIVE"
          onStatusFilterChange={mockOnStatusFilterChange}
        />,
      );

      const activeButton = screen.getByLabelText('Show active topics');
      expect(activeButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should highlight "Seeding" button when statusFilter is SEEDING', () => {
      render(
        <TopicSearchFilter
          value=""
          onChange={mockOnChange}
          showStatusFilter
          statusFilter="SEEDING"
          onStatusFilterChange={mockOnStatusFilterChange}
        />,
      );

      const seedingButton = screen.getByLabelText('Show seeding topics');
      expect(seedingButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for search input', () => {
      render(<TopicSearchFilter value="" onChange={mockOnChange} />);

      const input = screen.getByLabelText('Search topics');
      expect(input).toBeInTheDocument();
    });

    it('should have proper test IDs', () => {
      render(<TopicSearchFilter value="test" onChange={mockOnChange} />);

      expect(screen.getByTestId('topic-search-input')).toBeInTheDocument();
      expect(screen.getByTestId('clear-search-button')).toBeInTheDocument();
    });

    it('should apply focus styles to search input', () => {
      render(<TopicSearchFilter value="" onChange={mockOnChange} />);

      const input = screen.getByPlaceholderText('Search topics...');
      fireEvent.focus(input);

      // Parent div should have focus styles
      const parentDiv = input.parentElement;
      expect(parentDiv).toHaveClass('border-primary-500');
    });
  });
});
