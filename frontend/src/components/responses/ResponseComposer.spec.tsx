import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { UsePreviewFeedbackResult } from '../../hooks/usePreviewFeedback';
import ResponseComposer from './ResponseComposer';

// Mock usePreviewFeedback hook
vi.mock('../../hooks/usePreviewFeedback', () => ({
  usePreviewFeedback: vi.fn(() => ({
    feedback: [],
    readyToPost: true,
    isLoading: false,
    error: null,
    summary: '',
    sensitivity: 'MEDIUM',
    setSensitivity: vi.fn(),
  })),
}));

describe('ResponseComposer', () => {
  let queryClient: QueryClient;
  const mockOnSubmit = vi.fn();
  const mockOnPreviewFeedbackChange = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Inline mode', () => {
    it('should render collapsed state when inline=true and not expanded', () => {
      render(<ResponseComposer inline onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      // Should show placeholder button
      const placeholderButton = screen.getByRole('button', { name: /share your perspective/i });
      expect(placeholderButton).toBeInTheDocument();

      // Should not show textarea
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('should expand when clicked in inline mode', async () => {
      render(<ResponseComposer inline onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      // Click placeholder to expand
      const placeholderButton = screen.getByRole('button', { name: /share your perspective/i });
      fireEvent.click(placeholderButton);

      // Should now show textarea
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    it('should always show expanded state when inline=false', () => {
      render(<ResponseComposer inline={false} onSubmit={mockOnSubmit} topicId="topic-1" />, {
        wrapper,
      });

      // Should show textarea immediately
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should show Cancel button in inline mode', async () => {
      render(<ResponseComposer inline onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /share your perspective/i }));

      // Should show Cancel button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      });
    });

    it('should collapse and clear content when Cancel is clicked', async () => {
      render(<ResponseComposer inline onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      // Expand and type content
      fireEvent.click(screen.getByRole('button', { name: /share your perspective/i }));

      const textarea = await screen.findByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Test content' } });

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Should collapse back to placeholder
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /share your perspective/i })).toBeInTheDocument();
      });

      // Content should be cleared
      expect(screen.queryByText('Test content')).not.toBeInTheDocument();
    });
  });

  describe('Preview feedback integration', () => {
    it('should call onPreviewFeedbackChange when content changes', async () => {
      const { usePreviewFeedback } = await import('../../hooks/usePreviewFeedback');

      vi.mocked(usePreviewFeedback).mockReturnValue({
        feedback: [{ type: 'suggestion', message: 'Add evidence' }],
        readyToPost: false,
        isLoading: false,
        error: null,
        summary: 'Consider adding more evidence',
        sensitivity: 'MEDIUM',
        setSensitivity: vi.fn(),
      } as UsePreviewFeedbackResult);

      render(
        <ResponseComposer
          onSubmit={mockOnSubmit}
          topicId="topic-1"
          onPreviewFeedbackChange={mockOnPreviewFeedbackChange}
        />,
        { wrapper },
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, {
        target: { value: 'This is a long enough content for preview feedback' },
      });

      await waitFor(() => {
        expect(mockOnPreviewFeedbackChange).toHaveBeenCalledWith(
          [{ type: 'suggestion', message: 'Add evidence' }],
          false,
          'Consider adding more evidence',
          false,
          null,
        );
      });
    });

    it('should clear preview feedback when content is empty', async () => {
      render(
        <ResponseComposer
          onSubmit={mockOnSubmit}
          topicId="topic-1"
          onPreviewFeedbackChange={mockOnPreviewFeedbackChange}
        />,
        { wrapper },
      );

      const textarea = screen.getByRole('textbox');

      // Type content
      fireEvent.change(textarea, { target: { value: 'Some content' } });

      // Clear content
      fireEvent.change(textarea, { target: { value: '' } });

      await waitFor(() => {
        expect(mockOnPreviewFeedbackChange).toHaveBeenCalledWith([], true, '', false, null);
      });
    });

    it('should not show inline preview when showPreviewFeedbackInline=false', async () => {
      const { usePreviewFeedback } = await import('../../hooks/usePreviewFeedback');

      vi.mocked(usePreviewFeedback).mockReturnValue({
        feedback: [{ type: 'suggestion', message: 'Add evidence' }],
        readyToPost: false,
        isLoading: false,
        error: null,
        summary: 'Consider adding more evidence',
        sensitivity: 'MEDIUM',
        setSensitivity: vi.fn(),
      } as UsePreviewFeedbackResult);

      render(
        <ResponseComposer
          onSubmit={mockOnSubmit}
          topicId="topic-1"
          showPreviewFeedbackInline={false}
        />,
        { wrapper },
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, {
        target: { value: 'This is a long enough content for preview feedback' },
      });

      // Should not show inline feedback panel
      await waitFor(() => {
        expect(screen.queryByText('Feedback Preview')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('should validate minimum length before submission', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={10} />, {
        wrapper,
      });

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Short' } });

      const submitButton = screen.getByRole('button', { name: /post response/i });
      fireEvent.click(submitButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText(/must be at least 10 characters/i)).toBeInTheDocument();
      });

      // Should not call onSubmit
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should submit valid response', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={10} />, {
        wrapper,
      });

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'This is valid content' } });

      const submitButton = screen.getByRole('button', { name: /post response/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'This is valid content',
          }),
        );
      });
    });

    it('should reset form after successful submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={10} />, {
        wrapper,
      });

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'This is valid content' } });

      const submitButton = screen.getByRole('button', { name: /post response/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      // Form should be reset
      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should collapse after submission in inline mode', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(<ResponseComposer inline onSubmit={mockOnSubmit} topicId="topic-1" minLength={10} />, {
        wrapper,
      });

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /share your perspective/i }));

      // Type and submit
      const textarea = await screen.findByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'This is valid content' } });

      const submitButton = screen.getByRole('button', { name: /post response/i });
      fireEvent.click(submitButton);

      // Should collapse back to placeholder
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /share your perspective/i })).toBeInTheDocument();
      });
    });

    it('should include parentId when provided', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(
        <ResponseComposer
          onSubmit={mockOnSubmit}
          topicId="topic-1"
          parentId="parent-123"
          minLength={10}
        />,
        { wrapper },
      );

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'This is a reply' } });

      const submitButton = screen.getByRole('button', { name: /post reply/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            content: 'This is a reply',
            parentId: 'parent-123',
          }),
        );
      });
    });
  });

  describe('Character count', () => {
    it('should display character count', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" maxLength={100} />, {
        wrapper,
      });

      expect(screen.getByText(/0 \/ 100 characters/i)).toBeInTheDocument();
    });

    it('should update character count as user types', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" maxLength={100} />, {
        wrapper,
      });

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      expect(screen.getByText(/5 \/ 100 characters/i)).toBeInTheDocument();
    });

    it('should show minimum length hint when below minimum', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={50} />, {
        wrapper,
      });

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Short content' } });

      expect(screen.getByText(/minimum 50/i)).toBeInTheDocument();
    });

    it('should disable submit button when content is invalid', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={20} />, {
        wrapper,
      });

      const submitButton = screen.getByRole('button', { name: /post response/i });

      // Should be disabled with no content
      expect(submitButton).toBeDisabled();

      // Type short content
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Short' } });

      // Should still be disabled
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Cited sources', () => {
    it('should add valid URL as cited source', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/i);
      fireEvent.change(sourceInput, { target: { value: 'https://example.com' } });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });
    });

    it('should show error for invalid URL', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/i);
      fireEvent.change(sourceInput, { target: { value: 'not-a-url' } });

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
      });
    });

    it('should remove cited source when delete button is clicked', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      // Add a source
      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/i);
      fireEvent.change(sourceInput, { target: { value: 'https://example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // Remove the source
      const removeButton = screen.getByLabelText(/remove source/i);
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('https://example.com')).not.toBeInTheDocument();
      });
    });

    it('should include cited sources in submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={10} />, {
        wrapper,
      });

      // Add sources
      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/i);
      fireEvent.change(sourceInput, { target: { value: 'https://example1.com' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('https://example1.com')).toBeInTheDocument();
      });

      fireEvent.change(sourceInput, { target: { value: 'https://example2.com' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('https://example2.com')).toBeInTheDocument();
      });

      // Submit
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Content with sources' } });

      const submitButton = screen.getByRole('button', { name: /post response/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            citedSources: ['https://example1.com', 'https://example2.com'],
          }),
        );
      });
    });
  });
});
