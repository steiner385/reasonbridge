import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SuggestionPanel from '../SuggestionPanel';
import type {
  TagSuggestionsResponse,
  TopicLinkSuggestionsResponse,
} from '../../../types/suggestions';
import * as useSuggestionActionsModule from '../../../hooks/useSuggestionActions';

// Mock the useSuggestionActions hook
vi.mock('../../../hooks/useSuggestionActions');

describe('SuggestionPanel', () => {
  const mockApplyTag = vi.fn();
  const mockApplyTopicLink = vi.fn();
  const mockDismissTag = vi.fn();
  const mockDismissTopicLink = vi.fn();
  const mockIsTagApplied = vi.fn();
  const mockIsTagDismissed = vi.fn();
  const mockIsTopicLinkApplied = vi.fn();
  const mockIsTopicLinkDismissed = vi.fn();

  const mockTagSuggestions: TagSuggestionsResponse = {
    suggestions: ['politics', 'economics', 'healthcare'],
    confidenceScore: 0.89,
    reasoning: 'The response discusses economic policy and healthcare reform',
    attribution: 'GPT-4 Analysis',
  };

  const mockTopicLinkSuggestions: TopicLinkSuggestionsResponse = {
    suggestions: [],
    linkSuggestions: [
      {
        targetTopicId: 'topic-abc123def456',
        relationshipType: 'supports',
        reasoning: 'Both topics argue for renewable energy investment',
      },
      {
        targetTopicId: 'topic-xyz789ghi012',
        relationshipType: 'contradicts',
        reasoning: 'This topic opposes the economic feasibility claim',
      },
    ],
    confidenceScore: 0.92,
    reasoning: 'The response touches on multiple established discussions',
    attribution: 'Claude Sonnet',
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementation
    mockIsTagApplied.mockReturnValue(false);
    mockIsTagDismissed.mockReturnValue(false);
    mockIsTopicLinkApplied.mockReturnValue(false);
    mockIsTopicLinkDismissed.mockReturnValue(false);

    vi.mocked(useSuggestionActionsModule.useSuggestionActions).mockReturnValue({
      applyTag: mockApplyTag,
      applyTopicLink: mockApplyTopicLink,
      dismissTag: mockDismissTag,
      dismissTopicLink: mockDismissTopicLink,
      isTagApplied: mockIsTagApplied,
      isTagDismissed: mockIsTagDismissed,
      isTopicLinkApplied: mockIsTopicLinkApplied,
      isTopicLinkDismissed: mockIsTopicLinkDismissed,
      isApplying: false,
      error: null,
    });
  });

  describe('Apply Tag Suggestions', () => {
    it('should apply a tag suggestion when accept button is clicked', async () => {
      mockApplyTag.mockResolvedValue({ success: true });
      const user = userEvent.setup();

      render(<SuggestionPanel type="tags" topicId="topic-1" tagSuggestions={mockTagSuggestions} />);

      await user.click(screen.getByRole('button', { name: /accept tag politics/i }));

      expect(mockApplyTag).toHaveBeenCalledWith({ topicId: 'topic-1', tag: 'politics' });
    });

    it('should show loading indicator while applying tag', () => {
      vi.mocked(useSuggestionActionsModule.useSuggestionActions).mockReturnValue({
        applyTag: mockApplyTag,
        applyTopicLink: mockApplyTopicLink,
        dismissTag: mockDismissTag,
        dismissTopicLink: mockDismissTopicLink,
        isTagApplied: mockIsTagApplied,
        isTagDismissed: mockIsTagDismissed,
        isTopicLinkApplied: mockIsTopicLinkApplied,
        isTopicLinkDismissed: mockIsTopicLinkDismissed,
        isApplying: true,
        error: null,
      });

      render(<SuggestionPanel type="tags" topicId="topic-1" tagSuggestions={mockTagSuggestions} />);

      expect(screen.getByText(/applying suggestion/i)).toBeInTheDocument();
    });

    it('should show error message if tag application fails', () => {
      vi.mocked(useSuggestionActionsModule.useSuggestionActions).mockReturnValue({
        applyTag: mockApplyTag,
        applyTopicLink: mockApplyTopicLink,
        dismissTag: mockDismissTag,
        dismissTopicLink: mockDismissTopicLink,
        isTagApplied: mockIsTagApplied,
        isTagDismissed: mockIsTagDismissed,
        isTopicLinkApplied: mockIsTopicLinkApplied,
        isTopicLinkDismissed: mockIsTopicLinkDismissed,
        isApplying: false,
        error: 'Failed to apply tag',
      });

      render(<SuggestionPanel type="tags" topicId="topic-1" tagSuggestions={mockTagSuggestions} />);

      expect(screen.getByText('Failed to apply tag')).toBeInTheDocument();
    });

    it('should remove applied tag from suggestion list', () => {
      mockIsTagApplied.mockImplementation((tag: string) => tag === 'politics');

      render(<SuggestionPanel type="tags" topicId="topic-1" tagSuggestions={mockTagSuggestions} />);

      expect(screen.queryByText('#politics')).not.toBeInTheDocument();
      expect(screen.getByText('#economics')).toBeInTheDocument();
      expect(screen.getByText('#healthcare')).toBeInTheDocument();
    });

    it('should call onApplied callback with tag when successful', async () => {
      mockApplyTag.mockResolvedValue({ success: true });
      const onApplied = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionPanel
          type="tags"
          topicId="topic-1"
          tagSuggestions={mockTagSuggestions}
          onApplied={onApplied}
        />,
      );

      await user.click(screen.getByRole('button', { name: /accept tag economics/i }));

      await waitFor(() => {
        expect(onApplied).toHaveBeenCalledWith('economics');
      });
    });

    it('should not call onApplied when application fails', async () => {
      mockApplyTag.mockResolvedValue({ success: false, error: 'API error' });
      const onApplied = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionPanel
          type="tags"
          topicId="topic-1"
          tagSuggestions={mockTagSuggestions}
          onApplied={onApplied}
        />,
      );

      await user.click(screen.getByRole('button', { name: /accept tag politics/i }));

      await waitFor(() => {
        expect(mockApplyTag).toHaveBeenCalled();
      });

      expect(onApplied).not.toHaveBeenCalled();
    });
  });

  describe('Apply Topic Link Suggestions', () => {
    it('should apply a topic link suggestion when accept button is clicked', async () => {
      mockApplyTopicLink.mockResolvedValue({ success: true });
      const user = userEvent.setup();

      render(
        <SuggestionPanel
          type="topic-links"
          topicId="topic-1"
          topicLinkSuggestions={mockTopicLinkSuggestions}
        />,
      );

      const acceptButtons = screen.getAllByRole('button', {
        name: /accept topic link suggestion/i,
      });
      await user.click(acceptButtons[0]);

      expect(mockApplyTopicLink).toHaveBeenCalledWith({
        topicId: 'topic-1',
        link: mockTopicLinkSuggestions.linkSuggestions[0],
      });
    });

    it('should show loading indicator while applying topic link', () => {
      vi.mocked(useSuggestionActionsModule.useSuggestionActions).mockReturnValue({
        applyTag: mockApplyTag,
        applyTopicLink: mockApplyTopicLink,
        dismissTag: mockDismissTag,
        dismissTopicLink: mockDismissTopicLink,
        isTagApplied: mockIsTagApplied,
        isTagDismissed: mockIsTagDismissed,
        isTopicLinkApplied: mockIsTopicLinkApplied,
        isTopicLinkDismissed: mockIsTopicLinkDismissed,
        isApplying: true,
        error: null,
      });

      render(
        <SuggestionPanel
          type="topic-links"
          topicId="topic-1"
          topicLinkSuggestions={mockTopicLinkSuggestions}
        />,
      );

      expect(screen.getByText(/applying suggestion/i)).toBeInTheDocument();
    });

    it('should show error message if topic link application fails', () => {
      vi.mocked(useSuggestionActionsModule.useSuggestionActions).mockReturnValue({
        applyTag: mockApplyTag,
        applyTopicLink: mockApplyTopicLink,
        dismissTag: mockDismissTag,
        dismissTopicLink: mockDismissTopicLink,
        isTagApplied: mockIsTagApplied,
        isTagDismissed: mockIsTagDismissed,
        isTopicLinkApplied: mockIsTopicLinkApplied,
        isTopicLinkDismissed: mockIsTopicLinkDismissed,
        isApplying: false,
        error: 'Failed to create topic link',
      });

      render(
        <SuggestionPanel
          type="topic-links"
          topicId="topic-1"
          topicLinkSuggestions={mockTopicLinkSuggestions}
        />,
      );

      expect(screen.getByText('Failed to create topic link')).toBeInTheDocument();
    });

    it('should remove applied topic link from suggestion list', () => {
      mockIsTopicLinkApplied.mockImplementation(
        (link) => link.targetTopicId === 'topic-abc123def456',
      );

      render(
        <SuggestionPanel
          type="topic-links"
          topicId="topic-1"
          topicLinkSuggestions={mockTopicLinkSuggestions}
        />,
      );

      expect(
        screen.queryByText('Both topics argue for renewable energy investment'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText('This topic opposes the economic feasibility claim'),
      ).toBeInTheDocument();
    });

    it('should call onApplied callback with TopicLink when successful', async () => {
      mockApplyTopicLink.mockResolvedValue({ success: true });
      const onApplied = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionPanel
          type="topic-links"
          topicId="topic-1"
          topicLinkSuggestions={mockTopicLinkSuggestions}
          onApplied={onApplied}
        />,
      );

      const acceptButtons = screen.getAllByRole('button', {
        name: /accept topic link suggestion/i,
      });
      await user.click(acceptButtons[1]);

      await waitFor(() => {
        expect(onApplied).toHaveBeenCalledWith(mockTopicLinkSuggestions.linkSuggestions[1]);
      });
    });

    it('should not call onApplied when application fails', async () => {
      mockApplyTopicLink.mockResolvedValue({ success: false, error: 'API error' });
      const onApplied = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionPanel
          type="topic-links"
          topicId="topic-1"
          topicLinkSuggestions={mockTopicLinkSuggestions}
          onApplied={onApplied}
        />,
      );

      const acceptButtons = screen.getAllByRole('button', {
        name: /accept topic link suggestion/i,
      });
      await user.click(acceptButtons[0]);

      await waitFor(() => {
        expect(mockApplyTopicLink).toHaveBeenCalled();
      });

      expect(onApplied).not.toHaveBeenCalled();
    });
  });

  describe('Dismiss Suggestions', () => {
    it('should dismiss a tag suggestion when dismiss button is clicked', async () => {
      const user = userEvent.setup();

      render(<SuggestionPanel type="tags" topicId="topic-1" tagSuggestions={mockTagSuggestions} />);

      await user.click(screen.getByRole('button', { name: /dismiss tag politics/i }));

      expect(mockDismissTag).toHaveBeenCalledWith('politics');
    });

    it('should dismiss a topic link suggestion when dismiss button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <SuggestionPanel
          type="topic-links"
          topicId="topic-1"
          topicLinkSuggestions={mockTopicLinkSuggestions}
        />,
      );

      const dismissButtons = screen.getAllByRole('button', {
        name: /dismiss topic link suggestion/i,
      });
      await user.click(dismissButtons[0]);

      expect(mockDismissTopicLink).toHaveBeenCalledWith(
        mockTopicLinkSuggestions.linkSuggestions[0],
      );
    });

    it('should call onDismissed callback when tag is dismissed', async () => {
      const onDismissed = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionPanel
          type="tags"
          topicId="topic-1"
          tagSuggestions={mockTagSuggestions}
          onDismissed={onDismissed}
        />,
      );

      await user.click(screen.getByRole('button', { name: /dismiss tag economics/i }));

      expect(onDismissed).toHaveBeenCalledWith('economics');
    });

    it('should call onDismissed callback when topic link is dismissed', async () => {
      const onDismissed = vi.fn();
      const user = userEvent.setup();

      render(
        <SuggestionPanel
          type="topic-links"
          topicId="topic-1"
          topicLinkSuggestions={mockTopicLinkSuggestions}
          onDismissed={onDismissed}
        />,
      );

      const dismissButtons = screen.getAllByRole('button', {
        name: /dismiss topic link suggestion/i,
      });
      await user.click(dismissButtons[1]);

      expect(onDismissed).toHaveBeenCalledWith(mockTopicLinkSuggestions.linkSuggestions[1]);
    });

    it('should filter out dismissed tag suggestions', () => {
      mockIsTagDismissed.mockImplementation((tag: string) => tag === 'healthcare');

      render(<SuggestionPanel type="tags" topicId="topic-1" tagSuggestions={mockTagSuggestions} />);

      expect(screen.getByText('#politics')).toBeInTheDocument();
      expect(screen.getByText('#economics')).toBeInTheDocument();
      expect(screen.queryByText('#healthcare')).not.toBeInTheDocument();
    });

    it('should filter out dismissed topic link suggestions', () => {
      mockIsTopicLinkDismissed.mockImplementation(
        (link) => link.targetTopicId === 'topic-xyz789ghi012',
      );

      render(
        <SuggestionPanel
          type="topic-links"
          topicId="topic-1"
          topicLinkSuggestions={mockTopicLinkSuggestions}
        />,
      );

      expect(
        screen.getByText('Both topics argue for renewable energy investment'),
      ).toBeInTheDocument();
      expect(
        screen.queryByText('This topic opposes the economic feasibility claim'),
      ).not.toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should filter out both applied and dismissed suggestions', () => {
      mockIsTagApplied.mockImplementation((tag: string) => tag === 'politics');
      mockIsTagDismissed.mockImplementation((tag: string) => tag === 'economics');

      render(<SuggestionPanel type="tags" topicId="topic-1" tagSuggestions={mockTagSuggestions} />);

      expect(screen.queryByText('#politics')).not.toBeInTheDocument();
      expect(screen.queryByText('#economics')).not.toBeInTheDocument();
      expect(screen.getByText('#healthcare')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when all suggestions are filtered out', () => {
      mockIsTagApplied.mockReturnValue(true);

      render(
        <SuggestionPanel
          type="tags"
          topicId="topic-1"
          tagSuggestions={mockTagSuggestions}
          showEmptyState
        />,
      );

      expect(screen.getByText(/no suggestions available/i)).toBeInTheDocument();
    });
  });
});
