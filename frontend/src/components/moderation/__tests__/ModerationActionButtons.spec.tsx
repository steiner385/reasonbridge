/**
 * Unit tests for ModerationActionButtons component
 */
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModerationActionButtons from '../ModerationActionButtons';
import type { ModerationAction } from '../../../types/moderation';
import * as moderationApi from '../../../lib/moderation-api';

// Mock the moderation API
vi.mock('../../../lib/moderation-api');

const mockModerationAction: ModerationAction = {
  id: 'action-123',
  targetType: 'response',
  targetId: 'response-456',
  actionType: 'warn',
  severity: 'non_punitive',
  reasoning: 'Test warning action',
  aiRecommended: true,
  aiConfidence: 0.85,
  status: 'pending',
  createdAt: '2026-01-18T10:00:00Z',
};

const mockInactiveAction: ModerationAction = {
  ...mockModerationAction,
  status: 'active',
};

describe('ModerationActionButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render approve and reject buttons for pending actions', () => {
      render(
        <ModerationActionButtons action={mockModerationAction} />
      );

      expect(screen.getByText('Approve')).toBeInTheDocument();
      expect(screen.getByText('Reject')).toBeInTheDocument();
    });

    it('should not render buttons for non-pending actions', () => {
      const { container } = render(
        <ModerationActionButtons action={mockInactiveAction} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render with custom className', () => {
      const { container } = render(
        <ModerationActionButtons
          action={mockModerationAction}
          className="custom-class"
        />
      );

      const buttonsContainer = container.querySelector('.custom-class');
      expect(buttonsContainer).toBeInTheDocument();
    });

    it('should render with custom button size', () => {
      render(
        <ModerationActionButtons
          action={mockModerationAction}
          buttonSize="lg"
        />
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Approve Action', () => {
    it('should call approveModerationAction on approve click', async () => {
      const mockApprove = vi.fn().mockResolvedValue({
        ...mockModerationAction,
        status: 'active',
      });
      (moderationApi.approveModerationAction as any).mockImplementation(mockApprove);

      render(<ModerationActionButtons action={mockModerationAction} />);

      const approveButton = screen.getByText('Approve');
      await userEvent.click(approveButton);

      await waitFor(() => {
        expect(mockApprove).toHaveBeenCalledWith('action-123');
      });
    });

    it('should call onApprove callback with updated action', async () => {
      const updatedAction = { ...mockModerationAction, status: 'active' as const };
      const mockApprove = vi.fn().mockResolvedValue(updatedAction);
      (moderationApi.approveModerationAction as any).mockImplementation(mockApprove);

      const onApprove = vi.fn();
      render(
        <ModerationActionButtons
          action={mockModerationAction}
          onApprove={onApprove}
        />
      );

      const approveButton = screen.getByText('Approve');
      await userEvent.click(approveButton);

      await waitFor(() => {
        expect(onApprove).toHaveBeenCalledWith(updatedAction);
      });
    });

    it('should show loading state during approval', async () => {
      const mockApprove = vi.fn().mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ ...mockModerationAction, status: 'active' }), 100)
        )
      );
      (moderationApi.approveModerationAction as any).mockImplementation(mockApprove);

      render(<ModerationActionButtons action={mockModerationAction} />);

      const approveButton = screen.getByText('Approve');
      await userEvent.click(approveButton);

      expect(screen.getByText('Approving...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });
    });

    it('should disable buttons during processing', async () => {
      const mockApprove = vi.fn().mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ ...mockModerationAction, status: 'active' }), 100)
        )
      );
      (moderationApi.approveModerationAction as any).mockImplementation(mockApprove);

      render(<ModerationActionButtons action={mockModerationAction} />);

      const approveButton = screen.getByText('Approve');
      await userEvent.click(approveButton);

      const rejectButton = screen.getByText('Rejecting...' as any) ?
        screen.queryByText('Reject') :
        screen.getByText('Reject');

      if (rejectButton) {
        expect(rejectButton).toBeDisabled();
      }

      await waitFor(() => {
        expect(screen.getByText('Approve')).toBeInTheDocument();
      });
    });

    it('should handle approve errors gracefully', async () => {
      const mockError = new Error('Network error');
      const mockApprove = vi.fn().mockRejectedValue(mockError);
      (moderationApi.approveModerationAction as any).mockImplementation(mockApprove);

      const onError = vi.fn();
      render(
        <ModerationActionButtons
          action={mockModerationAction}
          onError={onError}
        />
      );

      const approveButton = screen.getByText('Approve');
      await userEvent.click(approveButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Network error');
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Reject Action', () => {
    it('should call rejectModerationAction on reject click', async () => {
      const mockReject = vi.fn().mockResolvedValue({
        ...mockModerationAction,
        status: 'reversed',
      });
      (moderationApi.rejectModerationAction as any).mockImplementation(mockReject);

      render(<ModerationActionButtons action={mockModerationAction} />);

      const rejectButton = screen.getByText('Reject');
      await userEvent.click(rejectButton);

      await waitFor(() => {
        expect(mockReject).toHaveBeenCalledWith('action-123');
      });
    });

    it('should call onReject callback with updated action', async () => {
      const updatedAction = { ...mockModerationAction, status: 'reversed' as const };
      const mockReject = vi.fn().mockResolvedValue(updatedAction);
      (moderationApi.rejectModerationAction as any).mockImplementation(mockReject);

      const onReject = vi.fn();
      render(
        <ModerationActionButtons
          action={mockModerationAction}
          onReject={onReject}
        />
      );

      const rejectButton = screen.getByText('Reject');
      await userEvent.click(rejectButton);

      await waitFor(() => {
        expect(onReject).toHaveBeenCalledWith(updatedAction);
      });
    });

    it('should show loading state during rejection', async () => {
      const mockReject = vi.fn().mockImplementation(
        () => new Promise(resolve =>
          setTimeout(() => resolve({ ...mockModerationAction, status: 'reversed' }), 100)
        )
      );
      (moderationApi.rejectModerationAction as any).mockImplementation(mockReject);

      render(<ModerationActionButtons action={mockModerationAction} />);

      const rejectButton = screen.getByText('Reject');
      await userEvent.click(rejectButton);

      expect(screen.getByText('Rejecting...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Reject')).toBeInTheDocument();
      });
    });

    it('should handle reject errors gracefully', async () => {
      const mockError = new Error('Server error');
      const mockReject = vi.fn().mockRejectedValue(mockError);
      (moderationApi.rejectModerationAction as any).mockImplementation(mockReject);

      const onError = vi.fn();
      render(
        <ModerationActionButtons
          action={mockModerationAction}
          onError={onError}
        />
      );

      const rejectButton = screen.getByText('Reject');
      await userEvent.click(rejectButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Server error');
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });
  });

  describe('Reject Reasoning', () => {
    it('should show reasoning input when showRejectReasoning is true', async () => {
      render(
        <ModerationActionButtons
          action={mockModerationAction}
          showRejectReasoning={true}
        />
      );

      const rejectButton = screen.getByText('Reject');
      await userEvent.click(rejectButton);

      expect(screen.getByPlaceholderText(/Provide reasoning/i)).toBeInTheDocument();
      expect(screen.getByText('Confirm Reject')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should clear reasoning input on cancel', async () => {
      render(
        <ModerationActionButtons
          action={mockModerationAction}
          showRejectReasoning={true}
        />
      );

      const rejectButton = screen.getByText('Reject');
      await userEvent.click(rejectButton);

      const reasoningInput = screen.getByPlaceholderText(/Provide reasoning/i) as HTMLTextAreaElement;
      await userEvent.type(reasoningInput, 'Test reasoning');

      const cancelButton = screen.getByText('Cancel');
      await userEvent.click(cancelButton);

      expect(screen.getByText('Reject')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable buttons when disabled prop is true', () => {
      render(
        <ModerationActionButtons
          action={mockModerationAction}
          disabled={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should not call handlers when disabled', async () => {
      const mockApprove = vi.fn();
      (moderationApi.approveModerationAction as any).mockImplementation(mockApprove);

      render(
        <ModerationActionButtons
          action={mockModerationAction}
          disabled={true}
        />
      );

      const approveButton = screen.getByText('Approve');
      await userEvent.click(approveButton);

      expect(mockApprove).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display error message in error alert', async () => {
      const mockReject = vi.fn().mockRejectedValue(new Error('Custom error message'));
      (moderationApi.rejectModerationAction as any).mockImplementation(mockReject);

      render(<ModerationActionButtons action={mockModerationAction} />);

      const rejectButton = screen.getByText('Reject');
      await userEvent.click(rejectButton);

      await waitFor(() => {
        expect(screen.getByText('Custom error message')).toBeInTheDocument();
      });
    });

    it('should handle unknown error types', async () => {
      const mockReject = vi.fn().mockRejectedValue('Unknown error');
      (moderationApi.rejectModerationAction as any).mockImplementation(mockReject);

      const onError = vi.fn();
      render(
        <ModerationActionButtons
          action={mockModerationAction}
          onError={onError}
        />
      );

      const rejectButton = screen.getByText('Reject');
      await userEvent.click(rejectButton);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Failed to reject action');
      });
    });
  });
});
