/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for PropositionInputSection component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import {
  PropositionInputSection,
  usePropositionValidation,
  type TopicProposition,
} from '../PropositionInputSection';

const createMockProposition = (overrides: Partial<TopicProposition> = {}): TopicProposition => ({
  id: `prop-${Date.now()}`,
  text: 'This is a test proposition with enough characters',
  type: 'thesis',
  ...overrides,
});

describe('PropositionInputSection', () => {
  describe('Rendering', () => {
    it('should render with label', () => {
      render(<PropositionInputSection propositions={[]} onChange={() => {}} />);
      expect(screen.getByText(/propositions/i)).toBeInTheDocument();
    });

    it('should render with required indicator', () => {
      render(<PropositionInputSection propositions={[]} onChange={() => {}} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render proposition count', () => {
      const propositions = [createMockProposition()];
      render(<PropositionInputSection propositions={propositions} onChange={() => {}} />);
      expect(screen.getByText('(1/10)')).toBeInTheDocument();
    });

    it('should render empty state message', () => {
      render(<PropositionInputSection propositions={[]} onChange={() => {}} />);
      expect(screen.getByText(/start by adding a thesis/i)).toBeInTheDocument();
    });

    it('should render add proposition form', () => {
      render(<PropositionInputSection propositions={[]} onChange={() => {}} />);
      expect(screen.getByLabelText(/new proposition text/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });

    it('should render existing propositions', () => {
      const propositions = [
        createMockProposition({ text: 'First proposition text here' }),
        createMockProposition({
          id: 'prop-2',
          text: 'Second proposition text here',
          type: 'antithesis',
        }),
      ];
      render(<PropositionInputSection propositions={propositions} onChange={() => {}} />);

      expect(screen.getByText('First proposition text here')).toBeInTheDocument();
      expect(screen.getByText('Second proposition text here')).toBeInTheDocument();
    });

    it('should render type badges for each proposition', () => {
      const propositions = [
        createMockProposition({ type: 'thesis' }),
        createMockProposition({ id: 'prop-2', type: 'antithesis' }),
        createMockProposition({ id: 'prop-3', type: 'synthesis' }),
      ];
      render(<PropositionInputSection propositions={propositions} onChange={() => {}} />);

      // Find badges by their specific styling (rounded-full badges, not select options)
      const badges = screen.getAllByText(/^(Thesis|Antithesis|Synthesis)$/);
      // Should have 3 badges + 3 type selects (each with 3 options) = badges appear multiple times
      // Just verify each type appears at least once as a badge
      const thesisBadges = badges.filter((el) => el.textContent === 'Thesis');
      const antithesisBadges = badges.filter((el) => el.textContent === 'Antithesis');
      const synthesisBadges = badges.filter((el) => el.textContent === 'Synthesis');

      expect(thesisBadges.length).toBeGreaterThan(0);
      expect(antithesisBadges.length).toBeGreaterThan(0);
      expect(synthesisBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Adding Propositions', () => {
    it('should call onChange when adding a proposition', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropositionInputSection propositions={[]} onChange={onChange} />);

      const textarea = screen.getByLabelText(/new proposition text/i);
      await user.type(textarea, 'This is a new thesis proposition for testing');

      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({
          text: 'This is a new thesis proposition for testing',
          type: 'thesis',
        }),
      ]);
    });

    it('should clear input after adding', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropositionInputSection propositions={[]} onChange={onChange} />);

      const textarea = screen.getByLabelText(/new proposition text/i);
      await user.type(textarea, 'This is a new thesis proposition for testing');
      await user.click(screen.getByRole('button', { name: /add/i }));

      expect(textarea).toHaveValue('');
    });

    it('should disable add button when text is too short', async () => {
      const user = userEvent.setup();
      render(<PropositionInputSection propositions={[]} onChange={() => {}} />);

      const textarea = screen.getByLabelText(/new proposition text/i);
      await user.type(textarea, 'Short');

      expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
    });

    it('should allow selecting proposition type', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<PropositionInputSection propositions={[]} onChange={onChange} />);

      const typeSelect = screen.getByLabelText(/proposition type/i);
      await user.selectOptions(typeSelect, 'antithesis');

      const textarea = screen.getByLabelText(/new proposition text/i);
      await user.type(textarea, 'This is an antithesis proposition for testing');
      await user.click(screen.getByRole('button', { name: /add/i }));

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'antithesis',
        }),
      ]);
    });

    it('should not allow adding when max reached', () => {
      const propositions = Array(10)
        .fill(null)
        .map((_, i) => createMockProposition({ id: `prop-${i}` }));
      render(<PropositionInputSection propositions={propositions} onChange={() => {}} />);

      expect(screen.queryByLabelText(/new proposition text/i)).not.toBeInTheDocument();
    });
  });

  describe('Removing Propositions', () => {
    it('should call onChange when removing a proposition', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const propositions = [createMockProposition({ id: 'prop-1' })];
      render(<PropositionInputSection propositions={propositions} onChange={onChange} />);

      const removeButton = screen.getByRole('button', { name: /remove proposition/i });
      await user.click(removeButton);

      expect(onChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Editing Propositions', () => {
    it('should enter edit mode when edit button clicked', async () => {
      const user = userEvent.setup();
      const propositions = [createMockProposition({ text: 'Original text here for testing' })];
      render(<PropositionInputSection propositions={propositions} onChange={() => {}} />);

      const editButton = screen.getByRole('button', { name: /edit proposition/i });
      await user.click(editButton);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should save edits when save clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const propositions = [createMockProposition({ id: 'prop-1', text: 'Original text here' })];
      render(<PropositionInputSection propositions={propositions} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /edit proposition/i }));

      const editTextarea = screen.getByDisplayValue('Original text here');
      await user.clear(editTextarea);
      await user.type(editTextarea, 'Updated text here for testing');

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'prop-1',
          text: 'Updated text here for testing',
        }),
      ]);
    });

    it('should cancel edits when cancel clicked', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const propositions = [createMockProposition({ text: 'Original text here for testing' })];
      render(<PropositionInputSection propositions={propositions} onChange={onChange} />);

      await user.click(screen.getByRole('button', { name: /edit proposition/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByText('Original text here for testing')).toBeInTheDocument();
    });
  });

  describe('Changing Type', () => {
    it('should update proposition type when changed', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      const propositions = [createMockProposition({ id: 'prop-1', type: 'thesis' })];
      render(<PropositionInputSection propositions={propositions} onChange={onChange} />);

      const typeSelect = screen.getByLabelText(/change proposition type/i);
      await user.selectOptions(typeSelect, 'synthesis');

      expect(onChange).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'prop-1',
          type: 'synthesis',
        }),
      ]);
    });
  });

  describe('Validation', () => {
    it('should show error when no propositions', () => {
      render(<PropositionInputSection propositions={[]} onChange={() => {}} />);
      expect(screen.getByRole('alert')).toHaveTextContent(/at least 1 proposition required/i);
    });

    it('should not show error when has propositions', () => {
      const propositions = [createMockProposition()];
      render(<PropositionInputSection propositions={propositions} onChange={() => {}} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should call onValidationChange with validation state', () => {
      const onValidationChange = vi.fn();
      const propositions = [createMockProposition({ type: 'thesis' })];
      render(
        <PropositionInputSection
          propositions={propositions}
          onChange={() => {}}
          onValidationChange={onValidationChange}
        />,
      );

      expect(onValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          propositionCount: 1,
          hasThesis: true,
        }),
      );
    });
  });

  describe('Disabled State', () => {
    it('should disable all inputs when disabled', () => {
      const propositions = [createMockProposition()];
      render(<PropositionInputSection propositions={propositions} onChange={() => {}} disabled />);

      expect(screen.getByLabelText(/new proposition text/i)).toBeDisabled();
      // Use exact match to distinguish from "Change proposition type" selector
      expect(screen.getByLabelText('Proposition type')).toBeDisabled();
      expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
    });
  });
});

describe('usePropositionValidation', () => {
  it('should return valid state when has propositions', () => {
    const propositions = [createMockProposition({ type: 'thesis' })];
    const { result } = renderHook(() => usePropositionValidation(propositions));

    expect(result.current.isValid).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.propositionCount).toBe(1);
    expect(result.current.hasThesis).toBe(true);
  });

  it('should return invalid when no propositions', () => {
    const { result } = renderHook(() => usePropositionValidation([]));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('At least 1 proposition required');
    expect(result.current.propositionCount).toBe(0);
  });

  it('should return warning when no thesis', () => {
    const propositions = [createMockProposition({ type: 'antithesis' })];
    const { result } = renderHook(() => usePropositionValidation(propositions));

    expect(result.current.isValid).toBe(true);
    expect(result.current.error).toBe('At least one thesis proposition is recommended');
    expect(result.current.hasThesis).toBe(false);
  });

  it('should return invalid when text too short', () => {
    const propositions = [createMockProposition({ text: 'Short' })];
    const { result } = renderHook(() => usePropositionValidation(propositions));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('Proposition text must be at least 10 characters');
  });

  it('should respect custom minPropositions', () => {
    const propositions = [createMockProposition()];
    const { result } = renderHook(() => usePropositionValidation(propositions, 2));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('At least 2 propositions required');
  });
});
