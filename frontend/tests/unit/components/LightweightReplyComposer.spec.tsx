/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  LightweightReplyComposer,
  CollapsedPlaceholder,
  CitationInput,
  OptionsPopover,
} from '../../../src/components/responses/LightweightReplyComposer';

// Mock the useHybridPreviewFeedback hook
vi.mock('../../../src/hooks/useHybridPreviewFeedback', () => ({
  useHybridPreviewFeedback: vi.fn(() => ({
    feedback: [],
    readyToPost: true,
    isLoading: false,
    summary: '',
    error: null,
  })),
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('CollapsedPlaceholder', () => {
  it('should render with author name', () => {
    const onClick = vi.fn();
    render(<CollapsedPlaceholder authorName="Alice" onClick={onClick} />);

    expect(screen.getByText('Reply to Alice...')).toBeInTheDocument();
  });

  it('should render default text without author name', () => {
    const onClick = vi.fn();
    render(<CollapsedPlaceholder onClick={onClick} />);

    expect(screen.getByText('Write a reply...')).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CollapsedPlaceholder authorName="Alice" onClick={onClick} />);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CitationInput', () => {
  it('should render input and buttons', () => {
    const onAdd = vi.fn();
    const onCancel = vi.fn();
    render(<CitationInput onAdd={onAdd} onCancel={onCancel} existingCitations={[]} />);

    expect(screen.getByPlaceholderText('https://example.com/source')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('should validate URL and call onAdd', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onCancel = vi.fn();
    render(<CitationInput onAdd={onAdd} onCancel={onCancel} existingCitations={[]} />);

    const input = screen.getByPlaceholderText('https://example.com/source');
    await user.type(input, 'https://example.com/article');
    await user.click(screen.getByText('Add'));

    expect(onAdd).toHaveBeenCalledWith('https://example.com/article');
  });

  it('should show error for invalid URL', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onCancel = vi.fn();
    render(<CitationInput onAdd={onAdd} onCancel={onCancel} existingCitations={[]} />);

    const input = screen.getByPlaceholderText('https://example.com/source');
    await user.type(input, 'not-a-url');
    await user.click(screen.getByText('Add'));

    expect(screen.getByText('Please enter a valid URL (including https://)')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('should show error for duplicate citation', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const onCancel = vi.fn();
    render(
      <CitationInput
        onAdd={onAdd}
        onCancel={onCancel}
        existingCitations={['https://example.com/existing']}
      />,
    );

    const input = screen.getByPlaceholderText('https://example.com/source');
    await user.type(input, 'https://example.com/existing');
    await user.click(screen.getByText('Add'));

    expect(screen.getByText('This citation has already been added')).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe('OptionsPopover', () => {
  it('should render checkboxes', () => {
    const onClose = vi.fn();
    render(
      <OptionsPopover
        containsOpinion={false}
        containsFactualClaims={false}
        onContainsOpinionChange={vi.fn()}
        onContainsFactualClaimsChange={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Contains my opinion')).toBeInTheDocument();
    expect(screen.getByText('Contains factual claims')).toBeInTheDocument();
  });

  it('should call handlers when checkboxes change', async () => {
    const user = userEvent.setup();
    const onContainsOpinionChange = vi.fn();
    const onContainsFactualClaimsChange = vi.fn();

    render(
      <OptionsPopover
        containsOpinion={false}
        containsFactualClaims={false}
        onContainsOpinionChange={onContainsOpinionChange}
        onContainsFactualClaimsChange={onContainsFactualClaimsChange}
        onClose={vi.fn()}
      />,
    );

    const opinionCheckbox = screen.getByRole('checkbox', { name: /opinion/i });
    await user.click(opinionCheckbox);

    expect(onContainsOpinionChange).toHaveBeenCalledWith(true);
  });
});

describe('LightweightReplyComposer', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    mockOnCancel = vi.fn();
  });

  it('should render collapsed state by default', () => {
    renderWithProviders(
      <LightweightReplyComposer
        parentId="parent-1"
        authorName="Alice"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    expect(screen.getByText('Reply to Alice...')).toBeInTheDocument();
  });

  it('should expand when collapsed placeholder is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LightweightReplyComposer
        parentId="parent-1"
        authorName="Alice"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: /reply to alice/i }));

    expect(screen.getByTestId('expanded-composer')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write your reply...')).toBeInTheDocument();
  });

  it('should render expanded state when defaultExpanded is true', () => {
    renderWithProviders(
      <LightweightReplyComposer
        parentId="parent-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        defaultExpanded
      />,
    );

    expect(screen.getByTestId('expanded-composer')).toBeInTheDocument();
  });

  it('should submit when Post button is clicked with valid content', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LightweightReplyComposer
        parentId="parent-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        defaultExpanded
        minLength={5}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write your reply...');
    await user.type(textarea, 'This is a valid reply');
    await user.click(screen.getByText('Post'));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        content: 'This is a valid reply',
        parentId: 'parent-1',
      });
    });
  });

  it('should disable Post button when content is below minimum length', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LightweightReplyComposer
        parentId="parent-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        defaultExpanded
        minLength={10}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write your reply...');
    await user.type(textarea, 'Short');

    const postButton = screen.getByText('Post');
    expect(postButton).toBeDisabled();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should enable Post button when content meets minimum length', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LightweightReplyComposer
        parentId="parent-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        defaultExpanded
        minLength={10}
      />,
    );

    const textarea = screen.getByPlaceholderText('Write your reply...');
    await user.type(textarea, 'This is long enough');

    const postButton = screen.getByText('Post');
    expect(postButton).not.toBeDisabled();
  });

  it('should call onCancel when Cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LightweightReplyComposer
        parentId="parent-1"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        defaultExpanded
      />,
    );

    await user.click(screen.getByText('Cancel'));

    expect(mockOnCancel).toHaveBeenCalled();
  });
});
