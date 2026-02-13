/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for TagSelector component
 * Feature 016: Topic Management - T229 Tag Selector
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import { TagSelector, useTagValidation } from '../TagSelector';
import type { Tag } from '../../../types/tag';

// Mock the tag service
vi.mock('../../../services/tagService', () => ({
  tagService: {
    searchTags: vi.fn(),
  },
}));

import { tagService } from '../../../services/tagService';

const mockTags: Tag[] = [
  { id: '1', name: 'climate', slug: 'climate', usageCount: 245 },
  { id: '2', name: 'climate-change', slug: 'climate-change', usageCount: 189 },
  { id: '3', name: 'environment', slug: 'environment', usageCount: 156 },
  { id: '4', name: 'policy', slug: 'policy', usageCount: 98 },
  { id: '5', name: 'economics', slug: 'economics', usageCount: 67 },
  { id: '6', name: 'science', slug: 'science', usageCount: 54 },
];

describe('TagSelector', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(tagService.searchTags).mockResolvedValue({
      tags: [],
      total: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with label', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} />);
      expect(screen.getByText(/tags/i)).toBeInTheDocument();
    });

    it('should render with required indicator', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render tag count indicator', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} />);
      expect(screen.getByText('(0/5)')).toBeInTheDocument();
    });

    it('should render custom tag count with maxTags', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} maxTags={3} />);
      expect(screen.getByText('(0/3)')).toBeInTheDocument();
    });

    it('should render placeholder', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} />);
      expect(screen.getByPlaceholderText(/search or create tags/i)).toBeInTheDocument();
    });

    it('should render custom placeholder', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} placeholder="Add tags here" />);
      expect(screen.getByPlaceholderText('Add tags here')).toBeInTheDocument();
    });

    it('should render selected tags as pills', () => {
      render(<TagSelector selectedTags={[mockTags[0], mockTags[1]]} onChange={() => {}} />);
      expect(screen.getByText('#climate')).toBeInTheDocument();
      expect(screen.getByText('#climate-change')).toBeInTheDocument();
    });

    it('should show hint when no tags selected', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} />);
      expect(screen.getByText('At least 1 tag required')).toBeInTheDocument();
    });

    it('should show custom min/max hint', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} minTags={2} maxTags={4} />);
      expect(screen.getByText('2-4 tags required')).toBeInTheDocument();
    });

    it('should show "Maximum tags reached" placeholder when at max', () => {
      const tags = mockTags.slice(0, 5);
      render(<TagSelector selectedTags={tags} onChange={() => {}} maxTags={5} />);
      expect(screen.getByPlaceholderText('Maximum tags reached')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should be invalid with no tags when minTags is 1', () => {
      const onValidationChange = vi.fn();
      render(
        <TagSelector
          selectedTags={[]}
          onChange={() => {}}
          onValidationChange={onValidationChange}
        />,
      );

      expect(onValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          tagCount: 0,
        }),
      );
    });

    it('should be valid with required tags', () => {
      const onValidationChange = vi.fn();
      render(
        <TagSelector
          selectedTags={[mockTags[0]]}
          onChange={() => {}}
          onValidationChange={onValidationChange}
        />,
      );

      expect(onValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          tagCount: 1,
          error: null,
        }),
      );
    });

    it('should be invalid when exceeding maxTags', () => {
      const onValidationChange = vi.fn();
      const tags = mockTags.slice(0, 4);
      render(
        <TagSelector
          selectedTags={tags}
          onChange={() => {}}
          maxTags={3}
          onValidationChange={onValidationChange}
        />,
      );

      expect(onValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          error: 'Maximum 3 tags allowed',
        }),
      );
    });
  });

  describe('User Interaction - Selecting Tags', () => {
    it('should call onChange when selecting a tag from dropdown', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onChange = vi.fn();

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: mockTags.slice(0, 3),
        total: 3,
      });

      render(<TagSelector selectedTags={[]} onChange={onChange} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'cli');

      // Wait for debounce
      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        expect(screen.getByText('climate')).toBeInTheDocument();
      });

      await user.click(screen.getByText('climate'));

      expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: 'climate' })]);
    });

    it('should create new tag when no exact match', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onChange = vi.fn();

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: [],
        total: 0,
      });

      render(<TagSelector selectedTags={[]} onChange={onChange} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'newtag');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        expect(screen.getByText(/create "newtag"/i)).toBeInTheDocument();
      });

      await user.click(screen.getByText(/create "newtag"/i));

      // Wait for React to process state updates from handleSelectTag and clear()
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'newtag',
            slug: 'newtag',
          }),
        ]);
      });
    });

    it('should not show create option for existing tag', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: [mockTags[0]], // climate
        total: 1,
      });

      render(<TagSelector selectedTags={[]} onChange={() => {}} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'climate');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        expect(screen.getByText('climate')).toBeInTheDocument();
      });

      // Should not show create option for exact match
      expect(screen.queryByText(/create "climate"/i)).not.toBeInTheDocument();
    });
  });

  describe('User Interaction - Removing Tags', () => {
    it('should remove tag when clicking X button', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onChange = vi.fn();

      render(<TagSelector selectedTags={[mockTags[0], mockTags[1]]} onChange={onChange} />);

      const removeButton = screen.getByLabelText('Remove tag climate');
      await user.click(removeButton);

      expect(onChange).toHaveBeenCalledWith([mockTags[1]]);
    });

    it('should remove last tag on backspace when input is empty', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onChange = vi.fn();

      render(<TagSelector selectedTags={[mockTags[0], mockTags[1]]} onChange={onChange} />);

      const input = screen.getByRole('combobox');
      await user.click(input);
      await user.keyboard('{Backspace}');

      expect(onChange).toHaveBeenCalledWith([mockTags[0]]);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate dropdown with arrow keys', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: mockTags.slice(0, 3),
        total: 3,
      });

      render(<TagSelector selectedTags={[]} onChange={() => {}} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'cli');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        expect(screen.getByText('climate')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      // Use getAllByRole and check first item
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');

      await user.keyboard('{ArrowDown}');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
      expect(options[0]).toHaveAttribute('aria-selected', 'false');

      await user.keyboard('{ArrowUp}');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
    });

    it('should select highlighted option on Enter', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onChange = vi.fn();

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: mockTags.slice(0, 2),
        total: 2,
      });

      render(<TagSelector selectedTags={[]} onChange={onChange} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'cli');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        expect(screen.getByText('climate')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: 'climate' })]);
    });

    it('should close dropdown on Escape', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: mockTags.slice(0, 2),
        total: 2,
      });

      render(<TagSelector selectedTags={[]} onChange={() => {}} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'cli');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should select on Tab when option is highlighted', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onChange = vi.fn();

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: mockTags.slice(0, 2),
        total: 2,
      });

      render(<TagSelector selectedTags={[]} onChange={onChange} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'cli');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        expect(screen.getByText('climate')).toBeInTheDocument();
      });

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Tab}');

      expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ name: 'climate' })]);
    });
  });

  describe('Disabled State', () => {
    it('should disable input when disabled prop is true', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} disabled />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should disable remove buttons when disabled', () => {
      render(<TagSelector selectedTags={[mockTags[0]]} onChange={() => {}} disabled />);
      expect(screen.getByLabelText('Remove tag climate')).toBeDisabled();
    });

    it('should not open dropdown when disabled', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      render(<TagSelector selectedTags={[]} onChange={() => {}} disabled />);

      const input = screen.getByRole('combobox');
      await user.click(input);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator while searching', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // Make the search take some time
      vi.mocked(tagService.searchTags).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ tags: [], total: 0 }), 500)),
      );

      render(<TagSelector selectedTags={[]} onChange={() => {}} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'cli');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        expect(screen.getByText(/searching/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have combobox role on input', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have aria-expanded attribute', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-invalid when validation fails', () => {
      render(<TagSelector selectedTags={[]} onChange={() => {}} />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not have aria-invalid when valid', () => {
      render(<TagSelector selectedTags={[mockTags[0]]} onChange={() => {}} />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'false');
    });

    it('should have aria-describedby pointing to error/hint', () => {
      const { rerender } = render(
        <TagSelector selectedTags={[]} onChange={() => {}} id="test-tags" />,
      );

      const input = screen.getByRole('combobox');
      expect(input.getAttribute('aria-describedby')).toBe('test-tags-hint');

      rerender(
        <TagSelector
          selectedTags={mockTags.slice(0, 6)}
          onChange={() => {}}
          maxTags={5}
          id="test-tags"
        />,
      );
      expect(input.getAttribute('aria-describedby')).toBe('test-tags-error');
    });

    it('should have listbox role on dropdown', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: mockTags.slice(0, 2),
        total: 2,
      });

      render(<TagSelector selectedTags={[]} onChange={() => {}} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'cli');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      });
    });

    it('should have option role on dropdown items', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: mockTags.slice(0, 2),
        total: 2,
      });

      render(<TagSelector selectedTags={[]} onChange={() => {}} />);

      const input = screen.getByRole('combobox');
      await user.type(input, 'cli');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Duplicate Prevention', () => {
    it('should filter out already selected tags from results', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: mockTags.slice(0, 3),
        total: 3,
      });

      render(
        <TagSelector
          selectedTags={[mockTags[0]]} // climate is already selected
          onChange={() => {}}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'cli');

      await vi.advanceTimersByTimeAsync(300);
      await waitFor(() => {
        // climate-change should be visible, but not climate
        expect(screen.getByText('climate-change')).toBeInTheDocument();
      });

      // climate should not appear in dropdown (it's already selected)
      const options = screen.getAllByRole('option');
      const climateOption = options.find((opt) => opt.textContent === 'climate');
      expect(climateOption).toBeUndefined();
    });

    it('should not add duplicate tags case-insensitively', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onChange = vi.fn();

      vi.mocked(tagService.searchTags).mockResolvedValue({
        tags: [],
        total: 0,
      });

      render(
        <TagSelector
          selectedTags={[{ id: '1', name: 'Climate', slug: 'climate' }]}
          onChange={onChange}
        />,
      );

      const input = screen.getByRole('combobox');
      await user.type(input, 'climate');

      await vi.advanceTimersByTimeAsync(300);

      // Should not show create option for case-insensitive match
      await waitFor(() => {
        expect(screen.queryByText(/create "climate"/i)).not.toBeInTheDocument();
      });
    });
  });
});

describe('useTagValidation', () => {
  it('should return valid state when tags meet requirements', () => {
    const tags = [mockTags[0], mockTags[1]];
    const { result } = renderHook(() => useTagValidation(tags, 1, 5));

    expect(result.current.isValid).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.tagCount).toBe(2);
  });

  it('should return error when no tags and minTags > 0', () => {
    const { result } = renderHook(() => useTagValidation([], 1, 5));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('At least 1 tag required');
  });

  it('should return singular error for 1 more tag needed', () => {
    const { result } = renderHook(() => useTagValidation([mockTags[0]], 2, 5));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('1 more tag needed');
  });

  it('should return plural error for multiple tags needed', () => {
    const { result } = renderHook(() => useTagValidation([], 3, 5));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('At least 3 tags required');
  });

  it('should return error when exceeding maxTags', () => {
    const tags = mockTags.slice(0, 4);
    const { result } = renderHook(() => useTagValidation(tags, 1, 3));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('Maximum 3 tags allowed');
  });

  it('should expose min/max values', () => {
    const { result } = renderHook(() => useTagValidation([mockTags[0]], 2, 8));

    expect(result.current.minTags).toBe(2);
    expect(result.current.maxTags).toBe(8);
  });
});
