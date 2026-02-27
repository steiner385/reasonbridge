/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PropositionInput, type InitialProposition } from './PropositionInput';

describe('PropositionInput', () => {
  const defaultProps = {
    propositions: [] as InitialProposition[],
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the component with header and input', () => {
      render(<PropositionInput {...defaultProps} />);

      expect(screen.getByText(/Initial Propositions/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Proposition statement/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add/i })).toBeInTheDocument();
    });

    it('shows empty state when no propositions', () => {
      render(<PropositionInput {...defaultProps} />);

      expect(screen.getByText(/No propositions added yet/i)).toBeInTheDocument();
    });

    it('shows info box explaining propositions', () => {
      render(<PropositionInput {...defaultProps} />);

      expect(screen.getByText(/What are propositions\?/i)).toBeInTheDocument();
    });

    it('displays existing propositions', () => {
      const propositions = [
        { statement: 'First proposition statement here' },
        { statement: 'Second proposition statement here' },
      ];

      render(<PropositionInput {...defaultProps} propositions={propositions} />);

      expect(screen.getByText('First proposition statement here')).toBeInTheDocument();
      expect(screen.getByText('Second proposition statement here')).toBeInTheDocument();
      expect(screen.getByText('2 of 10 propositions added')).toBeInTheDocument();
    });
  });

  describe('adding propositions', () => {
    it('Add button is disabled when input is empty', () => {
      render(<PropositionInput {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /Add/i });
      expect(addButton).toBeDisabled();
    });

    it('Add button is disabled when input is too short', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PropositionInput {...defaultProps} />);

      const input = screen.getByLabelText(/Proposition statement/i);
      await user.type(input, 'Short');

      const addButton = screen.getByRole('button', { name: /Add/i });
      expect(addButton).toBeDisabled();
      expect(screen.getByText(/more characters needed/i)).toBeInTheDocument();
    });

    it('enables Add button when input is valid', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PropositionInput {...defaultProps} />);

      const input = screen.getByLabelText(/Proposition statement/i);
      await user.type(input, 'This is a valid proposition statement');

      const addButton = screen.getByRole('button', { name: /Add/i });
      expect(addButton).not.toBeDisabled();
    });

    it('calls onChange when adding a proposition', async () => {
      const user = userEvent.setup({ delay: null });
      const onChange = vi.fn();
      render(<PropositionInput {...defaultProps} onChange={onChange} />);

      const input = screen.getByLabelText(/Proposition statement/i);
      await user.type(input, 'This is a valid proposition statement');
      await user.click(screen.getByRole('button', { name: /Add/i }));

      expect(onChange).toHaveBeenCalledWith([
        { statement: 'This is a valid proposition statement' },
      ]);
    });

    it('clears input after adding', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PropositionInput {...defaultProps} />);

      const input = screen.getByLabelText(/Proposition statement/i);
      await user.type(input, 'This is a valid proposition statement');
      await user.click(screen.getByRole('button', { name: /Add/i }));

      expect(input).toHaveValue('');
    });

    it('adds proposition on Enter key', async () => {
      const user = userEvent.setup({ delay: null });
      const onChange = vi.fn();
      render(<PropositionInput {...defaultProps} onChange={onChange} />);

      const input = screen.getByLabelText(/Proposition statement/i);
      await user.type(input, 'This is a valid proposition statement');
      await user.keyboard('{Enter}');

      expect(onChange).toHaveBeenCalledWith([
        { statement: 'This is a valid proposition statement' },
      ]);
    });

    it('trims whitespace from input', async () => {
      const user = userEvent.setup({ delay: null });
      const onChange = vi.fn();
      render(<PropositionInput {...defaultProps} onChange={onChange} />);

      const input = screen.getByLabelText(/Proposition statement/i);
      await user.type(input, '   Valid proposition with spaces   ');
      await user.click(screen.getByRole('button', { name: /Add/i }));

      expect(onChange).toHaveBeenCalledWith([{ statement: 'Valid proposition with spaces' }]);
    });
  });

  describe('removing propositions', () => {
    it('calls onChange when removing a proposition', async () => {
      const user = userEvent.setup({ delay: null });
      const onChange = vi.fn();
      const propositions = [
        { statement: 'First proposition here' },
        { statement: 'Second proposition here' },
      ];

      render(
        <PropositionInput {...defaultProps} propositions={propositions} onChange={onChange} />,
      );

      const removeButtons = screen.getAllByRole('button', { name: /Remove proposition/i });
      await user.click(removeButtons[0]);

      expect(onChange).toHaveBeenCalledWith([{ statement: 'Second proposition here' }]);
    });
  });

  describe('max limit', () => {
    it('disables input when max propositions reached', () => {
      const propositions = Array.from({ length: 10 }, (_, i) => ({
        statement: `Proposition number ${i + 1} statement`,
      }));

      render(<PropositionInput {...defaultProps} propositions={propositions} />);

      const input = screen.getByLabelText(/Proposition statement/i);
      expect(input).toBeDisabled();
    });

    it('shows correct count at max', () => {
      const propositions = Array.from({ length: 10 }, (_, i) => ({
        statement: `Proposition number ${i + 1} statement`,
      }));

      render(<PropositionInput {...defaultProps} propositions={propositions} />);

      expect(screen.getByText('10 of 10 propositions added')).toBeInTheDocument();
    });

    it('respects custom maxPropositions prop', () => {
      const propositions = Array.from({ length: 5 }, (_, i) => ({
        statement: `Proposition number ${i + 1} statement`,
      }));

      render(
        <PropositionInput {...defaultProps} propositions={propositions} maxPropositions={5} />,
      );

      expect(screen.getByText('5 of 5 propositions added')).toBeInTheDocument();
      expect(screen.getByLabelText(/Proposition statement/i)).toBeDisabled();
    });
  });

  describe('disabled state', () => {
    it('disables all inputs when disabled prop is true', () => {
      render(<PropositionInput {...defaultProps} disabled={true} />);

      expect(screen.getByLabelText(/Proposition statement/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /Add/i })).toBeDisabled();
    });

    it('disables remove buttons when disabled', () => {
      const propositions = [{ statement: 'Test proposition statement' }];

      render(<PropositionInput {...defaultProps} propositions={propositions} disabled={true} />);

      const removeButton = screen.getByRole('button', { name: /Remove proposition/i });
      expect(removeButton).toBeDisabled();
    });
  });

  describe('validation messages', () => {
    it('shows character count', async () => {
      const user = userEvent.setup({ delay: null });
      render(<PropositionInput {...defaultProps} />);

      const input = screen.getByLabelText(/Proposition statement/i);
      await user.type(input, 'Test');

      expect(screen.getByText('4/1000')).toBeInTheDocument();
    });

    it('shows min length requirement by default', () => {
      render(<PropositionInput {...defaultProps} />);

      expect(screen.getByText('10-1000 characters')).toBeInTheDocument();
    });
  });
});
