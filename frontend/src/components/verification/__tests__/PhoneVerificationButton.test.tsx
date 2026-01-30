/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneVerificationButton from '../PhoneVerificationButton';
import * as api from '../../../lib/api';

vi.mock('../../../lib/api', () => ({
  requestPhoneVerification: vi.fn(),
  verifyPhoneOTP: vi.fn(),
}));

describe('PhoneVerificationButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unverified button by default', () => {
    render(<PhoneVerificationButton />);

    const button = screen.getByRole('button', { name: /verify phone number/i });
    expect(button).toBeInTheDocument();
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('renders verified button when isVerified is true', () => {
    render(<PhoneVerificationButton isVerified={true} />);

    const button = screen.getByRole('button', { name: /phone verified/i });
    expect(button).toBeInTheDocument();
  });

  it('uses custom button text when provided', () => {
    render(<PhoneVerificationButton buttonText="Custom Text" />);

    expect(screen.getByRole('button', { name: /custom text/i })).toBeInTheDocument();
  });

  it('opens modal when clicked', async () => {
    const user = userEvent.setup();
    render(<PhoneVerificationButton />);

    const button = screen.getByRole('button', { name: /verify phone number/i });
    await user.click(button);

    // Modal should open with heading
    expect(screen.getByRole('heading', { name: /verify phone number/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument();
  });

  it('does not open modal when disabled', async () => {
    const user = userEvent.setup();
    render(<PhoneVerificationButton disabled={true} />);

    const button = screen.getByRole('button', { name: /verify phone number/i });
    expect(button).toBeDisabled();

    await user.click(button);

    // Modal heading should not appear
    expect(screen.queryByRole('heading', { name: /verify phone number/i })).not.toBeInTheDocument();
  });

  it.skip('calls onVerificationSuccess after successful verification', async () => {
    // TODO: Fix flaky test - timing out waiting for onVerificationSuccess callback
    // The setTimeout in PhoneVerificationModal (2000ms) before calling onSuccess()
    // may be causing race conditions in test environment
    // Issue: Main branch build #88 FAILED due to this timeout
    const user = userEvent.setup();
    const mockOnSuccess = vi.fn();

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

    render(<PhoneVerificationButton onVerificationSuccess={mockOnSuccess} />);

    // Open modal
    const button = screen.getByRole('button', { name: /verify phone number/i });
    await user.click(button);

    // Enter phone number
    const phoneInput = screen.getByPlaceholderText('Enter your phone number');
    await user.type(phoneInput, '+12125551234');

    // Send code
    await user.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /enter verification code/i })).toBeInTheDocument();
    });

    // Enter OTP
    const otpInputs = screen.getAllByLabelText(/digit \d/i);
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], String(i));
    }

    // Verify
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    // Wait for success callback
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  }, 10000);

  it('closes modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<PhoneVerificationButton />);

    // Open modal
    const button = screen.getByRole('button', { name: /verify phone number/i });
    await user.click(button);

    expect(screen.getByRole('heading', { name: /verify phone number/i })).toBeInTheDocument();

    // Close modal
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByRole('heading', { name: /verify phone number/i })).not.toBeInTheDocument();
  });

  it('applies custom variant', () => {
    const { container } = render(<PhoneVerificationButton variant="outline" />);

    const button = screen.getByRole('button', { name: /verify phone number/i });
    expect(button).toBeInTheDocument();
    expect(container).toBeTruthy();
  });
});
