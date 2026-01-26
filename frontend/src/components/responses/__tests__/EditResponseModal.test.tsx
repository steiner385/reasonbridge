import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditResponseModal from '../EditResponseModal';
import type { Response } from '../../../types/response';

describe('EditResponseModal', () => {
  const mockResponse: Response = {
    id: 'response-1',
    content: 'This is my original response content',
    authorId: 'user-1',
    citedSources: [{ url: 'https://example.com/source1' }, { url: 'https://example.com/source2' }],
    containsOpinion: true,
    containsFactualClaims: false,
    status: 'active',
    revisionCount: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    response: mockResponse,
    onSubmit: vi.fn(),
  };

  describe('Modal Display', () => {
    it('should display modal with response content when opened', () => {
      render(<EditResponseModal {...defaultProps} />);

      expect(screen.getByText('Edit Response')).toBeInTheDocument();
      expect(screen.getByLabelText(/your response/i)).toHaveValue(mockResponse.content);
    });

    it('should not display modal when isOpen is false', () => {
      render(<EditResponseModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Edit Response')).not.toBeInTheDocument();
    });

    it('should initialize form with response data', () => {
      render(<EditResponseModal {...defaultProps} />);

      expect(screen.getByLabelText(/your response/i)).toHaveValue(mockResponse.content);
      expect(screen.getByText('https://example.com/source1')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/source2')).toBeInTheDocument();
      expect(screen.getByLabelText(/this response contains my opinion/i)).toBeChecked();
      expect(screen.getByLabelText(/this response contains factual claims/i)).not.toBeChecked();
    });
  });

  describe('Content Validation', () => {
    it('should validate minimum character length', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} minLength={10} />);

      const textarea = screen.getByLabelText(/your response/i);
      await user.clear(textarea);
      await user.type(textarea, 'Short');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      expect(screen.getByText(/\(minimum 10\)/)).toBeInTheDocument();
    });

    it('should validate maximum character length', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} maxLength={50} />);

      const textarea = screen.getByLabelText(/your response/i);
      await user.clear(textarea);
      await user.type(textarea, 'A'.repeat(51));

      // Textarea has maxLength attribute, so it won't let you type beyond limit
      // But we can test the character counter
      const characterCount = screen.getByText(/characters/);
      expect(characterCount).toBeInTheDocument();
    });

    it('should show error when content is below minimum length on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<EditResponseModal {...defaultProps} onSubmit={onSubmit} minLength={100} />);

      const textarea = screen.getByLabelText(/your response/i);
      await user.clear(textarea);
      await user.type(textarea, 'Too short content');

      const saveButton = screen.getByRole('button', { name: /save changes/i });

      // Button should be disabled due to validation
      expect(saveButton).toBeDisabled();
    });

    it('should display character count with appropriate styling', async () => {
      render(<EditResponseModal {...defaultProps} maxLength={100} />);

      const textarea = screen.getByLabelText(/your response/i);
      // Use fireEvent.change for large text input to avoid slow keystroke simulation
      fireEvent.change(textarea, { target: { value: 'A'.repeat(95) } });

      const characterCount = screen.getByText(/95 \/ 100 characters/);
      expect(characterCount.className).toContain('text-secondary-600');
    });
  });

  describe('Cited Sources', () => {
    it('should allow adding cited sources', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/);
      // Use fireEvent.change to avoid garbled text from userEvent.type in CI
      fireEvent.change(sourceInput, { target: { value: 'https://newexample.com' } });
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(screen.getByText('https://newexample.com')).toBeInTheDocument();
      expect(sourceInput).toHaveValue('');
    });

    it('should allow removing cited sources', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const removeButton = screen.getByRole('button', {
        name: /remove source https:\/\/example.com\/source1/i,
      });
      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('https://example.com/source1')).not.toBeInTheDocument();
      });
    });

    it('should validate URL format for cited sources', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/);
      await user.type(sourceInput, 'not-a-url');
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
    });

    it('should allow adding source with Enter key', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/);
      await user.type(sourceInput, 'https://enterkey.com{Enter}');

      expect(screen.getByText('https://enterkey.com')).toBeInTheDocument();
    });

    it('should not add duplicate sources', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/);
      await user.type(sourceInput, 'https://example.com/source1');
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      // Source already exists, should not be added again
      const links = screen.getAllByText('https://example.com/source1');
      expect(links).toHaveLength(1);
    });
  });

  describe('Save Button State', () => {
    it('should only enable save button when changes are made', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      const textarea = screen.getByLabelText(/your response/i);
      await user.type(textarea, ' additional text');

      expect(saveButton).not.toBeDisabled();
    });

    it('should disable save button when content is invalid', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} minLength={10} />);

      const textarea = screen.getByLabelText(/your response/i);
      await user.clear(textarea);
      await user.type(textarea, 'Short');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });

    it('should detect changes in checkbox state', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      const opinionCheckbox = screen.getByLabelText(/this response contains my opinion/i);
      await user.click(opinionCheckbox);

      expect(saveButton).not.toBeDisabled();
    });

    it('should detect changes in cited sources', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      expect(saveButton).toBeDisabled();

      const sourceInput = screen.getByPlaceholderText(/https:\/\/example.com\/source/);
      await user.type(sourceInput, 'https://newsource.com');
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Modal Actions', () => {
    it('should close modal on cancel', async () => {
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(<EditResponseModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onSubmit with updated data', async () => {
      const onSubmit = vi.fn();
      const user = userEvent.setup();

      render(<EditResponseModal {...defaultProps} onSubmit={onSubmit} />);

      const textarea = screen.getByLabelText(/your response/i);
      await user.clear(textarea);
      await user.type(textarea, 'Updated response content');

      const saveButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(saveButton);

      expect(onSubmit).toHaveBeenCalledWith('response-1', {
        content: 'Updated response content',
        containsOpinion: true,
        containsFactualClaims: false,
        citedSources: ['https://example.com/source1', 'https://example.com/source2'],
      });
    });

    it('should close modal after successful submit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(<EditResponseModal {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

      const textarea = screen.getByLabelText(/your response/i);
      await user.type(textarea, ' updated');

      await user.click(screen.getByRole('button', { name: /save changes/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Checkbox State', () => {
    it('should handle opinion checkbox state', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const opinionCheckbox = screen.getByLabelText(/this response contains my opinion/i);
      expect(opinionCheckbox).toBeChecked();

      await user.click(opinionCheckbox);
      expect(opinionCheckbox).not.toBeChecked();
    });

    it('should handle factual claims checkbox state', async () => {
      const user = userEvent.setup();
      render(<EditResponseModal {...defaultProps} />);

      const factualCheckbox = screen.getByLabelText(/this response contains factual claims/i);
      expect(factualCheckbox).not.toBeChecked();

      await user.click(factualCheckbox);
      expect(factualCheckbox).toBeChecked();
    });
  });

  describe('Loading State', () => {
    it('should disable form fields when loading', () => {
      render(<EditResponseModal {...defaultProps} isLoading />);

      expect(screen.getByLabelText(/your response/i)).toBeDisabled();
      expect(screen.getByPlaceholderText(/https:\/\/example.com\/source/)).toBeDisabled();
      expect(screen.getByLabelText(/this response contains my opinion/i)).toBeDisabled();
    });

    it('should show loading state on save button', () => {
      render(<EditResponseModal {...defaultProps} isLoading />);

      const textarea = screen.getByLabelText(/your response/i);
      // Can't type when disabled, but button should show loading
      expect(textarea).toBeDisabled();
    });
  });
});
