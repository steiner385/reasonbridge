import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useHybridPreviewFeedback } from '../../hooks/useHybridPreviewFeedback';
import ResponseComposer from './ResponseComposer';

// Mock the authentication context - component reads `user` and requires auth to submit
vi.mock('../../contexts/AuthContext', () => ({
  useAuthContext: vi.fn(() => ({
    user: { id: 'user-1', isMinor: false },
    isAuthenticated: true,
  })),
}));

// requireAuth simply invokes the callback (user is authenticated)
vi.mock('../../hooks/useRequireAuth', () => ({
  useRequireAuth: vi.fn(() => ({
    requireAuth: (callback: () => void) => callback(),
  })),
}));

// Typing indicator - no-op in tests
vi.mock('../../hooks/useTypingIndicator', () => ({
  useTypingIndicator: vi.fn(() => ({
    sendTyping: vi.fn(),
  })),
}));

// The component uses useHybridPreviewFeedback (regex + AI), not usePreviewFeedback
vi.mock('../../hooks/useHybridPreviewFeedback', () => ({
  useHybridPreviewFeedback: vi.fn(() => ({
    feedback: [],
    readyToPost: true,
    isLoading: false,
    isAILoading: false,
    isAIFeedback: false,
    error: null,
    summary: '',
    sensitivity: 'MEDIUM',
    setSensitivity: vi.fn(),
  })),
}));

// Replace MentionInput with a plain textarea so we can drive content changes directly
vi.mock('./MentionInput', () => ({
  default: ({
    id,
    value,
    onChange,
    placeholder,
    disabled,
    ariaLabel,
    maxLength,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    ariaLabel?: string;
    maxLength?: number;
  }) => (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      maxLength={maxLength}
      data-testid="mention-input"
    />
  ),
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
    // Reset hybrid feedback mock to default after clearAllMocks wipes implementations
    vi.mocked(useHybridPreviewFeedback).mockReturnValue({
      feedback: [],
      readyToPost: true,
      isLoading: false,
      isAILoading: false,
      isAIFeedback: false,
      isError: false,
      error: null,
      summary: '',
      sensitivity: 'MEDIUM',
      setSensitivity: vi.fn(),
      isContentValid: false,
      analysisTimeMs: 0,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Rendering', () => {
    // The `inline` prop is currently reserved (unused) in the component: the composer
    // always renders its expanded form (textarea) regardless of `inline`. There is no
    // collapsed "Share your perspective" placeholder button. These tests assert the
    // actual current behavior.
    it('should render the textarea immediately when inline=true', () => {
      render(<ResponseComposer inline onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      expect(screen.getByRole('textbox', { name: /your response/i })).toBeInTheDocument();
    });

    it('should render the textarea immediately when inline=false', () => {
      render(<ResponseComposer inline={false} onSubmit={mockOnSubmit} topicId="topic-1" />, {
        wrapper,
      });

      expect(screen.getByRole('textbox', { name: /your response/i })).toBeInTheDocument();
    });

    it('should use the placeholder text as the textarea placeholder (no collapse button)', () => {
      render(<ResponseComposer inline onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      // "Share your perspective..." is the default placeholder text, not a button
      expect(screen.getByPlaceholderText(/share your perspective/i)).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /share your perspective/i }),
      ).not.toBeInTheDocument();
    });

    it('should show a Cancel button only when showCancel is true', () => {
      const { rerender } = render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" />, {
        wrapper,
      });

      // No cancel button by default
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();

      rerender(
        <QueryClientProvider client={queryClient}>
          <ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" showCancel />
        </QueryClientProvider>,
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should call onCancel when the Cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(
        <ResponseComposer
          onSubmit={mockOnSubmit}
          topicId="topic-1"
          showCancel
          onCancel={onCancel}
        />,
        { wrapper },
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Preview feedback integration', () => {
    it('should call onPreviewFeedbackChange with the hook values', async () => {
      vi.mocked(useHybridPreviewFeedback).mockReturnValue({
        feedback: [{ type: 'suggestion', severity: 'info', message: 'Add evidence' }],
        readyToPost: false,
        isLoading: false,
        isAILoading: false,
        isAIFeedback: false,
        isError: false,
        error: null,
        summary: 'Consider adding more evidence',
        sensitivity: 'MEDIUM',
        setSensitivity: vi.fn(),
        isContentValid: true,
        analysisTimeMs: 0,
      });

      render(
        <ResponseComposer
          onSubmit={mockOnSubmit}
          topicId="topic-1"
          onPreviewFeedbackChange={mockOnPreviewFeedbackChange}
        />,
        { wrapper },
      );

      // The component fires the callback from an effect using the hook's return values.
      // Signature: (feedback, readyToPost, summary, isLoading, error)
      await waitFor(() => {
        expect(mockOnPreviewFeedbackChange).toHaveBeenCalledWith(
          [{ type: 'suggestion', severity: 'info', message: 'Add evidence' }],
          false,
          'Consider adding more evidence',
          false,
          null,
        );
      });
    });

    it('should coerce a null readyToPost to false when notifying the parent', async () => {
      vi.mocked(useHybridPreviewFeedback).mockReturnValue({
        feedback: [],
        readyToPost: null, // AI still analyzing
        isLoading: false,
        isAILoading: true,
        isAIFeedback: false,
        isError: false,
        error: null,
        summary: '',
        sensitivity: 'MEDIUM',
        setSensitivity: vi.fn(),
        isContentValid: true,
        analysisTimeMs: 0,
      });

      render(
        <ResponseComposer
          onSubmit={mockOnSubmit}
          topicId="topic-1"
          onPreviewFeedbackChange={mockOnPreviewFeedbackChange}
        />,
        { wrapper },
      );

      await waitFor(() => {
        expect(mockOnPreviewFeedbackChange).toHaveBeenCalledWith([], false, '', false, null);
      });
    });

    it('should render the inline preview panel once content reaches 20 characters', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" />, { wrapper });

      const textarea = screen.getByTestId('mention-input');

      // Below threshold: no preview panel
      fireEvent.change(textarea, { target: { value: 'short' } });
      expect(screen.queryByLabelText('Preview feedback')).not.toBeInTheDocument();

      // At/above threshold (>= 20 chars): preview panel appears
      fireEvent.change(textarea, {
        target: { value: 'This is a long enough content for preview' },
      });

      await waitFor(() => {
        expect(screen.getByLabelText('Preview feedback')).toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('should validate minimum length before submission', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={10} />, {
        wrapper,
      });

      const textarea = screen.getByTestId('mention-input');
      fireEvent.change(textarea, { target: { value: 'Short' } });

      // Submit is disabled below minLength, so submit via the form directly
      fireEvent.submit(textarea.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should submit valid response', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={10} />, {
        wrapper,
      });

      const textarea = screen.getByTestId('mention-input');
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

      const textarea = screen.getByTestId('mention-input');
      fireEvent.change(textarea, { target: { value: 'This is valid content' } });

      const submitButton = screen.getByRole('button', { name: /post response/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(textarea).toHaveValue('');
      });
    });

    it('should include parentId and render "Post Reply" when parentId is provided', async () => {
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

      const textarea = screen.getByTestId('mention-input');
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

      const textarea = screen.getByTestId('mention-input');
      fireEvent.change(textarea, { target: { value: 'Hello' } });

      expect(screen.getByText(/5 \/ 100 characters/i)).toBeInTheDocument();
    });

    it('should show minimum length hint when below minimum', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={50} />, {
        wrapper,
      });

      const textarea = screen.getByTestId('mention-input');
      fireEvent.change(textarea, { target: { value: 'Short content' } });

      expect(screen.getByText(/minimum 50/i)).toBeInTheDocument();
    });

    it('should disable submit button when content is invalid', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} topicId="topic-1" minLength={20} />, {
        wrapper,
      });

      const submitButton = screen.getByRole('button', { name: /post response/i });

      // Disabled with no content
      expect(submitButton).toBeDisabled();

      // Type short content (below minLength) - still disabled
      const textarea = screen.getByTestId('mention-input');
      fireEvent.change(textarea, { target: { value: 'Short' } });

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

      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/i);
      fireEvent.change(sourceInput, { target: { value: 'https://example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /add/i }));

      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // aria-label is "Remove source https://example.com"
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

      const textarea = screen.getByTestId('mention-input');
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
