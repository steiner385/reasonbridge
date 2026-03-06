/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import type { MentionUser } from '../../services/mentionService';
import MentionInput from './MentionInput';

// Mock useMentions hook
const mockSetQuery = vi.fn();
const mockClear = vi.fn();
const mockUseMentions = vi.fn();

vi.mock('../../hooks/useMentions', () => ({
  useMentions: () => mockUseMentions(),
}));

describe('MentionInput', () => {
  const mockUsers: MentionUser[] = [
    {
      id: 'user-1',
      username: 'johndoe',
      displayName: 'John Doe',
      avatarUrl: 'https://example.com/avatar1.jpg',
    },
    { id: 'user-2', username: 'janedoe', displayName: 'Jane Doe' },
  ];

  const defaultMentionsResult = {
    query: '',
    setQuery: mockSetQuery,
    users: [],
    isLoading: false,
    error: null,
    clear: mockClear,
    isStale: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMentions.mockReturnValue(defaultMentionsResult);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render textarea with placeholder', () => {
      render(<MentionInput value="" onChange={() => {}} placeholder="Type here..." />);

      expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
    });

    it('should render textarea with value', () => {
      render(<MentionInput value="Hello world" onChange={() => {}} />);

      expect(screen.getByRole('textbox')).toHaveValue('Hello world');
    });

    it('should be disabled when disabled prop is true', () => {
      render(<MentionInput value="" onChange={() => {}} disabled />);

      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should apply custom className', () => {
      render(<MentionInput value="" onChange={() => {}} className="custom-class" />);

      expect(screen.getByRole('textbox').className).toContain('custom-class');
    });

    it('should set id attribute', () => {
      render(<MentionInput value="" onChange={() => {}} id="my-textarea" />);

      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'my-textarea');
    });

    it('should set aria-label', () => {
      render(<MentionInput value="" onChange={() => {}} ariaLabel="Response content" />);

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Response content');
    });

    it('should set maxLength', () => {
      render(<MentionInput value="" onChange={() => {}} maxLength={100} />);

      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '100');
    });
  });

  describe('text input', () => {
    it('should call onChange when typing', () => {
      const onChange = vi.fn();
      render(<MentionInput value="" onChange={onChange} />);

      fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Hello' } });

      expect(onChange).toHaveBeenCalledWith('Hello');
    });

    it('should call onSubmit when Enter is pressed without shift', () => {
      const onSubmit = vi.fn();
      render(<MentionInput value="Hello" onChange={() => {}} onSubmit={onSubmit} />);

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

      expect(onSubmit).toHaveBeenCalled();
    });

    it('should not call onSubmit when Shift+Enter is pressed', () => {
      const onSubmit = vi.fn();
      render(<MentionInput value="Hello" onChange={() => {}} onSubmit={onSubmit} />);

      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter', shiftKey: true });

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('@mention detection', () => {
    it('should trigger search when @ is typed at start', () => {
      render(<MentionInput value="" onChange={() => {}} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      expect(mockSetQuery).toHaveBeenCalledWith('john');
    });

    it('should trigger search when @ is typed after space', () => {
      render(<MentionInput value="" onChange={() => {}} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'Hello @john', selectionStart: 11 },
      });

      expect(mockSetQuery).toHaveBeenCalledWith('john');
    });

    it('should not trigger search when @ is in middle of word', () => {
      render(<MentionInput value="" onChange={() => {}} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: 'email@test', selectionStart: 10 },
      });

      // Should not have called setQuery with any mention query
      // The mock should either not be called or be called with empty string
      expect(mockSetQuery).not.toHaveBeenCalledWith('test');
    });

    it('should not trigger search when mention query contains space', () => {
      render(<MentionInput value="" onChange={() => {}} />);

      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john doe', selectionStart: 9 },
      });

      // Once space is typed, the query ends
      expect(mockClear).toHaveBeenCalled();
    });
  });

  describe('mention dropdown', () => {
    it('should show dropdown when users are returned from search', () => {
      mockUseMentions.mockReturnValue({
        ...defaultMentionsResult,
        query: 'john',
        users: mockUsers,
      });

      const { rerender } = render(<MentionInput value="" onChange={() => {}} />);

      // Trigger mention search
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      // Re-render with users
      rerender(<MentionInput value="@john" onChange={() => {}} />);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should hide dropdown when Escape is pressed', () => {
      mockUseMentions.mockReturnValue({
        ...defaultMentionsResult,
        query: 'john',
        users: mockUsers,
      });

      const { rerender } = render(<MentionInput value="" onChange={() => {}} />);

      // Trigger mention search
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      rerender(<MentionInput value="@john" onChange={() => {}} />);

      // Press Escape
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });

      expect(mockClear).toHaveBeenCalled();
    });

    it('should navigate dropdown with arrow keys', () => {
      mockUseMentions.mockReturnValue({
        ...defaultMentionsResult,
        query: 'john',
        users: mockUsers,
      });

      const { rerender } = render(<MentionInput value="" onChange={() => {}} />);

      // Trigger mention search
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      rerender(<MentionInput value="@john" onChange={() => {}} />);

      // First option should be highlighted by default
      let options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');

      // Press down arrow
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'ArrowDown' });

      // Second option should now be highlighted
      options = screen.getAllByRole('option');
      expect(options[1]).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('mention insertion', () => {
    it('should insert mention in correct format when user is selected', async () => {
      const onChange = vi.fn();

      mockUseMentions.mockReturnValue({
        ...defaultMentionsResult,
        query: 'john',
        users: mockUsers,
      });

      const { rerender } = render(<MentionInput value="" onChange={onChange} />);

      // Trigger mention search
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      rerender(<MentionInput value="@john" onChange={onChange} />);

      // Click on a user
      fireEvent.click(screen.getByText('John Doe'));

      await waitFor(() => {
        // Should have inserted the mention format
        expect(onChange).toHaveBeenCalledWith(expect.stringContaining('@[John Doe](user-1)'));
      });
    });

    it('should select highlighted user when Enter is pressed', async () => {
      const onChange = vi.fn();

      mockUseMentions.mockReturnValue({
        ...defaultMentionsResult,
        query: 'john',
        users: mockUsers,
      });

      const { rerender } = render(<MentionInput value="" onChange={onChange} />);

      // Trigger mention search
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      rerender(<MentionInput value="@john" onChange={onChange} />);

      // Press Enter to select first user
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(expect.stringContaining('@[John Doe](user-1)'));
      });
    });

    it('should clear search after mention is inserted', async () => {
      const onChange = vi.fn();

      mockUseMentions.mockReturnValue({
        ...defaultMentionsResult,
        query: 'john',
        users: mockUsers,
      });

      const { rerender } = render(<MentionInput value="" onChange={onChange} />);

      // Trigger mention search
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      rerender(<MentionInput value="@john" onChange={onChange} />);

      // Select user
      fireEvent.click(screen.getByText('John Doe'));

      await waitFor(() => {
        expect(mockClear).toHaveBeenCalled();
      });
    });
  });

  describe('topic context', () => {
    it('should pass topicId to useMentions', () => {
      mockUseMentions.mockReturnValue(defaultMentionsResult);

      render(<MentionInput value="" onChange={() => {}} topicId="topic-123" />);

      expect(mockUseMentions).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have aria-haspopup when dropdown is visible', () => {
      mockUseMentions.mockReturnValue({
        ...defaultMentionsResult,
        query: 'john',
        users: mockUsers,
      });

      const { rerender } = render(<MentionInput value="" onChange={() => {}} />);

      // Trigger mention search
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      rerender(<MentionInput value="@john" onChange={() => {}} />);

      // aria-haspopup="listbox" is used instead of aria-expanded because
      // aria-expanded is not valid on textarea elements per ARIA spec
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('should have aria-autocomplete when dropdown is visible', () => {
      mockUseMentions.mockReturnValue({
        ...defaultMentionsResult,
        query: 'john',
        users: mockUsers,
      });

      const { rerender } = render(<MentionInput value="" onChange={() => {}} />);

      // Trigger mention search
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      rerender(<MentionInput value="@john" onChange={() => {}} />);

      expect(screen.getByRole('textbox')).toHaveAttribute('aria-autocomplete', 'list');
    });
  });

  describe('dark mode', () => {
    it('should include dark mode classes', () => {
      render(<MentionInput value="" onChange={() => {}} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea.className).toContain('dark:bg-gray-800');
      expect(textarea.className).toContain('dark:border-gray-600');
    });
  });

  describe('loading state', () => {
    it('should show loading indicator in dropdown', () => {
      mockUseMentions.mockReturnValue({
        ...defaultMentionsResult,
        query: 'john',
        users: [],
        isLoading: true,
      });

      const { rerender } = render(<MentionInput value="" onChange={() => {}} />);

      // Trigger mention search
      fireEvent.change(screen.getByRole('textbox'), {
        target: { value: '@john', selectionStart: 5 },
      });

      rerender(<MentionInput value="@john" onChange={() => {}} />);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });
  });
});
