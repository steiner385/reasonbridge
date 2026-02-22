/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SimulatorChatInterface - Main chat UI for persona-based discussion simulation
 *
 * This is the core chat interface for the Discussion Simulator where:
 * - User messages appear on the right
 * - AI/Persona messages appear on the left
 * - Real-time argument analysis is shown inline
 * - Session controls at the top
 * - Chat input at the bottom
 *
 * @module components/simulator/SimulatorChatInterface
 */

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import type {
  SimulationState,
  SimulationAction,
  SimulationConversationMessage,
  ArgumentAnalysis,
  SimulationPersona,
} from '../../types/simulator';
import { ChatMessageSkeleton } from '../ui/skeletons';
import OperationQueue from '../ui/OperationQueue';
import Button from '../ui/Button';

/**
 * Props for the SimulatorChatInterface component
 */
export interface SimulatorChatInterfaceProps {
  /** Current simulation state */
  state: SimulationState;
  /** Dispatch actions to update state */
  dispatch: (action: SimulationAction) => void;
  /** Whether AI is currently generating a response */
  isGeneratingResponse?: boolean;
  /** Callback to retry a failed operation */
  onRetryOperation?: (operationId: string) => void;
  /** Callback to dismiss a completed/failed operation */
  onDismissOperation?: (operationId: string) => void;
  /** Custom className */
  className?: string;
}

/**
 * Props for individual chat message component
 */
interface ChatMessageProps {
  message: SimulationConversationMessage;
  persona?: SimulationPersona | null;
  showAnalysis: boolean;
  onToggleAnalysis: () => void;
}

/**
 * Props for the message input component
 */
interface MessageInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
  placeholder?: string;
}

/**
 * Analysis mini-card component
 */
interface AnalysisMiniCardProps {
  analysis: ArgumentAnalysis;
}

/**
 * Formats a timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * AnalysisMiniCard - Compact inline analysis display
 */
const AnalysisMiniCard: React.FC<AnalysisMiniCardProps> = ({ analysis }) => {
  const avgScore = Math.round(
    (analysis.toneScore + analysis.evidenceScore + analysis.coherenceScore) / 3,
  );

  const scoreColor =
    avgScore >= 70
      ? 'text-green-600 dark:text-green-400'
      : avgScore >= 50
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <div
      className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm"
      data-testid="analysis-mini-card"
    >
      <div className="flex flex-wrap items-center gap-3 mb-2">
        {/* Scores summary */}
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">Score:</span>
          <span className={`font-semibold ${scoreColor}`}>{avgScore}/100</span>
        </div>

        {/* Fallacies indicator */}
        {analysis.fallacies.length > 0 && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>
              {analysis.fallacies.length} fallac{analysis.fallacies.length === 1 ? 'y' : 'ies'}
            </span>
          </div>
        )}

        {/* Unsupported claims indicator */}
        {analysis.unsupportedClaims.length > 0 && (
          <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{analysis.unsupportedClaims.length} unsupported</span>
          </div>
        )}
      </div>

      {/* Suggestions preview */}
      {analysis.suggestions.length > 0 && (
        <div className="text-gray-600 dark:text-gray-300">
          <span className="text-gray-500 dark:text-gray-400">Tip: </span>
          {analysis.suggestions[0]}
        </div>
      )}
    </div>
  );
};

/**
 * ChatMessage - Individual message bubble with optional analysis
 */
const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  persona,
  showAnalysis,
  onToggleAnalysis,
}) => {
  const isUser = message.role === 'user';
  const hasAnalysis = message.analysis && isUser;

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      data-testid={`chat-message-${message.id}`}
    >
      <div
        className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar */}
        <div
          className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
            isUser ? 'bg-blue-500 dark:bg-blue-600' : 'bg-purple-500 dark:bg-purple-600'
          }`}
          aria-hidden="true"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={
                isUser
                  ? 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                  : 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
              }
            />
          </svg>
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Name and timestamp */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isUser ? 'You' : (persona?.name ?? 'AI Persona')}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>

          {/* Message bubble */}
          <div
            className={`rounded-lg p-4 ${
              isUser
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          </div>

          {/* Analysis toggle for user messages */}
          {hasAnalysis && (
            <button
              onClick={onToggleAnalysis}
              className="mt-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center gap-1"
              aria-expanded={showAnalysis}
              aria-controls={`analysis-${message.id}`}
            >
              {showAnalysis ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  Hide analysis
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                  Show analysis
                </>
              )}
            </button>
          )}

          {/* Inline analysis display */}
          {showAnalysis && message.analysis && (
            <div id={`analysis-${message.id}`} className={isUser ? 'w-full' : ''}>
              <AnalysisMiniCard analysis={message.analysis} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * MessageInput - Chat input form
 */
const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled,
  placeholder = 'Type your argument...',
}) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedValue = inputValue.trim();
      if (trimmedValue && !disabled) {
        onSend(trimmedValue);
        setInputValue('');
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    },
    [inputValue, disabled, onSend],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Submit on Enter (without Shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit],
  );

  // Auto-resize textarea
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    setInputValue(textarea.value);
    // Reset height to auto to calculate new height
    textarea.style.height = 'auto';
    // Set height to scrollHeight (capped at 200px)
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-3 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700"
      data-testid="message-input-form"
    >
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="
            w-full px-4 py-3 pr-12 rounded-lg
            border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-gray-100
            placeholder-gray-400 dark:placeholder-gray-500
            focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            resize-none min-h-[48px] max-h-[200px]
            transition-colors
          "
          rows={1}
          aria-label="Message input"
          data-testid="message-input"
        />
        <span className="absolute right-3 bottom-3 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
          {inputValue.length > 0 && `${inputValue.length}`}
        </span>
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={disabled || !inputValue.trim()}
        className="flex-shrink-0"
        aria-label="Send message"
        data-testid="send-button"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
      </Button>
    </form>
  );
};

/**
 * SessionControls - Top bar with session info and controls
 */
interface SessionControlsProps {
  state: SimulationState;
  dispatch: (action: SimulationAction) => void;
}

const SessionControls: React.FC<SessionControlsProps> = ({ state, dispatch }) => {
  const handlePause = useCallback(() => {
    dispatch({ type: 'PAUSE_SIMULATION' });
  }, [dispatch]);

  const handleResume = useCallback(() => {
    dispatch({ type: 'RESUME_SIMULATION' });
  }, [dispatch]);

  const handleEnd = useCallback(() => {
    dispatch({ type: 'END_SIMULATION' });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET_SIMULATION' });
  }, [dispatch]);

  const exchangeProgress = `${state.currentExchange}/${state.maxExchanges}`;
  const isPaused = state.status === 'paused';
  const isCompleted = state.status === 'completed';

  return (
    <div
      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      data-testid="session-controls"
    >
      {/* Left: Session info */}
      <div className="flex items-center gap-4">
        {/* Persona badge */}
        {state.persona && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500 dark:bg-purple-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {state.persona.name}
            </span>
          </div>
        )}

        {/* Exchange counter */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-200 dark:bg-gray-700">
          <svg
            className="w-4 h-4 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Exchange {exchangeProgress}
          </span>
        </div>

        {/* Mode badge */}
        <span className="text-xs px-2 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 capitalize">
          {state.mode.replace('_', ' ')}
        </span>

        {/* Status indicator */}
        {isPaused && (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            Paused
          </span>
        )}

        {isCompleted && (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            Completed
          </span>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        {!isCompleted && (
          <>
            {isPaused ? (
              <Button variant="secondary" size="sm" onClick={handleResume} data-testid="resume-btn">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Resume
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={handlePause} data-testid="pause-btn">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Pause
              </Button>
            )}
            <Button variant="danger" size="sm" onClick={handleEnd} data-testid="end-btn">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              End
            </Button>
          </>
        )}

        {isCompleted && (
          <Button variant="primary" size="sm" onClick={handleReset} data-testid="new-session-btn">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            New Session
          </Button>
        )}
      </div>
    </div>
  );
};

/**
 * EmptyState - Shown when there are no messages yet
 */
const EmptyState: React.FC<{ personaName?: string }> = ({ personaName }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4 py-12">
    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
      <svg
        className="w-8 h-8 text-gray-400 dark:text-gray-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
      Start the Discussion
    </h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
      Send your first message to begin debating with{' '}
      <span className="font-medium text-gray-700 dark:text-gray-300">
        {personaName ?? 'the AI persona'}
      </span>
      . Make your argument clear and support it with evidence.
    </p>
  </div>
);

/**
 * SimulatorChatInterface - Main chat UI for persona-based discussion simulation
 *
 * @remarks
 * This component provides the core chat experience for the Discussion Simulator:
 *
 * - **Message Layout**: User messages right-aligned with blue bubbles, persona
 *   messages left-aligned with gray bubbles
 * - **Session Controls**: Top bar showing persona name, exchange count, mode,
 *   and pause/resume/end buttons
 * - **Typing Indicator**: Shows animated skeleton when AI is generating response
 * - **Inline Analysis**: Expandable analysis cards for user messages
 * - **Auto-scroll**: Automatically scrolls to new messages
 * - **Operation Queue**: Shows active AI operations at bottom
 *
 * **Accessibility Features:**
 * - ARIA labels for all interactive elements
 * - Keyboard navigation (Enter to send, Shift+Enter for newline)
 * - Screen reader announcements for new messages
 * - Focus management
 *
 * @example
 * ```tsx
 * const [state, dispatch] = useReducer(simulationReducer, initialState);
 *
 * <SimulatorChatInterface
 *   state={state}
 *   dispatch={dispatch}
 *   isGeneratingResponse={isLoading}
 * />
 * ```
 */
export const SimulatorChatInterface: React.FC<SimulatorChatInterfaceProps> = ({
  state,
  dispatch,
  isGeneratingResponse = false,
  onRetryOperation,
  onDismissOperation,
  className = '',
}) => {
  const chatContainerId = useId();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [expandedAnalysis, setExpandedAnalysis] = useState<Set<string>>(new Set());

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages, isGeneratingResponse]);

  // Handle sending a message
  const handleSendMessage = useCallback(
    (content: string) => {
      dispatch({ type: 'ADD_USER_MESSAGE', payload: { content } });
    },
    [dispatch],
  );

  // Toggle analysis visibility for a message
  const toggleAnalysis = useCallback((messageId: string) => {
    setExpandedAnalysis((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  // Determine if input should be disabled
  const isInputDisabled =
    state.status === 'paused' ||
    state.status === 'completed' ||
    state.status === 'configuring' ||
    isGeneratingResponse;

  // Get input placeholder based on state
  const getPlaceholder = (): string => {
    if (state.status === 'paused') {
      return 'Simulation paused...';
    }
    if (state.status === 'completed') {
      return 'Simulation completed. Start a new session to continue.';
    }
    if (state.status === 'configuring') {
      return 'Configure your simulation to start...';
    }
    if (isGeneratingResponse) {
      return 'Waiting for persona response...';
    }
    return 'Type your argument... (Enter to send, Shift+Enter for newline)';
  };

  const hasMessages = state.messages.length > 0;

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}
      data-testid="simulator-chat-interface"
    >
      {/* Session controls */}
      {state.status !== 'configuring' && <SessionControls state={state} dispatch={dispatch} />}

      {/* Operation queue */}
      {state.pendingOperations.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <OperationQueue
            operations={state.pendingOperations}
            onRetry={onRetryOperation}
            onDismiss={onDismissOperation}
          />
        </div>
      )}

      {/* Messages area */}
      <div
        id={chatContainerId}
        className="flex-1 overflow-y-auto p-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {!hasMessages && state.status === 'active' && !isGeneratingResponse ? (
          <EmptyState personaName={state.persona?.name} />
        ) : (
          <div className="space-y-2">
            {state.messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                persona={state.persona}
                showAnalysis={expandedAnalysis.has(message.id)}
                onToggleAnalysis={() => toggleAnalysis(message.id)}
              />
            ))}

            {/* Typing indicator when AI is responding */}
            {isGeneratingResponse && (
              <ChatMessageSkeleton
                isPersona={true}
                showTypingIndicator={true}
                data-testid="typing-indicator"
              />
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Message input */}
      {state.status !== 'configuring' && (
        <MessageInput
          onSend={handleSendMessage}
          disabled={isInputDisabled}
          placeholder={getPlaceholder()}
        />
      )}
    </div>
  );
};

export default SimulatorChatInterface;
