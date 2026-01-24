import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OTPInput from '../OTPInput';

describe('OTPInput', () => {
  it('should render 6 input boxes', () => {
    render(<OTPInput value="" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('should call onChange with 6-digit code', async () => {
    const onChange = vi.fn();
    render(<OTPInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');

    await userEvent.type(inputs[0], '1');
    await userEvent.type(inputs[1], '2');
    await userEvent.type(inputs[2], '3');
    await userEvent.type(inputs[3], '4');
    await userEvent.type(inputs[4], '5');
    await userEvent.type(inputs[5], '6');

    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('should auto-focus next box on digit entry', async () => {
    render(<OTPInput value="" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    await userEvent.type(inputs[0], '1');

    // Second input should be focused
    expect(inputs[1]).toHaveFocus();
  });

  it('should allow paste of 6-digit code', async () => {
    const onChange = vi.fn();
    render(<OTPInput value="" onChange={onChange} />);

    const inputs = screen.getAllByRole('textbox');

    // Paste into first input
    await userEvent.click(inputs[0]);
    await userEvent.paste('123456');

    expect(onChange).toHaveBeenCalledWith('123456');
  });

  it('should show error message', () => {
    render(<OTPInput value="" onChange={vi.fn()} error="Invalid code" />);

    expect(screen.getByText('Invalid code')).toBeInTheDocument();
  });

  it('should allow backspace to previous box', async () => {
    render(<OTPInput value="12" onChange={vi.fn()} />);

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];

    // Focus third box and press backspace
    await userEvent.click(inputs[2]);
    await userEvent.keyboard('{Backspace}');

    // Should focus second box
    expect(inputs[1]).toHaveFocus();
  });
});
