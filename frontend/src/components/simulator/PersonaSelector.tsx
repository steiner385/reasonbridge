/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import Modal from '../ui/Modal';
import Card from '../ui/Card';
import Button from '../ui/Button';
import type {
  SimulationPersona,
  PresetPersona,
  PersonaTone,
  ConversationMode,
} from '../../types/simulator';

/**
 * Default preset personas for the simulator
 *
 * @remarks
 * These personas represent common discussion archetypes with varying
 * tones, receptiveness levels, and argumentation styles. They can be
 * overridden by fetching from the API via `getPresetPersonas()`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_PRESET_PERSONAS: PresetPersona[] = [
  {
    id: 'socratic-mentor',
    name: 'Socratic Mentor',
    description:
      'A thoughtful guide who asks probing questions to help you examine your assumptions and strengthen your reasoning.',
    position: 'Questioner',
    tone: 'measured' as PersonaTone,
    receptiveness: 0.9,
    argumentation: {
      usesEmotionalAppeals: false,
      citesData: true,
      asksQuestions: true,
    },
    modeAffinity: 'socratic' as ConversationMode,
  },
  {
    id: 'devils-advocate',
    name: "Devil's Advocate",
    description:
      'A rigorous challenger who argues against your position to test the strength of your arguments.',
    position: 'Contrarian',
    tone: 'analytical' as PersonaTone,
    receptiveness: 0.4,
    argumentation: {
      usesEmotionalAppeals: false,
      citesData: true,
      asksQuestions: true,
    },
    modeAffinity: 'debate' as ConversationMode,
  },
  {
    id: 'steelman-partner',
    name: 'Steelman Partner',
    description:
      'A collaborative partner who helps you build the strongest possible version of your argument.',
    position: 'Collaborator',
    tone: 'measured' as PersonaTone,
    receptiveness: 0.95,
    argumentation: {
      usesEmotionalAppeals: false,
      citesData: true,
      asksQuestions: true,
    },
    modeAffinity: 'steelman' as ConversationMode,
  },
  {
    id: 'passionate-advocate',
    name: 'Passionate Advocate',
    description:
      'An emotionally engaged debater who combines personal conviction with reasoned arguments.',
    position: 'Advocate',
    tone: 'passionate' as PersonaTone,
    receptiveness: 0.5,
    argumentation: {
      usesEmotionalAppeals: true,
      citesData: true,
      asksQuestions: false,
    },
    modeAffinity: 'debate' as ConversationMode,
  },
  {
    id: 'common-ground-seeker',
    name: 'Common Ground Seeker',
    description:
      'A mediator focused on finding shared values and building consensus between different viewpoints.',
    position: 'Mediator',
    tone: 'measured' as PersonaTone,
    receptiveness: 0.85,
    argumentation: {
      usesEmotionalAppeals: false,
      citesData: true,
      asksQuestions: true,
    },
    modeAffinity: 'common_ground' as ConversationMode,
  },
  {
    id: 'aggressive-challenger',
    name: 'Aggressive Challenger',
    description:
      'A confrontational debater who pushes back strongly and tests your ability to stay calm under pressure.',
    position: 'Challenger',
    tone: 'confrontational' as PersonaTone,
    receptiveness: 0.2,
    argumentation: {
      usesEmotionalAppeals: true,
      citesData: false,
      asksQuestions: false,
    },
    modeAffinity: 'debate' as ConversationMode,
  },
];

/**
 * Props for the PersonaSelector component
 */
export interface PersonaSelectorProps {
  /** Currently selected persona */
  selectedPersona?: SimulationPersona;
  /** Callback when a persona is selected */
  onSelect: (persona: SimulationPersona) => void;
  /** Whether the selector is open */
  isOpen: boolean;
  /** Close the selector */
  onClose: () => void;
  /** Optional preset personas to display (defaults to DEFAULT_PRESET_PERSONAS) */
  presetPersonas?: PresetPersona[];
  /** Whether personas are loading from API */
  isLoading?: boolean;
}

/**
 * Maps persona tone to display color classes
 */
const TONE_COLORS: Record<PersonaTone, { bg: string; text: string; border: string }> = {
  measured: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
  },
  analytical: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
  },
  passionate: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-300 dark:border-orange-700',
  },
  confrontational: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-700',
  },
};

/**
 * Maps conversation mode to display labels
 */
const MODE_LABELS: Record<ConversationMode, string> = {
  socratic: 'Socratic',
  debate: 'Debate',
  steelman: 'Steelman',
  common_ground: 'Common Ground',
};

/**
 * PersonaCard - Individual persona display card
 */
interface PersonaCardProps {
  persona: PresetPersona;
  isSelected: boolean;
  onSelect: () => void;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ persona, isSelected, onSelect }) => {
  const toneColors = TONE_COLORS[persona.tone] ?? {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-700',
  };
  const modeLabel = MODE_LABELS[persona.modeAffinity] ?? persona.modeAffinity;

  return (
    <Card
      variant={isSelected ? 'outlined' : 'default'}
      padding="md"
      hoverable
      clickable
      className={`
        relative cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-2 ring-primary-500 dark:ring-primary-400 border-primary-500 dark:border-primary-400' : ''}
        focus-within:ring-2 focus-within:ring-primary-500 dark:focus-within:ring-primary-400
      `}
      onClick={onSelect}
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-primary-500 dark:bg-primary-400 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Persona name */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-8">
        {persona.name}
      </h3>

      {/* Description */}
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
        {persona.description}
      </p>

      {/* Tags row */}
      <div className="mt-3 flex flex-wrap gap-2">
        {/* Tone badge */}
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${toneColors.bg} ${toneColors.text}`}
        >
          {persona.tone.charAt(0).toUpperCase() + persona.tone.slice(1)}
        </span>

        {/* Mode affinity badge */}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
          {modeLabel}
        </span>

        {/* Receptiveness indicator */}
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
          title={`Receptiveness: ${Math.round(persona.receptiveness * 100)}%`}
        >
          <svg
            className="w-3 h-3 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {persona.receptiveness >= 0.7
            ? 'Open'
            : persona.receptiveness >= 0.4
              ? 'Moderate'
              : 'Firm'}
        </span>
      </div>

      {/* Argumentation style indicators */}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        {persona.argumentation.citesData && (
          <span className="flex items-center gap-1" title="Uses data and citations">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            Data
          </span>
        )}
        {persona.argumentation.asksQuestions && (
          <span className="flex items-center gap-1" title="Asks clarifying questions">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Questions
          </span>
        )}
        {persona.argumentation.usesEmotionalAppeals && (
          <span className="flex items-center gap-1" title="Uses emotional appeals">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            Emotional
          </span>
        )}
      </div>
    </Card>
  );
};

/**
 * PersonaSelector - Modal for selecting a simulation persona
 *
 * @remarks
 * Displays a grid of preset personas as selectable cards. Each card shows:
 * - Name and description
 * - Communication tone (measured, analytical, passionate, confrontational)
 * - Mode affinity (socratic, debate, steelman, common_ground)
 * - Receptiveness level (open, moderate, firm)
 * - Argumentation style indicators (data, questions, emotional)
 *
 * **Accessibility Features:**
 * - Focus trap within modal
 * - Keyboard navigation (Tab, Enter, Space)
 * - ARIA roles and attributes for listbox pattern
 * - Screen reader announcements for selection state
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * const [persona, setPersona] = useState<SimulationPersona>();
 *
 * <PersonaSelector
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   selectedPersona={persona}
 *   onSelect={(p) => {
 *     setPersona(p);
 *     setIsOpen(false);
 *   }}
 * />
 * ```
 */
export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  selectedPersona,
  onSelect,
  isOpen,
  onClose,
  presetPersonas = DEFAULT_PRESET_PERSONAS,
  isLoading = false,
}) => {
  const [localSelection, setLocalSelection] = useState<SimulationPersona | undefined>(
    selectedPersona,
  );

  // Reset local selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalSelection(selectedPersona);
    }
  }, [isOpen, selectedPersona]);

  const handleSelect = useCallback((persona: PresetPersona) => {
    setLocalSelection(persona);
  }, []);

  const handleConfirm = useCallback(() => {
    if (localSelection) {
      onSelect(localSelection);
      onClose();
    }
  }, [localSelection, onSelect, onClose]);

  const isPersonaSelected = useCallback(
    (persona: PresetPersona) => {
      if (!localSelection) return false;
      return localSelection.id === persona.id;
    },
    [localSelection],
  );

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={handleConfirm} disabled={!localSelection}>
        Select Persona
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select a Persona"
      size="xl"
      footer={footer}
      closeOnBackdropClick
      closeOnEscape
    >
      <div className="space-y-4">
        {/* Introduction text */}
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Choose a persona to debate with. Each persona has a unique communication style, level of
          receptiveness to opposing viewpoints, and preferred conversation mode.
        </p>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading personas...</span>
          </div>
        )}

        {/* Persona grid */}
        {!isLoading && (
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            role="listbox"
            aria-label="Available personas"
            aria-activedescendant={localSelection ? `persona-${localSelection.id}` : undefined}
          >
            {presetPersonas.map((persona) => (
              <div key={persona.id} id={`persona-${persona.id}`}>
                <PersonaCard
                  persona={persona}
                  isSelected={isPersonaSelected(persona)}
                  onSelect={() => handleSelect(persona)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && presetPersonas.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              No personas available
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Unable to load personas. Please try again later.
            </p>
          </div>
        )}

        {/* Selected persona summary (shown at bottom when selected) */}
        {localSelection && !isLoading && (
          <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-500 dark:bg-primary-400 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-100">
                  Selected: {localSelection.name}
                </h4>
                <p className="mt-1 text-sm text-primary-700 dark:text-primary-300">
                  {'description' in localSelection ? localSelection.description : 'Custom persona'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default PersonaSelector;
