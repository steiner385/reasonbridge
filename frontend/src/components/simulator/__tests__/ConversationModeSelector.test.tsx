/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for ConversationModeSelector component
 * Feature: Discussion Simulator Persona Mode
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ConversationModeSelector,
  MODE_CONFIGS,
  DIFFICULTY_CONFIGS,
} from '../ConversationModeSelector';
import type { ConversationMode, DifficultyLevel } from '../../../types/simulator';

describe('ConversationModeSelector', () => {
  const mockOnModeChange = vi.fn();
  const mockOnDifficultyChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderSelector = (props: Partial<Parameters<typeof ConversationModeSelector>[0]> = {}) => {
    const defaultProps = {
      selectedMode: 'debate' as ConversationMode,
      selectedDifficulty: 'intermediate' as DifficultyLevel,
      onModeChange: mockOnModeChange,
      onDifficultyChange: mockOnDifficultyChange,
    };
    return render(<ConversationModeSelector {...defaultProps} {...props} />);
  };

  describe('Rendering', () => {
    it('should render conversation mode section', () => {
      renderSelector();
      expect(screen.getByText('Conversation Mode')).toBeInTheDocument();
    });

    it('should render difficulty level section', () => {
      renderSelector();
      expect(screen.getByText('Difficulty Level')).toBeInTheDocument();
    });

    it('should render all conversation mode options', () => {
      renderSelector();
      MODE_CONFIGS.forEach((mode) => {
        // Use getAllByText since labels appear in both options and summary
        const elements = screen.getAllByText(mode.label);
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should render all difficulty level options', () => {
      renderSelector();
      DIFFICULTY_CONFIGS.forEach((difficulty) => {
        // Use getAllByText since labels appear in both options and summary
        const elements = screen.getAllByText(difficulty.label);
        expect(elements.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should render mode descriptions', () => {
      renderSelector();
      MODE_CONFIGS.forEach((mode) => {
        expect(screen.getByText(mode.description)).toBeInTheDocument();
      });
    });

    it('should render difficulty descriptions', () => {
      renderSelector();
      DIFFICULTY_CONFIGS.forEach((difficulty) => {
        expect(screen.getByText(difficulty.description)).toBeInTheDocument();
      });
    });

    it('should render selection summary', () => {
      renderSelector();
      expect(screen.getByText('Current Selection')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderSelector({ className: 'custom-class' });
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Mode Selection', () => {
    it('should show selected state for current mode', () => {
      renderSelector({ selectedMode: 'socratic' });
      const socraticOption = screen.getByRole('radio', { name: /socratic/i });
      expect(socraticOption).toHaveAttribute('aria-checked', 'true');
    });

    it('should show unselected state for non-current modes', () => {
      renderSelector({ selectedMode: 'socratic' });
      const debateOption = screen.getByRole('radio', { name: /debate/i });
      expect(debateOption).toHaveAttribute('aria-checked', 'false');
    });

    it('should call onModeChange when clicking a mode option', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedMode: 'debate' });

      const socraticOption = screen.getByRole('radio', { name: /socratic/i });
      await user.click(socraticOption);

      expect(mockOnModeChange).toHaveBeenCalledWith('socratic');
    });

    it('should call onModeChange for each mode type', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedMode: 'debate' });

      // Test each mode
      for (const mode of MODE_CONFIGS) {
        const option = screen.getByRole('radio', { name: new RegExp(mode.label, 'i') });
        await user.click(option);
        expect(mockOnModeChange).toHaveBeenCalledWith(mode.id);
      }
    });

    it('should show checkmark icon for selected mode', () => {
      renderSelector({ selectedMode: 'steelman' });
      const steelmanOption = screen.getByRole('radio', { name: /steelman/i });

      // Check for the checkmark SVG (aria-hidden SVGs don't have 'img' role)
      // Find the second SVG which is the checkmark (first is the mode icon)
      const svgs = steelmanOption.querySelectorAll('svg');
      // Should have 2 SVGs: mode icon and checkmark
      expect(svgs.length).toBe(2);
      // The checkmark SVG has fill="currentColor"
      const checkmarkSvg = steelmanOption.querySelector('svg[fill="currentColor"]');
      expect(checkmarkSvg).toBeInTheDocument();
    });
  });

  describe('Difficulty Selection', () => {
    it('should show selected state for current difficulty', () => {
      renderSelector({ selectedDifficulty: 'novice' });
      const noviceOption = screen.getByRole('radio', { name: /novice/i });
      expect(noviceOption).toHaveAttribute('aria-checked', 'true');
    });

    it('should show unselected state for non-current difficulties', () => {
      renderSelector({ selectedDifficulty: 'novice' });
      const expertOption = screen.getByRole('radio', { name: /expert/i });
      expect(expertOption).toHaveAttribute('aria-checked', 'false');
    });

    it('should call onDifficultyChange when clicking a difficulty option', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedDifficulty: 'intermediate' });

      const expertOption = screen.getByRole('radio', { name: /expert/i });
      await user.click(expertOption);

      expect(mockOnDifficultyChange).toHaveBeenCalledWith('expert');
    });

    it('should call onDifficultyChange for each difficulty level', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedDifficulty: 'intermediate' });

      for (const difficulty of DIFFICULTY_CONFIGS) {
        const option = screen.getByRole('radio', { name: new RegExp(difficulty.label, 'i') });
        await user.click(option);
        expect(mockOnDifficultyChange).toHaveBeenCalledWith(difficulty.id);
      }
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate modes with ArrowDown key', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedMode: 'socratic' });

      const socraticOption = screen.getByRole('radio', { name: /socratic/i });
      socraticOption.focus();

      await user.keyboard('{ArrowDown}');

      // Should move to the next mode (debate)
      expect(mockOnModeChange).toHaveBeenCalledWith('debate');
    });

    it('should navigate modes with ArrowRight key', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedMode: 'socratic' });

      const socraticOption = screen.getByRole('radio', { name: /socratic/i });
      socraticOption.focus();

      await user.keyboard('{ArrowRight}');

      expect(mockOnModeChange).toHaveBeenCalledWith('debate');
    });

    it('should navigate modes with ArrowUp key', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedMode: 'debate' });

      const debateOption = screen.getByRole('radio', { name: /debate/i });
      debateOption.focus();

      await user.keyboard('{ArrowUp}');

      // Should move to the previous mode (socratic)
      expect(mockOnModeChange).toHaveBeenCalledWith('socratic');
    });

    it('should navigate modes with ArrowLeft key', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedMode: 'debate' });

      const debateOption = screen.getByRole('radio', { name: /debate/i });
      debateOption.focus();

      await user.keyboard('{ArrowLeft}');

      expect(mockOnModeChange).toHaveBeenCalledWith('socratic');
    });

    it('should wrap around when navigating past last mode', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedMode: 'common_ground' });

      const commonGroundOption = screen.getByRole('radio', { name: /common ground/i });
      commonGroundOption.focus();

      await user.keyboard('{ArrowDown}');

      // Should wrap to the first mode (socratic)
      expect(mockOnModeChange).toHaveBeenCalledWith('socratic');
    });

    it('should wrap around when navigating before first mode', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedMode: 'socratic' });

      const socraticOption = screen.getByRole('radio', { name: /socratic/i });
      socraticOption.focus();

      await user.keyboard('{ArrowUp}');

      // Should wrap to the last mode (common_ground)
      expect(mockOnModeChange).toHaveBeenCalledWith('common_ground');
    });

    it('should navigate difficulties with ArrowDown key', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedDifficulty: 'novice' });

      const noviceOption = screen.getByRole('radio', { name: /novice/i });
      noviceOption.focus();

      await user.keyboard('{ArrowDown}');

      expect(mockOnDifficultyChange).toHaveBeenCalledWith('intermediate');
    });

    it('should navigate difficulties with ArrowUp key', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedDifficulty: 'intermediate' });

      const intermediateOption = screen.getByRole('radio', { name: /intermediate/i });
      intermediateOption.focus();

      await user.keyboard('{ArrowUp}');

      expect(mockOnDifficultyChange).toHaveBeenCalledWith('novice');
    });

    it('should wrap around when navigating past last difficulty', async () => {
      const user = userEvent.setup({ delay: null });
      renderSelector({ selectedDifficulty: 'expert' });

      const expertOption = screen.getByRole('radio', { name: /expert/i });
      expertOption.focus();

      await user.keyboard('{ArrowDown}');

      // Should wrap to novice
      expect(mockOnDifficultyChange).toHaveBeenCalledWith('novice');
    });
  });

  describe('Accessibility', () => {
    it('should have radiogroup role for mode selection', () => {
      renderSelector();
      const radiogroups = screen.getAllByRole('radiogroup');
      expect(radiogroups).toHaveLength(2);
    });

    it('should have aria-labelledby on mode radiogroup', () => {
      renderSelector();
      const radiogroups = screen.getAllByRole('radiogroup');
      const modeGroup = radiogroups[0];
      expect(modeGroup).toHaveAttribute('aria-labelledby');
    });

    it('should have aria-labelledby on difficulty radiogroup', () => {
      renderSelector();
      const radiogroups = screen.getAllByRole('radiogroup');
      const difficultyGroup = radiogroups[1];
      expect(difficultyGroup).toHaveAttribute('aria-labelledby');
    });

    it('should have radio role on mode options', () => {
      renderSelector();
      const modeRadios = screen.getAllByRole('radio');
      // 4 modes + 3 difficulties = 7 radios
      expect(modeRadios).toHaveLength(7);
    });

    it('should have aria-checked attribute on all options', () => {
      renderSelector();
      const allRadios = screen.getAllByRole('radio');
      allRadios.forEach((radio) => {
        expect(radio).toHaveAttribute('aria-checked');
      });
    });

    it('should have tabIndex=0 on selected mode', () => {
      renderSelector({ selectedMode: 'steelman' });
      const steelmanOption = screen.getByRole('radio', { name: /steelman/i });
      expect(steelmanOption).toHaveAttribute('tabIndex', '0');
    });

    it('should have tabIndex=-1 on non-selected modes', () => {
      renderSelector({ selectedMode: 'steelman' });
      const debateOption = screen.getByRole('radio', { name: /debate/i });
      expect(debateOption).toHaveAttribute('tabIndex', '-1');
    });

    it('should have tabIndex=0 on selected difficulty', () => {
      renderSelector({ selectedDifficulty: 'expert' });
      const expertOption = screen.getByRole('radio', { name: /expert/i });
      expect(expertOption).toHaveAttribute('tabIndex', '0');
    });

    it('should have aria-hidden on decorative icons', () => {
      renderSelector();
      // The mode icons and checkmark icons should have aria-hidden
      const hiddenIcons = document.querySelectorAll('[aria-hidden="true"]');
      expect(hiddenIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Selection Summary', () => {
    it('should display selected mode in summary', () => {
      renderSelector({ selectedMode: 'socratic' });
      const summary = screen.getByText('Current Selection').parentElement;
      expect(within(summary!).getByText('Socratic')).toBeInTheDocument();
    });

    it('should display selected difficulty in summary', () => {
      renderSelector({ selectedDifficulty: 'expert' });
      const summary = screen.getByText('Current Selection').parentElement;
      expect(within(summary!).getByText('Expert')).toBeInTheDocument();
    });

    it('should update summary when mode changes', () => {
      const { rerender } = render(
        <ConversationModeSelector
          selectedMode="debate"
          selectedDifficulty="intermediate"
          onModeChange={mockOnModeChange}
          onDifficultyChange={mockOnDifficultyChange}
        />,
      );

      const summary = screen.getByText('Current Selection').parentElement;
      expect(within(summary!).getByText('Debate')).toBeInTheDocument();

      rerender(
        <ConversationModeSelector
          selectedMode="steelman"
          selectedDifficulty="intermediate"
          onModeChange={mockOnModeChange}
          onDifficultyChange={mockOnDifficultyChange}
        />,
      );

      expect(within(summary!).getByText('Steelman')).toBeInTheDocument();
    });

    it('should update summary when difficulty changes', () => {
      const { rerender } = render(
        <ConversationModeSelector
          selectedMode="debate"
          selectedDifficulty="novice"
          onModeChange={mockOnModeChange}
          onDifficultyChange={mockOnDifficultyChange}
        />,
      );

      const summary = screen.getByText('Current Selection').parentElement;
      expect(within(summary!).getByText('Novice')).toBeInTheDocument();

      rerender(
        <ConversationModeSelector
          selectedMode="debate"
          selectedDifficulty="expert"
          onModeChange={mockOnModeChange}
          onDifficultyChange={mockOnDifficultyChange}
        />,
      );

      expect(within(summary!).getByText('Expert')).toBeInTheDocument();
    });
  });

  describe('Visual States', () => {
    it('should have different styling for selected mode', () => {
      renderSelector({ selectedMode: 'debate' });
      const debateOption = screen.getByRole('radio', { name: /debate/i });

      // Selected mode should have primary border color
      expect(debateOption.className).toContain('border-primary-500');
    });

    it('should have different styling for non-selected mode', () => {
      renderSelector({ selectedMode: 'debate' });
      const socraticOption = screen.getByRole('radio', { name: /socratic/i });

      // Non-selected mode should have gray border
      expect(socraticOption.className).toContain('border-gray-200');
    });

    it('should have color-coded difficulty levels', () => {
      renderSelector();

      const noviceOption = screen.getByRole('radio', { name: /novice/i });
      const intermediateOption = screen.getByRole('radio', { name: /intermediate/i });
      const expertOption = screen.getByRole('radio', { name: /expert/i });

      // Each difficulty should have its own color scheme
      expect(noviceOption.className).toContain('green');
      expect(intermediateOption.className).toContain('amber');
      expect(expertOption.className).toContain('red');
    });
  });

  describe('Mode Config Values', () => {
    it('should have correct number of mode configs', () => {
      expect(MODE_CONFIGS).toHaveLength(4);
    });

    it('should have correct mode IDs', () => {
      const modeIds = MODE_CONFIGS.map((m) => m.id);
      expect(modeIds).toEqual(['socratic', 'debate', 'steelman', 'common_ground']);
    });

    it('should have correct number of difficulty configs', () => {
      expect(DIFFICULTY_CONFIGS).toHaveLength(3);
    });

    it('should have correct difficulty IDs', () => {
      const difficultyIds = DIFFICULTY_CONFIGS.map((d) => d.id);
      expect(difficultyIds).toEqual(['novice', 'intermediate', 'expert']);
    });

    it('should have descriptions for all modes', () => {
      MODE_CONFIGS.forEach((mode) => {
        expect(mode.description).toBeTruthy();
        expect(mode.description.length).toBeGreaterThan(10);
      });
    });

    it('should have descriptions for all difficulties', () => {
      DIFFICULTY_CONFIGS.forEach((difficulty) => {
        expect(difficulty.description).toBeTruthy();
        expect(difficulty.description.length).toBeGreaterThan(10);
      });
    });
  });
});
