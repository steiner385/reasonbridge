/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for ResponseComposer markdown functionality
 *
 * Tests the markdown preview and formatting toolbar including:
 * - Preview toggle behavior
 * - Markdown rendering in preview
 * - Formatting toolbar buttons
 * - Keyboard shortcuts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResponseComposer from './ResponseComposer';

// Mock dependencies
vi.mock('../../contexts/AuthContext', () => ({
  useAuthContext: vi.fn(() => ({
    user: { id: 'user-1', isMinor: false },
    isAuthenticated: true,
  })),
}));

vi.mock('../../hooks/useRequireAuth', () => ({
  useRequireAuth: vi.fn(() => ({
    requireAuth: (callback: () => void) => callback(),
  })),
}));

vi.mock('../../hooks/useTypingIndicator', () => ({
  useTypingIndicator: vi.fn(() => ({
    sendTyping: vi.fn(),
  })),
}));

vi.mock('../../hooks/useHybridPreviewFeedback', () => ({
  useHybridPreviewFeedback: vi.fn(() => ({
    feedback: [],
    readyToPost: true,
    isLoading: false,
    isAILoading: false,
    isAIFeedback: false,
    error: null,
    summary: '',
    sensitivity: 'medium',
    setSensitivity: vi.fn(),
  })),
}));

vi.mock('./MentionInput', () => ({
  default: ({
    id,
    value,
    onChange,
    placeholder,
    disabled,
  }: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      data-testid="mention-input"
    />
  ),
}));

describe('ResponseComposer Markdown Features', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('preview toggle', () => {
    it('should render preview toggle button', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);

      const toggleButton = screen.getByTestId('preview-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('Show Preview');
    });

    it('should toggle preview visibility', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      // Enter some content first
      const textarea = screen.getByTestId('mention-input');
      await user.type(textarea, 'Test content');

      // Toggle preview on
      const toggleButton = screen.getByTestId('preview-toggle');
      await user.click(toggleButton);

      expect(toggleButton).toHaveTextContent('Hide Preview');
      expect(screen.getByTestId('markdown-preview')).toBeInTheDocument();

      // Toggle preview off
      await user.click(toggleButton);

      expect(toggleButton).toHaveTextContent('Show Preview');
      expect(screen.queryByTestId('markdown-preview')).not.toBeInTheDocument();
    });

    it('should have correct aria-pressed attribute', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      const toggleButton = screen.getByTestId('preview-toggle');
      expect(toggleButton).toHaveAttribute('aria-pressed', 'false');

      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should not show preview when content is empty', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      // Toggle preview on without content
      const toggleButton = screen.getByTestId('preview-toggle');
      await user.click(toggleButton);

      expect(screen.queryByTestId('markdown-preview')).not.toBeInTheDocument();
    });
  });

  describe('markdown preview', () => {
    it('should render markdown content in preview', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      // Enter markdown content
      const textarea = screen.getByTestId('mention-input');
      await user.type(textarea, '**Bold text**');

      // Toggle preview on
      await user.click(screen.getByTestId('preview-toggle'));

      const preview = screen.getByTestId('markdown-preview');
      expect(preview).toBeInTheDocument();

      // Check that markdown renderer is present
      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument();
    });

    it('should update preview as content changes', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      // Enter initial content and enable preview
      const textarea = screen.getByTestId('mention-input');
      await user.type(textarea, 'First text');
      await user.click(screen.getByTestId('preview-toggle'));

      const preview = screen.getByTestId('markdown-preview');
      expect(preview).toHaveTextContent('First text');

      // Type more content (append)
      await user.type(textarea, ' and more');

      expect(preview).toHaveTextContent('First text and more');
    });
  });

  describe('formatting toolbar', () => {
    it('should render markdown toolbar', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);

      const toolbar = screen.getByTestId('markdown-toolbar');
      expect(toolbar).toBeInTheDocument();
      expect(toolbar).toHaveAttribute('role', 'toolbar');
    });

    it('should render all formatting buttons', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByTestId('toolbar-bold')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-italic')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-link')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-code')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-quote')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-bullet-list')).toBeInTheDocument();
      expect(screen.getByTestId('toolbar-numbered-list')).toBeInTheDocument();
    });

    it('should have accessible labels on toolbar buttons', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByLabelText('Bold')).toBeInTheDocument();
      expect(screen.getByLabelText('Italic')).toBeInTheDocument();
      expect(screen.getByLabelText('Insert Link')).toBeInTheDocument();
      expect(screen.getByLabelText('Inline Code')).toBeInTheDocument();
      expect(screen.getByLabelText('Blockquote')).toBeInTheDocument();
      expect(screen.getByLabelText('Bullet List')).toBeInTheDocument();
      expect(screen.getByLabelText('Numbered List')).toBeInTheDocument();
    });

    it('should insert bold markdown when bold button clicked', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      // Click bold button
      await user.click(screen.getByTestId('toolbar-bold'));

      // Check that bold markdown was inserted
      const textarea = screen.getByTestId('mention-input');
      expect(textarea).toHaveValue('**bold**');
    });

    it('should insert italic markdown when italic button clicked', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('toolbar-italic'));

      const textarea = screen.getByTestId('mention-input');
      expect(textarea).toHaveValue('*italic*');
    });

    it('should insert link markdown when link button clicked', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('toolbar-link'));

      const textarea = screen.getByTestId('mention-input');
      expect(textarea).toHaveValue('[link text](url)');
    });

    it('should insert code markdown when code button clicked', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('toolbar-code'));

      const textarea = screen.getByTestId('mention-input');
      expect(textarea).toHaveValue('`code`');
    });

    it('should insert blockquote markdown when quote button clicked', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('toolbar-quote'));

      const textarea = screen.getByTestId('mention-input');
      expect(textarea).toHaveValue('> quote');
    });

    it('should insert bullet list markdown when list button clicked', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('toolbar-bullet-list'));

      const textarea = screen.getByTestId('mention-input');
      expect(textarea).toHaveValue('- list item');
    });

    it('should insert numbered list markdown when numbered list button clicked', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('toolbar-numbered-list'));

      const textarea = screen.getByTestId('mention-input');
      expect(textarea).toHaveValue('1. list item');
    });
  });

  describe('markdown hint', () => {
    it('should show markdown support hint', () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Supports Markdown formatting')).toBeInTheDocument();
    });
  });

  describe('integration with submit', () => {
    it('should submit raw markdown content', async () => {
      render(<ResponseComposer onSubmit={mockOnSubmit} />);
      const user = userEvent.setup();

      // Enter markdown content (must be at least 10 chars for minLength)
      const textarea = screen.getByTestId('mention-input');
      await user.type(textarea, '**Bold** and *italic* text');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /post response/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            content: '**Bold** and *italic* text',
          }),
        );
      });
    });
  });
});
