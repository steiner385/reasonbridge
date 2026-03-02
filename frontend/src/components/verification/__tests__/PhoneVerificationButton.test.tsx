/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
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

  afterEach(() => {
    vi.useRealTimers();
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
    const user = userEvent.setup({ delay: null });
    render(<PhoneVerificationButton />);

    const button = screen.getByRole('button', { name: /verify phone number/i });
    await user.click(button);

    // Modal should open with heading
    expect(screen.getByRole('heading', { name: /verify phone number/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument();
  });

  it('does not open modal when disabled', async () => {
    const user = userEvent.setup({ delay: null });
    render(<PhoneVerificationButton disabled={true} />);

    const button = screen.getByRole('button', { name: /verify phone number/i });
    expect(button).toBeDisabled();

    await user.click(button);

    // Modal heading should not appear
    expect(screen.queryByRole('heading', { name: /verify phone number/i })).not.toBeInTheDocument();
  });

  it('calls onVerificationSuccess after successful verification', async () => {
    // Use fake timers to control the 2000ms setTimeout in PhoneVerificationModal
    vi.useFakeTimers();

    // Mock jest globally for React Testing Library compatibility with Vitest
    // RTL checks for jest.advanceTimersByTime internally
    const originalJest = globalThis.jest;
    globalThis.jest = {
      ...globalThis.jest,
      advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
    };

    // Configure userEvent to work with fake timers
    const user = userEvent.setup({
      advanceTimers: vi.advanceTimersByTime.bind(vi),
    });
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

    // Wait for OTP step with increased timeout for CI stability
    await waitFor(
      () => {
        expect(
          screen.getByRole('heading', { name: /enter verification code/i }),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Enter OTP
    const otpInputs = screen.getAllByLabelText(/digit \d/i);
    for (let i = 0; i < 6; i++) {
      await user.type(otpInputs[i], String(i));
    }

    // Verify
    await user.click(screen.getByRole('button', { name: /verify code/i }));

    // Wait for success step to appear with increased timeout for CI stability
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /verification complete/i })).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Advance timers past the 2000ms setTimeout in PhoneVerificationModal
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    // Now the callback should have been called
    expect(mockOnSuccess).toHaveBeenCalled();

    // Restore original jest object
    globalThis.jest = originalJest;
  }, 30000);

  it('closes modal when cancel is clicked', async () => {
    const user = userEvent.setup({ delay: null });
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
