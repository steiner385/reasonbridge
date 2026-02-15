/**
 * Unit tests for FactCheckButton component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FactCheckButton from '../FactCheckButton';
import { factCheckService } from '../../../services/factCheckService';

// Mock the fact-check service
vi.mock('../../../services/factCheckService', () => ({
  factCheckService: {
    extractClaims: vi.fn(),
    checkClaims: vi.fn(),
  },
}));

const mockExtractClaims = factCheckService.extractClaims as ReturnType<typeof vi.fn>;
const mockCheckClaims = factCheckService.checkClaims as ReturnType<typeof vi.fn>;

describe('FactCheckButton', () => {
  const defaultProps = {
    responseId: 'response-123',
    content: 'The Earth is round. Studies show that 90% of scientists agree with climate change.',
  };

  const mockClaims = [
    { text: 'The Earth is round.', startOffset: 0, endOffset: 18 },
    {
      text: 'Studies show that 90% of scientists agree with climate change.',
      startOffset: 19,
      endOffset: 81,
    },
  ];

  const mockResults = [
    {
      id: 'result-1',
      claimText: 'The Earth is round.',
      displayedAs: 'Related Context',
      sources: [
        {
          provider: 'Snopes',
          url: 'https://snopes.com/earth-round',
          title: 'Is the Earth Round?',
          credibilityScore: 0.95,
          retrievedAt: '2025-01-15T12:00:00Z',
        },
      ],
      hasConflictingSources: false,
      expiresAt: '2025-01-16T12:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockExtractClaims.mockReturnValue(mockClaims);
    mockCheckClaims.mockResolvedValue({ results: mockResults, processingTimeMs: 150 });
  });

  describe('Rendering', () => {
    it('should render the button with default text', () => {
      render(<FactCheckButton {...defaultProps} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Find Context')).toBeInTheDocument();
    });

    it('should render compact button without text', () => {
      render(<FactCheckButton {...defaultProps} compact />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.queryByText('Find Context')).not.toBeInTheDocument();
    });

    it('should show search icon', () => {
      const { container } = render(<FactCheckButton {...defaultProps} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<FactCheckButton {...defaultProps} className="custom-class" />);
      expect(screen.getByRole('button').parentElement).toHaveClass('custom-class');
    });
  });

  describe('Interactions', () => {
    it('should show loading state when clicked', async () => {
      // Make checkClaims never resolve during this test
      mockCheckClaims.mockImplementation(() => new Promise(() => {}));

      render(<FactCheckButton {...defaultProps} />);
      await userEvent.click(screen.getByRole('button'));

      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should call factCheckService.extractClaims with content', async () => {
      render(<FactCheckButton {...defaultProps} />);
      await userEvent.click(screen.getByRole('button'));

      expect(mockExtractClaims).toHaveBeenCalledWith(defaultProps.content);
    });

    it('should call factCheckService.checkClaims with responseId and claims', async () => {
      render(<FactCheckButton {...defaultProps} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(mockCheckClaims).toHaveBeenCalledWith(defaultProps.responseId, mockClaims);
      });
    });

    it('should call onResults callback with results', async () => {
      const onResults = vi.fn();
      render(<FactCheckButton {...defaultProps} onResults={onResults} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onResults).toHaveBeenCalledWith(mockResults);
      });
    });

    it('should call onStatusChange callback', async () => {
      const onStatusChange = vi.fn();
      render(<FactCheckButton {...defaultProps} onStatusChange={onStatusChange} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('loading');
        expect(onStatusChange).toHaveBeenCalledWith('success');
      });
    });

    it('should be disabled when disabled prop is true', () => {
      render(<FactCheckButton {...defaultProps} disabled />);
      expect(screen.getByRole('button')).toBeDisabled();
    });
  });

  describe('No Results', () => {
    it('should show no results message when no claims extracted', async () => {
      mockExtractClaims.mockReturnValue([]);

      render(<FactCheckButton {...defaultProps} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('No related context found')).toBeInTheDocument();
      });
    });

    it('should show no results message when API returns empty results', async () => {
      mockCheckClaims.mockResolvedValue({ results: [], processingTimeMs: 50 });

      render(<FactCheckButton {...defaultProps} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('No related context found')).toBeInTheDocument();
      });
    });

    it('should call onResults with empty array when no claims', async () => {
      mockExtractClaims.mockReturnValue([]);
      const onResults = vi.fn();

      render(<FactCheckButton {...defaultProps} onResults={onResults} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onResults).toHaveBeenCalledWith([]);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message on API failure', async () => {
      mockCheckClaims.mockRejectedValue(new Error('API Error'));

      render(<FactCheckButton {...defaultProps} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('API Error');
      });
    });

    it('should show Retry button after error', async () => {
      mockCheckClaims.mockRejectedValue(new Error('API Error'));

      render(<FactCheckButton {...defaultProps} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should call onStatusChange with error status', async () => {
      mockCheckClaims.mockRejectedValue(new Error('API Error'));
      const onStatusChange = vi.fn();

      render(<FactCheckButton {...defaultProps} onStatusChange={onStatusChange} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(onStatusChange).toHaveBeenCalledWith('error');
      });
    });
  });

  describe('After Success', () => {
    it('should show Check Again button after successful check', async () => {
      render(<FactCheckButton {...defaultProps} />);
      await userEvent.click(screen.getByRole('button'));

      await waitFor(() => {
        expect(screen.getByText('Check Again')).toBeInTheDocument();
      });
    });

    it('should allow re-checking after success', async () => {
      render(<FactCheckButton {...defaultProps} />);

      // First check
      await userEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Check Again')).toBeInTheDocument();
      });

      // Second check
      await userEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(mockCheckClaims).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label in compact mode', () => {
      render(<FactCheckButton {...defaultProps} compact />);
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Find related context for this response',
      );
    });

    it('should have title in compact mode', () => {
      render(<FactCheckButton {...defaultProps} compact />);
      expect(screen.getByRole('button')).toHaveAttribute('title', 'Find related context');
    });
  });
});
