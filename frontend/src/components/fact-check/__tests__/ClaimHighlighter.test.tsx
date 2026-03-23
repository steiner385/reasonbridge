/**
 * Unit tests for ClaimHighlighter component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClaimHighlighter from '../ClaimHighlighter';
import type { Claim } from '../../../types/factCheck';

describe('ClaimHighlighter', () => {
  describe('Rendering without claims', () => {
    it('should render content without highlights when claims is null', () => {
      render(<ClaimHighlighter content="Some plain text content." claims={null} />);

      expect(screen.getByText('Some plain text content.')).toBeInTheDocument();
    });

    it('should render content without highlights when claims is empty array', () => {
      render(<ClaimHighlighter content="Some plain text content." claims={[]} />);

      expect(screen.getByText('Some plain text content.')).toBeInTheDocument();
      expect(screen.queryByTestId('highlighted-claim')).not.toBeInTheDocument();
    });
  });

  describe('Highlighting claims', () => {
    it('should highlight claims with dotted underline', () => {
      const claims: Claim[] = [{ text: 'factual claim', startOffset: 5, endOffset: 18 }];

      render(<ClaimHighlighter content="Some factual claim here." claims={claims} />);

      const highlightedClaim = screen.getByTestId('highlighted-claim');
      expect(highlightedClaim).toHaveTextContent('factual claim');
      expect(highlightedClaim).toHaveClass('border-dotted', 'border-blue-500');
    });

    it('should render text before and after claim', () => {
      const claims: Claim[] = [{ text: 'middle', startOffset: 5, endOffset: 11 }];

      render(<ClaimHighlighter content="Some middle text." claims={claims} />);

      // Should have the full content rendered
      const container = screen.getByTestId('claim-highlighter');
      expect(container).toHaveTextContent('Some middle text.');

      // Claim should be highlighted
      const highlightedClaim = screen.getByTestId('highlighted-claim');
      expect(highlightedClaim).toHaveTextContent('middle');
    });

    it('should highlight multiple non-overlapping claims', () => {
      const claims: Claim[] = [
        { text: 'first', startOffset: 0, endOffset: 5 },
        { text: 'second', startOffset: 10, endOffset: 16 },
      ];

      render(<ClaimHighlighter content="first and second claims" claims={claims} />);

      const highlighted = screen.getAllByTestId('highlighted-claim');
      expect(highlighted).toHaveLength(2);
      expect(highlighted[0]).toHaveTextContent('first');
      expect(highlighted[1]).toHaveTextContent('second');
    });
  });

  describe('Merging overlapping claims', () => {
    it('should merge overlapping claims into single highlight', () => {
      const claims: Claim[] = [
        { text: 'overlapping', startOffset: 0, endOffset: 11 },
        { text: 'claims', startOffset: 8, endOffset: 17 },
      ];

      render(<ClaimHighlighter content="overlapping claims text" claims={claims} />);

      const highlighted = screen.getAllByTestId('highlighted-claim');
      // Should merge into single highlight
      expect(highlighted).toHaveLength(1);
      expect(highlighted[0]).toHaveTextContent('overlapping claim');
    });

    it('should merge adjacent claims', () => {
      const claims: Claim[] = [
        { text: 'first', startOffset: 0, endOffset: 5 },
        { text: 'second', startOffset: 5, endOffset: 11 },
      ];

      render(<ClaimHighlighter content="firstsecond rest" claims={claims} />);

      const highlighted = screen.getAllByTestId('highlighted-claim');
      expect(highlighted).toHaveLength(1);
      expect(highlighted[0]).toHaveTextContent('firstsecond');
    });

    it('should handle claims sorted in reverse order', () => {
      const claims: Claim[] = [
        { text: 'second', startOffset: 10, endOffset: 16 },
        { text: 'first', startOffset: 0, endOffset: 5 },
      ];

      render(<ClaimHighlighter content="first and second" claims={claims} />);

      const highlighted = screen.getAllByTestId('highlighted-claim');
      expect(highlighted).toHaveLength(2);
      expect(highlighted[0]).toHaveTextContent('first');
      expect(highlighted[1]).toHaveTextContent('second');
    });
  });

  describe('Interactions', () => {
    it('should call onClaimClick when claim is clicked', async () => {
      const onClaimClick = vi.fn();
      const claims: Claim[] = [{ text: 'clickable', startOffset: 0, endOffset: 9 }];

      render(
        <ClaimHighlighter content="clickable text" claims={claims} onClaimClick={onClaimClick} />,
      );

      await userEvent.click(screen.getByTestId('highlighted-claim'));
      expect(onClaimClick).toHaveBeenCalledWith(claims[0]);
    });

    it('should have cursor-pointer on highlighted claims', () => {
      const claims: Claim[] = [{ text: 'hover me', startOffset: 0, endOffset: 8 }];

      render(<ClaimHighlighter content="hover me" claims={claims} />);

      const highlighted = screen.getByTestId('highlighted-claim');
      expect(highlighted).toHaveClass('cursor-pointer');
    });
  });

  describe('Keyboard accessibility', () => {
    it('should have role button on highlighted claims', () => {
      const claims: Claim[] = [{ text: 'accessible', startOffset: 0, endOffset: 10 }];

      render(<ClaimHighlighter content="accessible text" claims={claims} />);

      const highlighted = screen.getByTestId('highlighted-claim');
      expect(highlighted).toHaveAttribute('role', 'button');
    });

    it('should have tabIndex 0 for keyboard focus', () => {
      const claims: Claim[] = [{ text: 'focusable', startOffset: 0, endOffset: 9 }];

      render(<ClaimHighlighter content="focusable text" claims={claims} />);

      const highlighted = screen.getByTestId('highlighted-claim');
      expect(highlighted).toHaveAttribute('tabIndex', '0');
    });

    it('should trigger click on Enter key', async () => {
      const onClaimClick = vi.fn();
      const claims: Claim[] = [{ text: 'enter', startOffset: 0, endOffset: 5 }];

      render(<ClaimHighlighter content="enter text" claims={claims} onClaimClick={onClaimClick} />);

      const highlighted = screen.getByTestId('highlighted-claim');
      highlighted.focus();
      await userEvent.keyboard('{Enter}');

      expect(onClaimClick).toHaveBeenCalledWith(claims[0]);
    });

    it('should trigger click on Space key', async () => {
      const onClaimClick = vi.fn();
      const claims: Claim[] = [{ text: 'space', startOffset: 0, endOffset: 5 }];

      render(<ClaimHighlighter content="space text" claims={claims} onClaimClick={onClaimClick} />);

      const highlighted = screen.getByTestId('highlighted-claim');
      highlighted.focus();
      await userEvent.keyboard(' ');

      expect(onClaimClick).toHaveBeenCalledWith(claims[0]);
    });
  });

  describe('Dark mode support', () => {
    it('should have dark mode hover styles', () => {
      const claims: Claim[] = [{ text: 'dark mode', startOffset: 0, endOffset: 9 }];

      render(<ClaimHighlighter content="dark mode test" claims={claims} />);

      const highlighted = screen.getByTestId('highlighted-claim');
      expect(highlighted).toHaveClass('dark:hover:bg-blue-900/20');
    });
  });

  describe('Tooltip', () => {
    it('should have title attribute for tooltip', () => {
      const claims: Claim[] = [{ text: 'tooltip', startOffset: 0, endOffset: 7 }];

      render(<ClaimHighlighter content="tooltip text" claims={claims} />);

      const highlighted = screen.getByTestId('highlighted-claim');
      expect(highlighted).toHaveAttribute('title', 'Related Context available');
    });
  });
});
