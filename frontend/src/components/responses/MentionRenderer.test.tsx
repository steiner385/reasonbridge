/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { MentionRenderer } from './MentionRenderer';

/**
 * Helper to render MentionRenderer with router context
 */
function renderWithRouter(content: string, className?: string) {
  return render(
    <MemoryRouter>
      <MentionRenderer content={content} className={className} />
    </MemoryRouter>,
  );
}

describe('MentionRenderer', () => {
  describe('rendering plain text', () => {
    it('should render plain text without mentions unchanged', () => {
      renderWithRouter('Hello, this is a plain text message.');

      expect(screen.getByText('Hello, this is a plain text message.')).toBeInTheDocument();
      expect(screen.queryByTestId('mention-link')).not.toBeInTheDocument();
    });

    it('should render empty content', () => {
      const { container } = renderWithRouter('');

      expect(container.querySelector('span')).toBeInTheDocument();
      expect(container.querySelector('span')?.textContent).toBe('');
    });

    it('should render content with @ symbol but not mention format', () => {
      renderWithRouter('Contact me at email@example.com');

      expect(screen.getByText('Contact me at email@example.com')).toBeInTheDocument();
      expect(screen.queryByTestId('mention-link')).not.toBeInTheDocument();
    });
  });

  describe('rendering single mention', () => {
    it('should render single mention with highlight style', () => {
      renderWithRouter('Hey @[John Doe](user-123), check this out!');

      const mentionLink = screen.getByTestId('mention-link');
      expect(mentionLink).toBeInTheDocument();
      expect(mentionLink).toHaveTextContent('@John Doe');
      expect(mentionLink).toHaveAttribute('href', '/profile/user-123');
    });

    it('should apply correct CSS classes to mention link', () => {
      renderWithRouter('Hello @[Jane Smith](user-456)');

      const mentionLink = screen.getByTestId('mention-link');
      expect(mentionLink.className).toContain('text-primary-600');
      expect(mentionLink.className).toContain('dark:text-primary-400');
      expect(mentionLink.className).toContain('font-medium');
      expect(mentionLink.className).toContain('hover:underline');
    });

    it('should render mention at the start of content', () => {
      const { container } = renderWithRouter('@[Alice](user-1) started the discussion.');

      expect(screen.getByTestId('mention-link')).toHaveTextContent('@Alice');
      // Check that the full text content is present in the wrapper span
      expect(container.querySelector('span')?.textContent).toBe('@Alice started the discussion.');
    });

    it('should render mention at the end of content', () => {
      renderWithRouter('This was mentioned by @[Bob](user-2)');

      expect(screen.getByTestId('mention-link')).toHaveTextContent('@Bob');
      expect(screen.getByText('This was mentioned by', { exact: false })).toBeInTheDocument();
    });
  });

  describe('rendering multiple mentions', () => {
    it('should render multiple mentions correctly', () => {
      renderWithRouter(
        'Hey @[Alice](user-1) and @[Bob](user-2), what do you think about @[Charlie](user-3)?',
      );

      const mentionLinks = screen.getAllByTestId('mention-link');
      expect(mentionLinks).toHaveLength(3);

      expect(mentionLinks[0]).toHaveTextContent('@Alice');
      expect(mentionLinks[0]).toHaveAttribute('href', '/profile/user-1');

      expect(mentionLinks[1]).toHaveTextContent('@Bob');
      expect(mentionLinks[1]).toHaveAttribute('href', '/profile/user-2');

      expect(mentionLinks[2]).toHaveTextContent('@Charlie');
      expect(mentionLinks[2]).toHaveAttribute('href', '/profile/user-3');
    });

    it('should preserve text between mentions', () => {
      const { container } = renderWithRouter(
        '@[First](u1) some text @[Second](u2) more text @[Third](u3)',
      );

      const mentionLinks = screen.getAllByTestId('mention-link');
      expect(mentionLinks).toHaveLength(3);

      // Check that text between mentions is preserved - use wrapper span's textContent
      expect(container.querySelector('span')?.textContent).toBe(
        '@First some text @Second more text @Third',
      );
    });

    it('should render consecutive mentions without text between them', () => {
      renderWithRouter('@[User1](id1)@[User2](id2)');

      const mentionLinks = screen.getAllByTestId('mention-link');
      expect(mentionLinks).toHaveLength(2);
      expect(mentionLinks[0]).toHaveTextContent('@User1');
      expect(mentionLinks[1]).toHaveTextContent('@User2');
    });
  });

  describe('link navigation', () => {
    it('should link to correct user profile path', () => {
      renderWithRouter('Hello @[Test User](test-user-id-123)');

      const mentionLink = screen.getByTestId('mention-link');
      expect(mentionLink).toHaveAttribute('href', '/profile/test-user-id-123');
    });

    it('should include user ID as data attribute', () => {
      renderWithRouter('Hello @[Someone](some-user-id)');

      const mentionLink = screen.getByTestId('mention-link');
      expect(mentionLink).toHaveAttribute('data-user-id', 'some-user-id');
    });

    it('should handle UUIDs as user IDs', () => {
      renderWithRouter('Mentioned @[UUID User](550e8400-e29b-41d4-a716-446655440000)');

      const mentionLink = screen.getByTestId('mention-link');
      expect(mentionLink).toHaveAttribute('href', '/profile/550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('display name handling', () => {
    it('should handle display names with spaces', () => {
      renderWithRouter('@[John Middle Doe](user-1)');

      expect(screen.getByTestId('mention-link')).toHaveTextContent('@John Middle Doe');
    });

    it('should handle display names with special characters', () => {
      renderWithRouter("@[O'Brien-Smith](user-1)");

      expect(screen.getByTestId('mention-link')).toHaveTextContent("@O'Brien-Smith");
    });

    it('should handle display names with numbers', () => {
      renderWithRouter('@[User123](user-1)');

      expect(screen.getByTestId('mention-link')).toHaveTextContent('@User123');
    });

    it('should handle unicode characters in display names', () => {
      renderWithRouter('@[José García](user-1)');

      expect(screen.getByTestId('mention-link')).toHaveTextContent('@José García');
    });
  });

  describe('className prop', () => {
    it('should apply className to wrapper span', () => {
      const { container } = renderWithRouter('Hello world', 'custom-class text-lg');

      const span = container.querySelector('span');
      expect(span).toHaveClass('custom-class');
      expect(span).toHaveClass('text-lg');
    });

    it('should work with empty className', () => {
      const { container } = renderWithRouter('Hello world', '');

      const span = container.querySelector('span');
      expect(span).toBeInTheDocument();
    });

    it('should apply className when content has mentions', () => {
      const { container } = renderWithRouter('Hey @[User](u1)', 'prose prose-sm');

      const span = container.querySelector('span');
      expect(span).toHaveClass('prose');
      expect(span).toHaveClass('prose-sm');
    });
  });

  describe('dark mode support', () => {
    it('should include dark mode classes on mention links', () => {
      renderWithRouter('Hello @[Dark Mode User](user-dark)');

      const mentionLink = screen.getByTestId('mention-link');
      expect(mentionLink.className).toContain('dark:text-primary-400');
    });
  });

  describe('edge cases', () => {
    it('should handle malformed mentions gracefully', () => {
      // Missing closing bracket
      renderWithRouter('Hello @[User(user-id) world');

      expect(screen.queryByTestId('mention-link')).not.toBeInTheDocument();
      expect(screen.getByText('Hello @[User(user-id) world')).toBeInTheDocument();
    });

    it('should handle partial mention syntax', () => {
      // Only @ symbol with brackets but no parentheses
      renderWithRouter('Hello @[Name] world');

      expect(screen.queryByTestId('mention-link')).not.toBeInTheDocument();
    });

    it('should not match empty display name (requires at least one character)', () => {
      // The regex requires at least one character in display name
      renderWithRouter('Hello @[](user-id) world');

      expect(screen.queryByTestId('mention-link')).not.toBeInTheDocument();
      expect(screen.getByText('Hello @[](user-id) world')).toBeInTheDocument();
    });

    it('should not match empty user ID (requires at least one character)', () => {
      // The regex requires at least one character in user ID
      renderWithRouter('Hello @[Name]() world');

      expect(screen.queryByTestId('mention-link')).not.toBeInTheDocument();
      expect(screen.getByText('Hello @[Name]() world')).toBeInTheDocument();
    });

    it('should handle multiple renders without state leakage', () => {
      // First render
      const { unmount } = renderWithRouter('@[User1](id1)');
      expect(screen.getByTestId('mention-link')).toHaveTextContent('@User1');
      unmount();

      // Second render with different content
      renderWithRouter('@[User2](id2)');
      expect(screen.getByTestId('mention-link')).toHaveTextContent('@User2');
    });

    it('should handle newlines in content', () => {
      renderWithRouter('Line 1\n@[User](id)\nLine 3');

      expect(screen.getByTestId('mention-link')).toHaveTextContent('@User');
    });
  });
});
