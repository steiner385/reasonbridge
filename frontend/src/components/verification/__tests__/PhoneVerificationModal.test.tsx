/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneVerificationModal from '../PhoneVerificationModal';
import * as api from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  requestPhoneVerification: vi.fn(),
  verifyPhoneOTP: vi.fn(),
}));

describe('PhoneVerificationModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders phone input step initially', () => {
    render(<PhoneVerificationModal isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText('Verify Phone Number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<PhoneVerificationModal isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText('Verify Phone Number')).not.toBeInTheDocument();
  });

  it('validates phone number before sending OTP', async () => {
    const user = userEvent.setup();
    render(<PhoneVerificationModal isOpen={true} onClose={mockOnClose} />);

    const sendButton = screen.getByRole('button', { name: /send code/i });
    await user.click(sendButton);

    expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument();
    expect(api.requestPhoneVerification).not.toHaveBeenCalled();
  });

  it('sends OTP and transitions to OTP entry step', async () => {
    const user = userEvent.setup();
    vi.mocked(api.requestPhoneVerification).mockResolvedValue({
      verificationId: 'test-verification-id',
      expiresAt: '2026-01-23T18:00:00.000Z',
      message: 'Code sent',
    });

    render(<PhoneVerificationModal isOpen={true} onClose={mockOnClose} />);

    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    await user.type(phoneInput, '+12125551234');

    const sendButton = screen.getByRole('button', { name: /send code/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(api.requestPhoneVerification).toHaveBeenCalledWith('+12125551234');
    });

    await waitFor(() => {
      expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
    });

    expect(screen.getByText(/enter the 6-digit code sent to/i)).toBeInTheDocument();
    expect(screen.getByText('+12125551234')).toBeInTheDocument();
  }, 10000);

  it('handles OTP request error', async () => {
    const user = userEvent.setup();
    vi.mocked(api.requestPhoneVerification).mockRejectedValue(
      new Error('Failed to send verification code'),
    );

    render(<PhoneVerificationModal isOpen={true} onClose={mockOnClose} />);

    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    await user.type(phoneInput, '+12125551234');

    const sendButton = screen.getByRole('button', { name: /send code/i });
    await user.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to send verification code/i)).toBeInTheDocument();
    });
  });

  it('validates OTP code before verifying', async () => {
    const user = userEvent.setup();
    vi.mocked(api.requestPhoneVerification).mockResolvedValue({
      verificationId: 'test-verification-id',
      expiresAt: '2026-01-23T18:00:00.000Z',
      message: 'Code sent',
    });

    render(<PhoneVerificationModal isOpen={true} onClose={mockOnClose} />);

    // Enter phone and send code
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    await user.type(phoneInput, '+12125551234');
    await user.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
    });

    // Try to verify without entering full code
    const verifyButton = screen.getByRole('button', { name: /verify code/i });
    await user.click(verifyButton);

    expect(screen.getByText(/please enter the complete 6-digit code/i)).toBeInTheDocument();
    expect(api.verifyPhoneOTP).not.toHaveBeenCalled();
  });

  it('verifies OTP and shows success', async () => {
    const user = userEvent.setup();
    vi.mocked(api.requestPhoneVerification).mockResolvedValue({
      verificationId: 'test-verification-id',
      expiresAt: '2026-01-23T18:00:00.000Z',
      message: 'Code sent',
    });
    vi.mocked(api.verifyPhoneOTP).mockResolvedValue({
      success: true,
      message: 'Phone verified',
      verificationId: 'test-verification-id',
    });

    render(
      <PhoneVerificationModal isOpen={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />,
    );

    // Enter phone and send code
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    await user.type(phoneInput, '+12125551234');
    await user.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
    });

    // Enter OTP code
    const otpInputs = screen.getAllByLabelText(/digit \d/i);
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], String(i));
    }

    // Verify code
    const verifyButton = screen.getByRole('button', { name: /verify code/i });
    await user.click(verifyButton);

    await waitFor(() => {
      expect(api.verifyPhoneOTP).toHaveBeenCalledWith('test-verification-id', '012345');
    });

    await waitFor(() => {
      expect(screen.getByText('Verification Complete')).toBeInTheDocument();
    });

    expect(screen.getByText('Phone Number Verified!')).toBeInTheDocument();

    // Wait for auto-close and success callback
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalled();
        expect(mockOnClose).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('handles OTP verification error', async () => {
    const user = userEvent.setup();
    vi.mocked(api.requestPhoneVerification).mockResolvedValue({
      verificationId: 'test-verification-id',
      expiresAt: '2026-01-23T18:00:00.000Z',
      message: 'Code sent',
    });
    vi.mocked(api.verifyPhoneOTP).mockRejectedValue(new Error('Invalid verification code'));

    render(<PhoneVerificationModal isOpen={true} onClose={mockOnClose} />);

    // Enter phone and send code
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    await user.type(phoneInput, '+12125551234');
    await user.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
    });

    // Enter OTP code
    const otpInputs = screen.getAllByLabelText(/digit \d/i);
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], String(i));
    }

    // Verify code
    const verifyButton = screen.getByRole('button', { name: /verify code/i });
    await user.click(verifyButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid verification code/i)).toBeInTheDocument();
    });
  });

  it('allows going back to phone entry from OTP step', async () => {
    const user = userEvent.setup();
    vi.mocked(api.requestPhoneVerification).mockResolvedValue({
      verificationId: 'test-verification-id',
      expiresAt: '2026-01-23T18:00:00.000Z',
      message: 'Code sent',
    });

    render(<PhoneVerificationModal isOpen={true} onClose={mockOnClose} />);

    // Enter phone and send code
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    await user.type(phoneInput, '+12125551234');
    await user.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByText('Enter Verification Code')).toBeInTheDocument();
    });

    // Click back button
    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);

    expect(screen.getByText('Verify Phone Number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument();
  });

  it('resets state when modal is reopened', async () => {
    const { rerender } = render(<PhoneVerificationModal isOpen={false} onClose={mockOnClose} />);

    // Open modal
    rerender(<PhoneVerificationModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Verify Phone Number')).toBeInTheDocument();

    // Close modal
    rerender(<PhoneVerificationModal isOpen={false} onClose={mockOnClose} />);

    // Reopen modal - should reset to phone step
    rerender(<PhoneVerificationModal isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Verify Phone Number')).toBeInTheDocument();
    // Phone input may have default country code "+1" or be empty
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    const value = phoneInput.getAttribute('value') || '';
    expect(value.length).toBeLessThanOrEqual(3); // Should be empty or just country code
  });
});
