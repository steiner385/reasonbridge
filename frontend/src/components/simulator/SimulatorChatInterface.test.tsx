/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  SimulationState,
  SimulationConversationMessage,
  AIOperation,
} from '../../types/simulator';
import { createInitialState } from '../../types/simulator';
import { SimulatorChatInterface } from './SimulatorChatInterface';

// Mock scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock the OperationQueue component
vi.mock('../ui/OperationQueue', () => ({
  default: ({ operations }: { operations: AIOperation[] }) => (
    <div data-testid="operation-queue">
      {operations.map((op) => (
        <div key={op.id} data-testid={`operation-${op.id}`}>
          {op.label}
        </div>
      ))}
    </div>
  ),
}));

// Mock ChatMessageSkeleton
vi.mock('../ui/skeletons', () => ({
  ChatMessageSkeleton: ({ 'data-testid': testId }: { 'data-testid'?: string }) => (
    <div data-testid={testId ?? 'chat-message-skeleton'}>Loading...</div>
  ),
}));

// Mock Button component
vi.mock('../ui/Button', () => ({
  default: ({
    children,
    onClick,
    disabled,
    'data-testid': testId,
    type = 'button',
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    'data-testid'?: string;
    type?: 'button' | 'submit';
  }) => (
    <button onClick={onClick} disabled={disabled} data-testid={testId} type={type} {...props}>
      {children}
    </button>
  ),
}));

describe('SimulatorChatInterface', () => {
  const mockDispatch = vi.fn();

  const mockPersona = {
    id: 'test-persona',
    name: 'Test Persona',
    description: 'A test persona',
    position: 'Test Position',
    tone: 'measured' as const,
    receptiveness: 0.8,
    argumentation: {
      usesEmotionalAppeals: false,
      citesData: true,
      asksQuestions: true,
    },
    modeAffinity: 'debate' as const,
  };

  const createMessage = (
    overrides: Partial<SimulationConversationMessage> = {},
  ): SimulationConversationMessage => ({
    id: `msg-${Date.now()}`,
    role: 'user',
    content: 'Test message content',
    timestamp: new Date().toISOString(),
    ...overrides,
  });

  const createActiveState = (overrides: Partial<SimulationState> = {}): SimulationState => ({
    ...createInitialState(),
    status: 'active',
    persona: mockPersona,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the chat interface container', () => {
      const state = createActiveState();
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByTestId('simulator-chat-interface')).toBeInTheDocument();
    });

    it('shows session controls when not configuring', () => {
      const state = createActiveState();
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByTestId('session-controls')).toBeInTheDocument();
    });

    it('hides session controls when configuring', () => {
      const state = createActiveState({ status: 'configuring' });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.queryByTestId('session-controls')).not.toBeInTheDocument();
    });

    it('shows message input when not configuring', () => {
      const state = createActiveState();
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByTestId('message-input-form')).toBeInTheDocument();
    });

    it('hides message input when configuring', () => {
      const state = createActiveState({ status: 'configuring' });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.queryByTestId('message-input-form')).not.toBeInTheDocument();
    });

    it('shows empty state when no messages and active', () => {
      const state = createActiveState({ messages: [] });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByText('Start the Discussion')).toBeInTheDocument();
      expect(screen.getByText(/Send your first message/)).toBeInTheDocument();
    });

    it('displays persona name in empty state', () => {
      const state = createActiveState({ messages: [] });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      // Multiple places may show persona name (session controls and empty state)
      const personaNames = screen.getAllByText(mockPersona.name);
      expect(personaNames.length).toBeGreaterThan(0);
    });
  });

  describe('Messages', () => {
    it('renders user messages aligned right', () => {
      const userMessage = createMessage({ id: 'user-1', role: 'user', content: 'User message' });
      const state = createActiveState({ messages: [userMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      const messageContainer = screen.getByTestId('chat-message-user-1');
      expect(messageContainer).toHaveClass('justify-end');
    });

    it('renders persona messages aligned left', () => {
      const personaMessage = createMessage({
        id: 'persona-1',
        role: 'persona',
        content: 'Persona message',
      });
      const state = createActiveState({ messages: [personaMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      const messageContainer = screen.getByTestId('chat-message-persona-1');
      expect(messageContainer).toHaveClass('justify-start');
    });

    it('displays message content', () => {
      const message = createMessage({ id: 'msg-1', content: 'This is my argument.' });
      const state = createActiveState({ messages: [message] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByText('This is my argument.')).toBeInTheDocument();
    });

    it('shows "You" for user messages', () => {
      const userMessage = createMessage({ id: 'user-1', role: 'user' });
      const state = createActiveState({ messages: [userMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByText('You')).toBeInTheDocument();
    });

    it('shows persona name for persona messages', () => {
      const personaMessage = createMessage({ id: 'persona-1', role: 'persona' });
      const state = createActiveState({ messages: [personaMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      // Should show the persona name in session controls and in the message
      const personaNames = screen.getAllByText(mockPersona.name);
      expect(personaNames.length).toBeGreaterThan(0);
    });

    it('shows typing indicator when generating response', () => {
      const state = createActiveState();
      render(
        <SimulatorChatInterface
          state={state}
          dispatch={mockDispatch}
          isGeneratingResponse={true}
        />,
      );

      expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    });
  });

  describe('Analysis', () => {
    const mockAnalysis = {
      fallacies: [
        { type: 'ad hominem', description: 'Test', excerpt: 'test', severity: 'minor' as const },
      ],
      unsupportedClaims: ['Claim 1'],
      toneScore: 75,
      evidenceScore: 60,
      coherenceScore: 80,
      suggestions: ['Add more evidence'],
    };

    it('shows analysis toggle for user messages with analysis', () => {
      const userMessage = createMessage({
        id: 'user-1',
        role: 'user',
        analysis: mockAnalysis,
      });
      const state = createActiveState({ messages: [userMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByRole('button', { name: /show analysis/i })).toBeInTheDocument();
    });

    it('does not show analysis toggle for persona messages', () => {
      const personaMessage = createMessage({
        id: 'persona-1',
        role: 'persona',
      });
      const state = createActiveState({ messages: [personaMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.queryByRole('button', { name: /show analysis/i })).not.toBeInTheDocument();
    });

    it('toggles analysis visibility on click', async () => {
      const user = userEvent.setup({ delay: null });
      const userMessage = createMessage({
        id: 'user-1',
        role: 'user',
        analysis: mockAnalysis,
      });
      const state = createActiveState({ messages: [userMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      // Initially hidden
      expect(screen.queryByTestId('analysis-mini-card')).not.toBeInTheDocument();

      // Click to show
      await user.click(screen.getByRole('button', { name: /show analysis/i }));
      expect(screen.getByTestId('analysis-mini-card')).toBeInTheDocument();

      // Click to hide
      await user.click(screen.getByRole('button', { name: /hide analysis/i }));
      expect(screen.queryByTestId('analysis-mini-card')).not.toBeInTheDocument();
    });

    it('displays analysis scores', async () => {
      const user = userEvent.setup({ delay: null });
      const userMessage = createMessage({
        id: 'user-1',
        role: 'user',
        analysis: mockAnalysis,
      });
      const state = createActiveState({ messages: [userMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      await user.click(screen.getByRole('button', { name: /show analysis/i }));

      // Average score should be (75 + 60 + 80) / 3 = 72
      expect(screen.getByText('72/100')).toBeInTheDocument();
    });

    it('shows fallacy count in analysis', async () => {
      const user = userEvent.setup({ delay: null });
      const userMessage = createMessage({
        id: 'user-1',
        role: 'user',
        analysis: mockAnalysis,
      });
      const state = createActiveState({ messages: [userMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      await user.click(screen.getByRole('button', { name: /show analysis/i }));

      expect(screen.getByText('1 fallacy')).toBeInTheDocument();
    });
  });

  describe('Message Input', () => {
    it('allows typing a message', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState();

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      const input = screen.getByTestId('message-input');
      await user.type(input, 'Hello, this is my argument');

      expect(input).toHaveValue('Hello, this is my argument');
    });

    it('dispatches ADD_USER_MESSAGE on form submit', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState();

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      const input = screen.getByTestId('message-input');
      await user.type(input, 'Test argument');

      const sendButton = screen.getByTestId('send-button');
      await user.click(sendButton);

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_USER_MESSAGE',
        payload: { content: 'Test argument' },
      });
    });

    it('submits on Enter key press', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState();

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      const input = screen.getByTestId('message-input');
      await user.type(input, 'Test argument{enter}');

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ADD_USER_MESSAGE',
        payload: { content: 'Test argument' },
      });
    });

    it('does not submit on Shift+Enter', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState();

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      const input = screen.getByTestId('message-input');
      await user.type(input, 'Line 1{shift>}{enter}{/shift}Line 2');

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(input).toHaveValue('Line 1\nLine 2');
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState();

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      const input = screen.getByTestId('message-input');
      await user.type(input, 'Test argument');
      await user.click(screen.getByTestId('send-button'));

      expect(input).toHaveValue('');
    });

    it('disables input when paused', () => {
      const state = createActiveState({ status: 'paused' });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByTestId('message-input')).toBeDisabled();
    });

    it('disables input when completed', () => {
      const state = createActiveState({ status: 'completed' });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByTestId('message-input')).toBeDisabled();
    });

    it('disables input when generating response', () => {
      const state = createActiveState();
      render(
        <SimulatorChatInterface
          state={state}
          dispatch={mockDispatch}
          isGeneratingResponse={true}
        />,
      );

      expect(screen.getByTestId('message-input')).toBeDisabled();
    });

    it('disables send button when input is empty', () => {
      const state = createActiveState();
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByTestId('send-button')).toBeDisabled();
    });

    it('does not dispatch on empty input', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState();

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      const input = screen.getByTestId('message-input');
      await user.type(input, '   '); // Only whitespace

      // Button should still be disabled for whitespace-only
      expect(screen.getByTestId('send-button')).toBeDisabled();
    });
  });

  describe('Session Controls', () => {
    it('shows exchange progress', () => {
      const state = createActiveState({ currentExchange: 3, maxExchanges: 10 });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByText('Exchange 3/10')).toBeInTheDocument();
    });

    it('shows conversation mode', () => {
      const state = createActiveState({ mode: 'socratic' });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByText('socratic')).toBeInTheDocument();
    });

    it('dispatches PAUSE_SIMULATION on pause click', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState();

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      await user.click(screen.getByTestId('pause-btn'));

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'PAUSE_SIMULATION' });
    });

    it('dispatches RESUME_SIMULATION on resume click', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState({ status: 'paused' });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      await user.click(screen.getByTestId('resume-btn'));

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'RESUME_SIMULATION' });
    });

    it('dispatches END_SIMULATION on end click', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState();

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      await user.click(screen.getByTestId('end-btn'));

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'END_SIMULATION' });
    });

    it('dispatches RESET_SIMULATION on new session click', async () => {
      const user = userEvent.setup({ delay: null });
      const state = createActiveState({ status: 'completed' });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      await user.click(screen.getByTestId('new-session-btn'));

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'RESET_SIMULATION' });
    });

    it('shows paused indicator when paused', () => {
      const state = createActiveState({ status: 'paused' });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByText('Paused')).toBeInTheDocument();
    });

    it('shows completed indicator when completed', () => {
      const state = createActiveState({ status: 'completed' });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });

  describe('Operation Queue', () => {
    it('shows operation queue when there are pending operations', () => {
      const operations: AIOperation[] = [
        {
          id: 'op-1',
          type: 'persona_response',
          status: 'active',
          label: 'Generating response...',
          startedAt: Date.now(),
        },
      ];
      const state = createActiveState({ pendingOperations: operations });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByTestId('operation-queue')).toBeInTheDocument();
      expect(screen.getByText('Generating response...')).toBeInTheDocument();
    });

    it('hides operation queue when no operations', () => {
      const state = createActiveState({ pendingOperations: [] });
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.queryByTestId('operation-queue')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label on chat container', () => {
      const state = createActiveState();
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByRole('log')).toHaveAttribute('aria-label', 'Chat messages');
    });

    it('has aria-live attribute for announcements', () => {
      const state = createActiveState();
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    });

    it('has proper aria-label on message input', () => {
      const state = createActiveState();
      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      expect(screen.getByTestId('message-input')).toHaveAttribute('aria-label', 'Message input');
    });

    it('has proper aria-expanded on analysis toggle', async () => {
      const user = userEvent.setup({ delay: null });
      const mockAnalysis = {
        fallacies: [],
        unsupportedClaims: [],
        toneScore: 80,
        evidenceScore: 70,
        coherenceScore: 85,
        suggestions: [],
      };
      const userMessage = createMessage({
        id: 'user-1',
        role: 'user',
        analysis: mockAnalysis,
      });
      const state = createActiveState({ messages: [userMessage] });

      render(<SimulatorChatInterface state={state} dispatch={mockDispatch} />);

      const toggleButton = screen.getByRole('button', { name: /show analysis/i });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggleButton);
      expect(screen.getByRole('button', { name: /hide analysis/i })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      const state = createActiveState();
      render(
        <SimulatorChatInterface state={state} dispatch={mockDispatch} className="custom-class" />,
      );

      expect(screen.getByTestId('simulator-chat-interface')).toHaveClass('custom-class');
    });
  });
});
