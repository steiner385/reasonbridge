/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for CredentialReviewQueue component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CredentialReviewQueue } from '../CredentialReviewQueue';
import type { Credential } from '../../../types/ranking';

/**
 * Mock credentials for testing
 */
const mockCredentials: Credential[] = [
  {
    id: 'cred-1',
    userId: 'user-1',
    tagId: 'tag-1',
    tagName: 'Climate Science',
    type: 'ACADEMIC_DOCTORATE',
    title: 'PhD in Atmospheric Science',
    institution: 'MIT',
    documentUrl: 'https://example.com/diploma1.pdf',
    verificationUrl: 'https://verify.mit.edu/12345',
    status: 'PENDING',
    boostValue: 0.15,
    createdAt: '2026-01-15T10:30:00Z',
  },
  {
    id: 'cred-2',
    userId: 'user-2',
    tagId: 'tag-2',
    tagName: 'Economics',
    type: 'PROFESSIONAL_LICENSE',
    title: 'CFA Certification',
    institution: 'CFA Institute',
    status: 'PENDING',
    boostValue: 0.1,
    expiresAt: '2027-12-31T00:00:00Z',
    createdAt: '2026-01-20T14:00:00Z',
  },
  {
    id: 'cred-3',
    userId: 'user-3',
    tagId: 'tag-3',
    tagName: 'Psychology',
    type: 'PUBLICATION',
    title: 'Published Research Paper',
    institution: 'Journal of Cognitive Science',
    verificationUrl: 'https://doi.org/10.1234/example',
    status: 'PENDING',
    boostValue: 0.08,
    createdAt: '2026-01-22T09:15:00Z',
  },
];

describe('CredentialReviewQueue', () => {
  const mockOnApprove = vi.fn<[string, string | undefined], Promise<void>>();
  const mockOnReject = vi.fn<[string, string], Promise<void>>();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnApprove.mockResolvedValue(undefined);
    mockOnReject.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render list of pending credentials', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      // Check all credentials are displayed
      expect(screen.getByText('PhD in Atmospheric Science')).toBeInTheDocument();
      expect(screen.getByText('CFA Certification')).toBeInTheDocument();
      expect(screen.getByText('Published Research Paper')).toBeInTheDocument();
    });

    it('should show empty state when no credentials', () => {
      render(
        <CredentialReviewQueue
          credentials={[]}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      expect(screen.getByText(/no pending credentials/i)).toBeInTheDocument();
    });

    it('should show loading state while fetching', () => {
      render(
        <CredentialReviewQueue
          credentials={[]}
          isLoading={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
          className="custom-class"
        />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Credential Card Display', () => {
    it('should display credential type badge', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      // Check credential type badges
      expect(screen.getByText(/doctorate/i)).toBeInTheDocument();
      expect(screen.getByText(/professional license/i)).toBeInTheDocument();
      expect(screen.getByText(/publication/i)).toBeInTheDocument();
    });

    it('should display institution name', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      expect(screen.getByText('MIT')).toBeInTheDocument();
      expect(screen.getByText('CFA Institute')).toBeInTheDocument();
      expect(screen.getByText('Journal of Cognitive Science')).toBeInTheDocument();
    });

    it('should display category tag name', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      expect(screen.getByText('Climate Science')).toBeInTheDocument();
      expect(screen.getByText('Economics')).toBeInTheDocument();
      expect(screen.getByText('Psychology')).toBeInTheDocument();
    });

    it('should display document URL link when available', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const documentLink = screen.getByRole('link', { name: /view document/i });
      expect(documentLink).toHaveAttribute('href', 'https://example.com/diploma1.pdf');
    });

    it('should display verification URL link when available', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const verificationLinks = screen.getAllByRole('link', { name: /verify/i });
      expect(verificationLinks.length).toBeGreaterThan(0);
    });

    it('should display created date', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      // Check that dates are displayed (format may vary)
      expect(screen.getByText(/jan.*15/i)).toBeInTheDocument();
    });

    it('should display approve and reject buttons for each credential', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      // Each credential should have approve and reject buttons
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });

      expect(approveButtons).toHaveLength(3);
      expect(rejectButtons).toHaveLength(3);
    });
  });

  describe('Approve Action', () => {
    it('should open confirmation modal when approve button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      // Modal should open
      await waitFor(
        () => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
          expect(screen.getByText(/approve credential/i)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
    });

    it('should call onApprove with credential id when confirmed', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      // Confirm approval
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith('cred-1', undefined);
      });
    });

    it('should call onApprove with optional notes when provided', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      // Add notes
      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'Verified through university records');

      // Confirm approval
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith('cred-1', 'Verified through university records');
      });
    });

    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      // Modal should be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      expect(mockOnApprove).not.toHaveBeenCalled();
    });
  });

  describe('Reject Action', () => {
    it('should open reject modal when reject button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      // Modal should open
      await waitFor(
        () => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
          expect(screen.getByText(/reject credential/i)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
    });

    it('should require reason for rejection', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      // Confirm button should be disabled without reason
      await waitFor(
        () => {
          const confirmButton = screen.getByRole('button', { name: /confirm/i });
          expect(confirmButton).toBeDisabled();
        },
        { timeout: 10000 },
      );
    });

    it('should call onReject with credential id and reason', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      // Enter reason
      const reasonInput = screen.getByLabelText(/reason/i);
      await user.type(reasonInput, 'Document not legible');

      // Confirm rejection
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(
        () => {
          expect(mockOnReject).toHaveBeenCalledWith('cred-1', 'Document not legible');
        },
        { timeout: 10000 },
      );
    });

    it('should enable confirm button when reason is provided', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      // Enter reason
      const reasonInput = screen.getByLabelText(/reason/i);
      await user.type(reasonInput, 'Invalid document');

      // Confirm button should be enabled
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      expect(confirmButton).toBeEnabled();
    });
  });

  describe('Processing State', () => {
    it('should show processing state during approval', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveApprove: () => void;
      const pendingApprove = new Promise<void>((resolve) => {
        resolveApprove = resolve;
      });
      mockOnApprove.mockReturnValue(pendingApprove);

      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Check for processing state
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Resolve and clean up
      resolveApprove!();
    });

    it('should show processing state during rejection', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveReject: () => void;
      const pendingReject = new Promise<void>((resolve) => {
        resolveReject = resolve;
      });
      mockOnReject.mockReturnValue(pendingReject);

      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      // Enter reason
      const reasonInput = screen.getByLabelText(/reason/i);
      await user.type(reasonInput, 'Invalid document');

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Check for processing state
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument();
      });

      // Resolve and clean up
      resolveReject!();
    });

    it('should disable buttons while processing', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveApprove: () => void;
      const pendingApprove = new Promise<void>((resolve) => {
        resolveApprove = resolve;
      });
      mockOnApprove.mockReturnValue(pendingApprove);

      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Buttons should be disabled during processing
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        const buttons = within(dialog).getAllByRole('button');
        buttons.forEach((button) => {
          if (
            button.textContent?.toLowerCase().includes('confirm') ||
            button.textContent?.toLowerCase().includes('cancel')
          ) {
            expect(button).toBeDisabled();
          }
        });
      });

      // Resolve and clean up
      resolveApprove!();
    });
  });

  describe('Success Feedback', () => {
    it('should show success feedback after approval', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/credential approved/i)).toBeInTheDocument();
      });
    });

    it('should show success feedback after rejection', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      const reasonInput = screen.getByLabelText(/reason/i);
      await user.type(reasonInput, 'Invalid document');

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/credential rejected/i)).toBeInTheDocument();
      });
    });

    it('should close modal after successful action', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Feedback', () => {
    it('should show error feedback on approval failure', async () => {
      const user = userEvent.setup({ delay: null });
      mockOnApprove.mockRejectedValue(new Error('Approval failed'));

      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to approve/i)).toBeInTheDocument();
      });
    });

    it('should show error feedback on rejection failure', async () => {
      const user = userEvent.setup({ delay: null });
      mockOnReject.mockRejectedValue(new Error('Rejection failed'));

      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      await user.click(rejectButtons[0]);

      const reasonInput = screen.getByLabelText(/reason/i);
      await user.type(reasonInput, 'Invalid document');

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to reject/i)).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      const user = userEvent.setup({ delay: null });
      mockOnApprove.mockRejectedValueOnce(new Error('First attempt failed'));
      mockOnApprove.mockResolvedValueOnce(undefined);

      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // First attempt fails
      await waitFor(() => {
        expect(screen.getByText(/failed to approve/i)).toBeInTheDocument();
      });

      // Modal should still be open and allow retry
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(confirmButton).toBeEnabled();

      // Retry
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText(/credential approved/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels on buttons', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });

      approveButtons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });

      rejectButtons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should have dialog role on modals', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      await user.click(approveButtons[0]);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have external links open in new tab', () => {
      render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      const externalLinks = screen.getAllByRole('link');
      externalLinks.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
      });
    });
  });

  describe('Dark Mode Support', () => {
    it('should include dark mode classes', () => {
      const { container } = render(
        <CredentialReviewQueue
          credentials={mockCredentials}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />,
      );

      expect(container.innerHTML).toMatch(/dark:/);
    });
  });
});
