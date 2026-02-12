/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RelatedTopicsLinker from '../RelatedTopicsLinker';
import type { LinkedTopic } from '../../../types/topic-links';
import type { Topic } from '../../../types/topic';

// Mock linked topics data
const mockLinkedTopics: LinkedTopic[] = [
  {
    id: 'topic-1',
    title: 'First Related Topic',
    slug: 'first-related-topic',
    relationshipType: 'BUILDS_ON',
    linkId: 'link-1',
    confirmationStatus: 'CONFIRMED',
  },
  {
    id: 'topic-2',
    title: 'Second Related Topic',
    slug: 'second-related-topic',
    relationshipType: 'CONTRADICTS',
    linkId: 'link-2',
    confirmationStatus: 'PENDING',
  },
  {
    id: 'topic-3',
    title: 'Third Related Topic',
    slug: 'third-related-topic',
    relationshipType: 'RELATED',
    linkId: 'link-3',
    confirmationStatus: 'CONFIRMED',
  },
];

// Mock available topics for search
const mockAvailableTopics: Topic[] = [
  {
    id: 'available-1',
    title: 'Available Topic One',
    description: 'Description one',
    creatorId: 'user-1',
    status: 'ACTIVE',
    evidenceStandards: 'standard',
    minimumDiversityScore: 0.5,
    currentDiversityScore: 0.7,
    participantCount: 10,
    responseCount: 20,
    crossCuttingThemes: [],
    createdAt: '2026-01-01T00:00:00Z',
    activatedAt: '2026-01-02T00:00:00Z',
    archivedAt: null,
  },
  {
    id: 'available-2',
    title: 'Available Topic Two',
    description: 'Description two',
    creatorId: 'user-2',
    status: 'ACTIVE',
    evidenceStandards: 'standard',
    minimumDiversityScore: 0.5,
    currentDiversityScore: 0.6,
    participantCount: 5,
    responseCount: 15,
    crossCuttingThemes: [],
    createdAt: '2026-01-03T00:00:00Z',
    activatedAt: '2026-01-04T00:00:00Z',
    archivedAt: null,
  },
];

describe('RelatedTopicsLinker', () => {
  const defaultProps = {
    topicId: 'current-topic',
    linkedTopics: mockLinkedTopics,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with header', () => {
      render(<RelatedTopicsLinker {...defaultProps} />);

      expect(screen.getByText('Related Topics')).toBeInTheDocument();
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('renders all linked topics', () => {
      render(<RelatedTopicsLinker {...defaultProps} />);

      expect(screen.getByText('First Related Topic')).toBeInTheDocument();
      expect(screen.getByText('Second Related Topic')).toBeInTheDocument();
      expect(screen.getByText('Third Related Topic')).toBeInTheDocument();
    });

    it('renders relationship type badges', () => {
      render(<RelatedTopicsLinker {...defaultProps} />);

      expect(screen.getByText('Builds On')).toBeInTheDocument();
      expect(screen.getByText('Contradicts')).toBeInTheDocument();
      expect(screen.getByText('Related')).toBeInTheDocument();
    });

    it('renders pending status badge for pending links', () => {
      render(<RelatedTopicsLinker {...defaultProps} />);

      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('renders compact badges when compact prop is true', () => {
      render(<RelatedTopicsLinker {...defaultProps} compact />);

      // In compact mode, only icons are shown, not full labels
      expect(screen.queryByText('Builds On')).not.toBeInTheDocument();
      expect(screen.queryByText('Contradicts')).not.toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <RelatedTopicsLinker {...defaultProps} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Loading State', () => {
    it('renders loading skeletons when isLoading is true', () => {
      render(<RelatedTopicsLinker {...defaultProps} isLoading />);

      // Should show header
      expect(screen.getByText('Related Topics')).toBeInTheDocument();

      // Should show skeleton elements (animated divs)
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('does not render topics when loading', () => {
      render(<RelatedTopicsLinker {...defaultProps} isLoading />);

      expect(screen.queryByText('First Related Topic')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error message when error prop is provided', () => {
      render(<RelatedTopicsLinker {...defaultProps} error="Failed to load topics" />);

      expect(screen.getByText('Failed to load related topics')).toBeInTheDocument();
      expect(screen.getByText('Failed to load topics')).toBeInTheDocument();
    });

    it('renders retry button when onRefresh is provided', () => {
      const onRefresh = vi.fn();
      render(<RelatedTopicsLinker {...defaultProps} error="Error" onRefresh={onRefresh} />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls onRefresh when retry button is clicked', async () => {
      const onRefresh = vi.fn();
      render(<RelatedTopicsLinker {...defaultProps} error="Error" onRefresh={onRefresh} />);

      await userEvent.click(screen.getByRole('button', { name: /try again/i }));

      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no linked topics', () => {
      render(<RelatedTopicsLinker {...defaultProps} linkedTopics={[]} />);

      expect(screen.getByText('No related topics')).toBeInTheDocument();
      expect(
        screen.getByText('This topic is not linked to any other topics yet.'),
      ).toBeInTheDocument();
    });

    it('renders add link button in empty state when canManageLinks', () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          linkedTopics={[]}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
        />,
      );

      expect(screen.getByRole('button', { name: /link a topic/i })).toBeInTheDocument();
    });

    it('does not render add link button without canManageLinks', () => {
      render(<RelatedTopicsLinker {...defaultProps} linkedTopics={[]} />);

      expect(screen.queryByRole('button', { name: /link a topic/i })).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('hides pending links when showPending is false', () => {
      render(<RelatedTopicsLinker {...defaultProps} showPending={false} />);

      expect(screen.getByText('First Related Topic')).toBeInTheDocument();
      expect(screen.queryByText('Second Related Topic')).not.toBeInTheDocument();
      expect(screen.getByText('Third Related Topic')).toBeInTheDocument();
    });

    it('shows pending links by default', () => {
      render(<RelatedTopicsLinker {...defaultProps} />);

      expect(screen.getByText('Second Related Topic')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('calls onNavigateToTopic when topic is clicked', async () => {
      const onNavigateToTopic = vi.fn();
      render(<RelatedTopicsLinker {...defaultProps} onNavigateToTopic={onNavigateToTopic} />);

      await userEvent.click(screen.getByText('First Related Topic'));

      expect(onNavigateToTopic).toHaveBeenCalledWith('topic-1', 'first-related-topic');
    });
  });

  describe('Link Management Actions', () => {
    it('shows Add Link button in header when canManageLinks', () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
        />,
      );

      expect(screen.getByRole('button', { name: /add link/i })).toBeInTheDocument();
    });

    it('shows confirm/reject buttons for pending links when canManageLinks', async () => {
      const onConfirmLink = vi.fn();
      const onRejectLink = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onConfirmLink={onConfirmLink}
          onRejectLink={onRejectLink}
        />,
      );

      // Find the pending topic item
      const pendingItem = screen.getByText('Second Related Topic').closest('div');
      expect(pendingItem).toBeInTheDocument();

      // Hover to show action buttons
      fireEvent.mouseEnter(pendingItem!.parentElement!);

      // Check for confirm and reject buttons
      const confirmButton = screen.getByRole('button', { name: /confirm link/i });
      const rejectButton = screen.getByRole('button', { name: /reject link/i });

      expect(confirmButton).toBeInTheDocument();
      expect(rejectButton).toBeInTheDocument();
    });

    it('calls onConfirmLink when confirm button is clicked', async () => {
      const onConfirmLink = vi.fn().mockResolvedValue(undefined);
      render(
        <RelatedTopicsLinker {...defaultProps} canManageLinks onConfirmLink={onConfirmLink} />,
      );

      // Find the pending topic item and hover
      const pendingItem = screen.getByText('Second Related Topic').closest('div');
      fireEvent.mouseEnter(pendingItem!.parentElement!);

      await userEvent.click(screen.getByRole('button', { name: /confirm link/i }));

      expect(onConfirmLink).toHaveBeenCalledWith('link-2');
    });

    it('calls onRejectLink when reject button is clicked', async () => {
      const onRejectLink = vi.fn().mockResolvedValue(undefined);
      render(<RelatedTopicsLinker {...defaultProps} canManageLinks onRejectLink={onRejectLink} />);

      // Find the pending topic item and hover
      const pendingItem = screen.getByText('Second Related Topic').closest('div');
      fireEvent.mouseEnter(pendingItem!.parentElement!);

      await userEvent.click(screen.getByRole('button', { name: /reject link/i }));

      expect(onRejectLink).toHaveBeenCalledWith('link-2');
    });

    it('calls onDeleteLink when delete button is clicked', async () => {
      const onDeleteLink = vi.fn().mockResolvedValue(undefined);
      render(<RelatedTopicsLinker {...defaultProps} canManageLinks onDeleteLink={onDeleteLink} />);

      // Find the first topic item's parent group and hover
      const topicButton = screen.getByText('First Related Topic');
      const topicItemGroup = topicButton.closest('.group');
      expect(topicItemGroup).toBeInTheDocument();
      fireEvent.mouseEnter(topicItemGroup!);

      // Find the delete button within this specific item
      const deleteButton = within(topicItemGroup as HTMLElement).getByRole('button', {
        name: /remove link/i,
      });
      await userEvent.click(deleteButton);

      expect(onDeleteLink).toHaveBeenCalledWith('link-1');
    });
  });

  describe('Add Link Modal', () => {
    it('opens modal when Add Link button is clicked', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Link Related Topic')).toBeInTheDocument();
    });

    it('closes modal when Cancel is clicked', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes modal when X button is clicked', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click the X (close) button in the modal header
      const dialog = screen.getByRole('dialog');
      const closeButton = within(dialog).getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('calls onSearch when typing in search input', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));
      await userEvent.type(screen.getByPlaceholderText(/type to search/i), 'test query');

      expect(onSearch).toHaveBeenCalled();
    });

    it('displays available topics in modal', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
          availableTopics={mockAvailableTopics}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));

      expect(screen.getByText('Available Topic One')).toBeInTheDocument();
      expect(screen.getByText('Available Topic Two')).toBeInTheDocument();
    });

    it('filters out current topic from available topics', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      const topicsWithCurrent: Topic[] = [
        ...mockAvailableTopics,
        {
          id: 'current-topic',
          title: 'Current Topic',
          description: 'Current',
          creatorId: 'user-1',
          status: 'ACTIVE',
          evidenceStandards: 'standard',
          minimumDiversityScore: 0.5,
          currentDiversityScore: 0.7,
          participantCount: 10,
          responseCount: 20,
          crossCuttingThemes: [],
          createdAt: '2026-01-01T00:00:00Z',
          activatedAt: '2026-01-02T00:00:00Z',
          archivedAt: null,
        },
      ];
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
          availableTopics={topicsWithCurrent}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));

      expect(screen.queryByText('Current Topic')).not.toBeInTheDocument();
    });

    it('allows selecting a topic from the list', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
          availableTopics={mockAvailableTopics}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));
      await userEvent.click(screen.getByText('Available Topic One'));

      // Check that it's selected (has different styling)
      const selectedButton = screen.getByText('Available Topic One');
      expect(selectedButton).toHaveClass('bg-primary-50');
    });

    it('allows selecting relationship type', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
          availableTopics={mockAvailableTopics}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));

      const select = screen.getByRole('combobox');
      await userEvent.selectOptions(select, 'CONTRADICTS');

      expect(select).toHaveValue('CONTRADICTS');
    });

    it('disables Create Link button when no topic is selected', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
          availableTopics={mockAvailableTopics}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));

      const createButton = screen.getByRole('button', { name: /create link/i });
      expect(createButton).toBeDisabled();
    });

    it('enables Create Link button when topic is selected', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
          availableTopics={mockAvailableTopics}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));
      await userEvent.click(screen.getByText('Available Topic One'));

      const createButton = screen.getByRole('button', { name: /create link/i });
      expect(createButton).not.toBeDisabled();
    });

    it('calls onCreateLink with correct data when form is submitted', async () => {
      const onCreateLink = vi.fn().mockResolvedValue(undefined);
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
          availableTopics={mockAvailableTopics}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));
      await userEvent.click(screen.getByText('Available Topic One'));
      await userEvent.selectOptions(screen.getByRole('combobox'), 'BUILDS_ON');
      await userEvent.click(screen.getByRole('button', { name: /create link/i }));

      await waitFor(() => {
        expect(onCreateLink).toHaveBeenCalledWith({
          targetTopicId: 'available-1',
          relationshipType: 'BUILDS_ON',
          linkSource: 'USER_PROPOSED',
        });
      });
    });

    it('closes modal after successful link creation', async () => {
      const onCreateLink = vi.fn().mockResolvedValue(undefined);
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
          availableTopics={mockAvailableTopics}
        />,
      );

      // Open modal
      await userEvent.click(screen.getByRole('button', { name: /add link/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Select topic - find the button in the topic list
      const dialog = screen.getByRole('dialog');
      const topicButton = within(dialog).getByText('Available Topic One');
      await userEvent.click(topicButton);

      // Verify button is now enabled
      const createButton = within(dialog).getByRole('button', { name: /create link/i });
      expect(createButton).not.toBeDisabled();

      // Submit form
      await userEvent.click(createButton);

      // Wait for onCreateLink to be called and modal to close
      await waitFor(() => {
        expect(onCreateLink).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('shows loading state while searching', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
          isSearching
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));

      // Check for spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible names for action buttons', async () => {
      const onConfirmLink = vi.fn();
      const onRejectLink = vi.fn();
      const onDeleteLink = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onConfirmLink={onConfirmLink}
          onRejectLink={onRejectLink}
          onDeleteLink={onDeleteLink}
        />,
      );

      // Find the pending topic item's group and hover
      const pendingTopicButton = screen.getByText('Second Related Topic');
      const topicItemGroup = pendingTopicButton.closest('.group');
      expect(topicItemGroup).toBeInTheDocument();
      fireEvent.mouseEnter(topicItemGroup!);

      // Check within the specific item for accessible buttons
      const itemWithin = within(topicItemGroup as HTMLElement);
      expect(itemWithin.getByRole('button', { name: /confirm link/i })).toBeInTheDocument();
      expect(itemWithin.getByRole('button', { name: /reject link/i })).toBeInTheDocument();
      expect(itemWithin.getByRole('button', { name: /remove link/i })).toBeInTheDocument();
    });

    it('modal has proper ARIA attributes', async () => {
      const onCreateLink = vi.fn();
      const onSearch = vi.fn();
      render(
        <RelatedTopicsLinker
          {...defaultProps}
          canManageLinks
          onCreateLink={onCreateLink}
          onSearch={onSearch}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /add link/i }));

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    });

    it('topic titles have title attribute for full text', () => {
      render(<RelatedTopicsLinker {...defaultProps} />);

      const topicButton = screen.getByText('First Related Topic');
      expect(topicButton).toHaveAttribute('title', 'First Related Topic');
    });
  });
});
