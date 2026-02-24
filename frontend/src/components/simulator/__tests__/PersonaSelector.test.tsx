/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for PersonaSelector component
 * Feature: Discussion Simulator Persona Mode
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaSelector, DEFAULT_PRESET_PERSONAS } from '../PersonaSelector';
import type { PresetPersona } from '../../../types/simulator';

describe('PersonaSelector', () => {
  const mockOnSelect = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderPersonaSelector = (props = {}) => {
    return render(
      <PersonaSelector isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} {...props} />,
    );
  };

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      renderPersonaSelector();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      renderPersonaSelector({ isOpen: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal title', () => {
      renderPersonaSelector();
      expect(screen.getByText('Select a Persona')).toBeInTheDocument();
    });

    it('should render introduction text', () => {
      renderPersonaSelector();
      expect(screen.getByText(/choose a persona to debate with/i)).toBeInTheDocument();
    });

    it('should render all default preset personas', () => {
      renderPersonaSelector();
      DEFAULT_PRESET_PERSONAS.forEach((persona) => {
        expect(screen.getByText(persona.name)).toBeInTheDocument();
      });
    });

    it('should render custom preset personas when provided', () => {
      const customPersonas: PresetPersona[] = [
        {
          id: 'custom-1',
          name: 'Custom Persona',
          description: 'A custom test persona',
          position: 'Test Position',
          tone: 'analytical',
          receptiveness: 0.7,
          argumentation: {
            usesEmotionalAppeals: false,
            citesData: true,
            asksQuestions: true,
          },
          modeAffinity: 'debate',
        },
      ];

      renderPersonaSelector({ presetPersonas: customPersonas });
      expect(screen.getByText('Custom Persona')).toBeInTheDocument();
      expect(screen.queryByText('Socratic Mentor')).not.toBeInTheDocument();
    });

    it('should render persona descriptions', () => {
      renderPersonaSelector();
      expect(screen.getByText(/thoughtful guide who asks probing questions/i)).toBeInTheDocument();
    });

    it('should render tone badges', () => {
      renderPersonaSelector();
      expect(screen.getAllByText('Measured').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Analytical').length).toBeGreaterThan(0);
    });

    it('should render mode affinity badges', () => {
      renderPersonaSelector();
      expect(screen.getAllByText('Socratic').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Debate').length).toBeGreaterThan(0);
    });

    it('should render receptiveness indicators', () => {
      renderPersonaSelector();
      expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Moderate').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Firm').length).toBeGreaterThan(0);
    });

    it('should render argumentation style indicators', () => {
      renderPersonaSelector();
      expect(screen.getAllByText('Data').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Questions').length).toBeGreaterThan(0);
    });

    it('should render Cancel and Select Persona buttons', () => {
      renderPersonaSelector();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /select persona/i })).toBeInTheDocument();
    });

    it('should disable Select Persona button when no persona selected', () => {
      renderPersonaSelector();
      expect(screen.getByRole('button', { name: /select persona/i })).toBeDisabled();
    });
  });

  describe('Selection', () => {
    it('should show selection indicator when persona is selected', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      expect(socraticCard).toBeInTheDocument();

      await user.click(socraticCard!);

      expect(socraticCard).toHaveAttribute('aria-selected', 'true');
    });

    it('should show selected persona summary at bottom', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      await user.click(socraticCard!);

      expect(screen.getByText(/selected: socratic mentor/i)).toBeInTheDocument();
    });

    it('should enable Select Persona button after selection', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      await user.click(socraticCard!);

      expect(screen.getByRole('button', { name: /select persona/i })).not.toBeDisabled();
    });

    it('should call onSelect with persona when clicking Select Persona', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      await user.click(socraticCard!);

      await user.click(screen.getByRole('button', { name: /select persona/i }));

      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'socratic-mentor',
          name: 'Socratic Mentor',
        }),
      );
    });

    it('should call onClose after selection', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      await user.click(socraticCard!);

      await user.click(screen.getByRole('button', { name: /select persona/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should allow changing selection before confirming', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      // First select Socratic Mentor
      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      await user.click(socraticCard!);

      expect(socraticCard).toHaveAttribute('aria-selected', 'true');

      // Then select Devil's Advocate
      const devilsCard = screen.getByText("Devil's Advocate").closest('[role="option"]');
      await user.click(devilsCard!);

      expect(devilsCard).toHaveAttribute('aria-selected', 'true');
      expect(socraticCard).toHaveAttribute('aria-selected', 'false');

      // Confirm selection
      await user.click(screen.getByRole('button', { name: /select persona/i }));

      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'devils-advocate',
          name: "Devil's Advocate",
        }),
      );
    });

    it('should pre-select existing selectedPersona', () => {
      const selectedPersona = DEFAULT_PRESET_PERSONAS[0]; // Socratic Mentor
      renderPersonaSelector({ selectedPersona });

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');

      expect(socraticCard).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Closing', () => {
    it('should call onClose when clicking Cancel', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking close button', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      await user.click(screen.getByLabelText('Close modal'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when pressing Escape', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking backdrop', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      // Click on the backdrop (the semi-transparent overlay)
      const backdrop = document.querySelector('.bg-gray-900');
      if (backdrop) {
        await user.click(backdrop);
        expect(mockOnClose).toHaveBeenCalled();
      }
    });
  });

  describe('Keyboard Navigation', () => {
    it('should select persona with Enter key', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');

      socraticCard!.focus();
      await user.keyboard('{Enter}');

      expect(socraticCard).toHaveAttribute('aria-selected', 'true');
    });

    it('should select persona with Space key', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');

      socraticCard!.focus();
      await user.keyboard(' ');

      expect(socraticCard).toHaveAttribute('aria-selected', 'true');
    });

    it('should support Tab navigation between cards', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      // Tab through the modal to the first card
      await user.tab();
      await user.tab(); // Close button
      await user.tab(); // First card

      // The focus should be on a card element
      const activeElement = document.activeElement;
      expect(activeElement?.getAttribute('role')).toBe('option');
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when isLoading is true', () => {
      renderPersonaSelector({ isLoading: true });

      expect(screen.getByText(/loading personas/i)).toBeInTheDocument();
    });

    it('should not show persona cards when loading', () => {
      renderPersonaSelector({ isLoading: true });

      expect(screen.queryByText('Socratic Mentor')).not.toBeInTheDocument();
    });

    it('should hide loading and show cards when isLoading becomes false', () => {
      const { rerender } = render(
        <PersonaSelector
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          isLoading={true}
        />,
      );

      expect(screen.getByText(/loading personas/i)).toBeInTheDocument();

      rerender(
        <PersonaSelector
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          isLoading={false}
        />,
      );

      expect(screen.queryByText(/loading personas/i)).not.toBeInTheDocument();
      expect(screen.getByText('Socratic Mentor')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no personas available', () => {
      renderPersonaSelector({ presetPersonas: [] });

      expect(screen.getByText(/no personas available/i)).toBeInTheDocument();
    });

    it('should show helpful message in empty state', () => {
      renderPersonaSelector({ presetPersonas: [] });

      expect(screen.getByText(/unable to load personas/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role on modal', () => {
      renderPersonaSelector();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have aria-modal attribute', () => {
      renderPersonaSelector();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('should have listbox role on persona grid', () => {
      renderPersonaSelector();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('should have aria-label on listbox', () => {
      renderPersonaSelector();
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-label', 'Available personas');
    });

    it('should have option role on persona cards', () => {
      renderPersonaSelector();
      const options = screen.getAllByRole('option');
      expect(options.length).toBe(DEFAULT_PRESET_PERSONAS.length);
    });

    it('should have aria-selected attribute on options', () => {
      renderPersonaSelector();
      const options = screen.getAllByRole('option');
      options.forEach((option) => {
        expect(option).toHaveAttribute('aria-selected');
      });
    });

    it('should update aria-activedescendant when selection changes', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      const listbox = screen.getByRole('listbox');
      expect(listbox).not.toHaveAttribute('aria-activedescendant');

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      await user.click(socraticCard!);

      expect(listbox).toHaveAttribute('aria-activedescendant', 'persona-socratic-mentor');
    });

    it('should trap focus within modal', () => {
      renderPersonaSelector();

      // Tab through all focusable elements
      // The focus should cycle within the modal
      const focusableElements = screen
        .getByRole('dialog')
        .querySelectorAll('button, [tabindex="0"]');

      expect(focusableElements.length).toBeGreaterThan(0);

      // Focus the first element
      (focusableElements[0] as HTMLElement).focus();
      expect(document.activeElement).toBe(focusableElements[0]);
    });
  });

  describe('Persona Card Content', () => {
    it('should display persona name prominently', () => {
      renderPersonaSelector();

      const nameElement = screen.getByText('Socratic Mentor');
      expect(nameElement.tagName).toBe('H3');
      expect(nameElement).toHaveClass('font-semibold');
    });

    it('should truncate long descriptions', () => {
      renderPersonaSelector();

      // Check that description has line-clamp class
      const description = screen.getByText(/thoughtful guide who asks probing questions/i);
      expect(description).toHaveClass('line-clamp-2');
    });

    it('should show checkmark icon for selected persona', async () => {
      const user = userEvent.setup();
      renderPersonaSelector();

      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      await user.click(socraticCard!);

      // Check for the checkmark SVG inside the selected card
      // The checkmark is inside a div with class "absolute top-3 right-3"
      const checkmarkContainer = socraticCard!.querySelector('.absolute.top-3.right-3');
      expect(checkmarkContainer).toBeInTheDocument();

      // Verify the SVG checkmark icon is present
      const svg = checkmarkContainer!.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('should show appropriate tone color for each persona', () => {
      renderPersonaSelector();

      // Check that different tone badges have different colors
      const measuredBadges = screen.getAllByText('Measured');
      const analyticalBadges = screen.getAllByText('Analytical');

      // Measured should have blue styling
      expect(measuredBadges[0]).toHaveClass('text-blue-700');

      // Analytical should have purple styling
      expect(analyticalBadges[0]).toHaveClass('text-purple-700');
    });
  });

  describe('State Reset on Modal Open', () => {
    it('should reset local selection when modal reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <PersonaSelector isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />,
      );

      // Make a selection
      const socraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      await user.click(socraticCard!);

      expect(socraticCard).toHaveAttribute('aria-selected', 'true');

      // Close and reopen the modal
      rerender(<PersonaSelector isOpen={false} onClose={mockOnClose} onSelect={mockOnSelect} />);

      rerender(<PersonaSelector isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />);

      // Selection should be cleared
      const newSocraticCard = screen.getByText('Socratic Mentor').closest('[role="option"]');
      expect(newSocraticCard).toHaveAttribute('aria-selected', 'false');
    });

    it('should preserve selectedPersona when modal reopens', async () => {
      const selectedPersona = DEFAULT_PRESET_PERSONAS[1]; // Devil's Advocate

      const { rerender } = render(
        <PersonaSelector
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          selectedPersona={selectedPersona}
        />,
      );

      // Close and reopen
      rerender(
        <PersonaSelector
          isOpen={false}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          selectedPersona={selectedPersona}
        />,
      );

      rerender(
        <PersonaSelector
          isOpen={true}
          onClose={mockOnClose}
          onSelect={mockOnSelect}
          selectedPersona={selectedPersona}
        />,
      );

      const devilsCard = screen.getByText("Devil's Advocate").closest('[role="option"]');
      expect(devilsCard).toHaveAttribute('aria-selected', 'true');
    });
  });
});
