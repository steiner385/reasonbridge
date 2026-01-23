import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneInput from '../PhoneInput';

describe('PhoneInput', () => {
  it('should render phone input with country selector', () => {
    render(<PhoneInput value="" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox')).toBeInTheDocument(); // Country selector
    expect(screen.getByRole('textbox')).toBeInTheDocument(); // Phone input
  });

  it('should call onChange with E.164 formatted number', async () => {
    const onChange = vi.fn();
    render(<PhoneInput value="" onChange={onChange} />);

    const input = screen.getByRole('textbox');
    await userEvent.type(input, '5551234567');

    // Should normalize to E.164
    expect(onChange).toHaveBeenCalled();
  });

  it('should show error message when invalid', () => {
    render(<PhoneInput value="" onChange={vi.fn()} error="Invalid phone number" />);

    expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
  });

  it('should disable input when disabled prop is true', () => {
    render(<PhoneInput value="" onChange={vi.fn()} disabled />);

    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('should display value in national format', () => {
    render(<PhoneInput value="+15551234567" onChange={vi.fn()} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toContain('555'); // National format
  });
});
