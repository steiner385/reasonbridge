/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageSkeleton } from './ChatMessageSkeleton';

describe('ChatMessageSkeleton', () => {
  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<ChatMessageSkeleton />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should render avatar skeleton', () => {
      render(<ChatMessageSkeleton />);
      const avatar = screen.getByTestId('chat-message-skeleton-avatar');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('rounded-full', 'animate-pulse');
    });

    it('should render name skeleton', () => {
      render(<ChatMessageSkeleton />);
      const name = screen.getByTestId('chat-message-skeleton-name');
      expect(name).toBeInTheDocument();
    });

    it('should render message bubble', () => {
      render(<ChatMessageSkeleton />);
      const bubble = screen.getByTestId('chat-message-skeleton-bubble');
      expect(bubble).toBeInTheDocument();
    });
  });

  describe('Typing Indicator', () => {
    it('should show typing indicator by default', () => {
      render(<ChatMessageSkeleton />);
      const typingIndicator = screen.getByTestId('chat-message-skeleton-typing-indicator');
      expect(typingIndicator).toBeInTheDocument();
    });

    it('should render 3 animated dots for typing indicator', () => {
      render(<ChatMessageSkeleton showTypingIndicator />);
      const typingIndicator = screen.getByTestId('chat-message-skeleton-typing-indicator');
      const dots = typingIndicator.querySelectorAll('span');
      expect(dots).toHaveLength(3);
    });

    it('should have staggered animation delays on dots', () => {
      render(<ChatMessageSkeleton showTypingIndicator />);
      const typingIndicator = screen.getByTestId('chat-message-skeleton-typing-indicator');
      const dots = typingIndicator.querySelectorAll('span');

      expect(dots[0]).toHaveStyle({ animationDelay: '0ms' });
      expect(dots[1]).toHaveStyle({ animationDelay: '150ms' });
      expect(dots[2]).toHaveStyle({ animationDelay: '300ms' });
    });

    it('should have bounce animation on dots', () => {
      render(<ChatMessageSkeleton showTypingIndicator />);
      const typingIndicator = screen.getByTestId('chat-message-skeleton-typing-indicator');
      const dots = typingIndicator.querySelectorAll('span');

      dots.forEach((dot) => {
        expect(dot).toHaveClass('animate-bounce');
      });
    });

    it('should hide typing indicator when showTypingIndicator is false', () => {
      render(<ChatMessageSkeleton showTypingIndicator={false} />);
      const typingIndicator = screen.queryByTestId('chat-message-skeleton-typing-indicator');
      expect(typingIndicator).not.toBeInTheDocument();
    });

    it('should show content skeleton when typing indicator is hidden', () => {
      render(<ChatMessageSkeleton showTypingIndicator={false} />);
      const content = screen.getByTestId('chat-message-skeleton-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Message Alignment', () => {
    it('should be left-aligned for persona messages (default)', () => {
      render(<ChatMessageSkeleton />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      expect(skeleton).toHaveClass('justify-start');
    });

    it('should be left-aligned when isPersona is true', () => {
      render(<ChatMessageSkeleton isPersona />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      expect(skeleton).toHaveClass('justify-start');
    });

    it('should be right-aligned for user messages', () => {
      render(<ChatMessageSkeleton isPersona={false} />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      expect(skeleton).toHaveClass('justify-end');
    });

    it('should reverse flex direction for user messages', () => {
      render(<ChatMessageSkeleton isPersona={false} />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      const innerContainer = skeleton.querySelector('.flex.items-start.gap-3');
      expect(innerContainer).toHaveClass('flex-row-reverse');
    });
  });

  describe('Message Bubble Styling', () => {
    it('should have gray background for persona messages', () => {
      render(<ChatMessageSkeleton isPersona />);
      const bubble = screen.getByTestId('chat-message-skeleton-bubble');
      expect(bubble).toHaveClass('bg-gray-100');
    });

    it('should have blue background for user messages', () => {
      render(<ChatMessageSkeleton isPersona={false} />);
      const bubble = screen.getByTestId('chat-message-skeleton-bubble');
      expect(bubble).toHaveClass('bg-blue-100');
    });
  });

  describe('Accessibility', () => {
    it('should have role="status" on container', () => {
      render(<ChatMessageSkeleton />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      expect(skeleton).toHaveAttribute('role', 'status');
    });

    it('should have multiple status elements for accessibility', () => {
      render(<ChatMessageSkeleton />);
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });

    it('should have aria-busy attribute', () => {
      render(<ChatMessageSkeleton />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      expect(skeleton).toHaveAttribute('aria-busy', 'true');
    });

    it('should have aria-label for persona message', () => {
      render(<ChatMessageSkeleton isPersona />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading persona message');
    });

    it('should have aria-label for user message', () => {
      render(<ChatMessageSkeleton isPersona={false} />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      expect(skeleton).toHaveAttribute('aria-label', 'Loading user message');
    });

    it('should have aria-hidden on avatar', () => {
      render(<ChatMessageSkeleton />);
      const avatar = screen.getByTestId('chat-message-skeleton-avatar');
      expect(avatar).toHaveAttribute('aria-hidden', 'true');
    });

    it('should have aria-hidden on typing indicator dots', () => {
      render(<ChatMessageSkeleton showTypingIndicator />);
      const typingIndicator = screen.getByTestId('chat-message-skeleton-typing-indicator');
      const dots = typingIndicator.querySelectorAll('span');

      dots.forEach((dot) => {
        expect(dot).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<ChatMessageSkeleton className="my-custom-class" />);
      const skeleton = screen.getByTestId('chat-message-skeleton');
      expect(skeleton).toHaveClass('my-custom-class');
    });

    it('should accept custom data-testid', () => {
      render(<ChatMessageSkeleton data-testid="custom-skeleton" />);
      const skeleton = screen.getByTestId('custom-skeleton');
      expect(skeleton).toBeInTheDocument();
    });

    it('should propagate custom testid to child elements', () => {
      render(<ChatMessageSkeleton data-testid="custom" />);
      expect(screen.getByTestId('custom-avatar')).toBeInTheDocument();
      expect(screen.getByTestId('custom-name')).toBeInTheDocument();
      expect(screen.getByTestId('custom-bubble')).toBeInTheDocument();
    });
  });

  describe('Dark Mode Support', () => {
    it('should have dark mode classes on avatar', () => {
      render(<ChatMessageSkeleton />);
      const avatar = screen.getByTestId('chat-message-skeleton-avatar');
      expect(avatar.className).toMatch(/dark:bg-gray-700/);
    });

    it('should have dark mode classes on persona bubble', () => {
      render(<ChatMessageSkeleton isPersona />);
      const bubble = screen.getByTestId('chat-message-skeleton-bubble');
      expect(bubble.className).toMatch(/dark:bg-gray-800/);
    });

    it('should have dark mode classes on user bubble', () => {
      render(<ChatMessageSkeleton isPersona={false} />);
      const bubble = screen.getByTestId('chat-message-skeleton-bubble');
      expect(bubble.className).toMatch(/dark:bg-blue-900/);
    });
  });
});
