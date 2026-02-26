/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for CredentialSubmitForm component
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CredentialSubmitForm from '../CredentialSubmitForm';
import type { SubmitCredentialInput } from '../../../types/ranking';

/**
 * Mock tags for testing
 */
const mockTags = [
  { id: 'tag-1', name: 'Climate Science' },
  { id: 'tag-2', name: 'Economics' },
  { id: 'tag-3', name: 'Psychology' },
];

describe('CredentialSubmitForm', () => {
  const mockOnSubmit = vi.fn<[SubmitCredentialInput], Promise<void>>();
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Category selector
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();

      // Credential type selector
      expect(screen.getByLabelText(/credential type/i)).toBeInTheDocument();

      // Title input
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();

      // Institution input
      expect(screen.getByLabelText(/institution/i)).toBeInTheDocument();

      // Document URL input (optional)
      expect(screen.getByLabelText(/document url/i)).toBeInTheDocument();

      // Verification URL input (optional)
      expect(screen.getByLabelText(/verification url/i)).toBeInTheDocument();

      // Expiration date picker (optional)
      expect(screen.getByLabelText(/expiration date/i)).toBeInTheDocument();

      // Submit button
      expect(screen.getByRole('button', { name: /submit credential/i })).toBeInTheDocument();
    });

    it('should render cancel button when onCancel is provided', () => {
      render(
        <CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel is not provided', () => {
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <CredentialSubmitForm
          tags={mockTags}
          onSubmit={mockOnSubmit}
          className="custom-form-class"
        />,
      );

      expect(container.firstChild).toHaveClass('custom-form-class');
    });
  });

  describe('Category Dropdown', () => {
    it('should display all available tags in dropdown', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      const categorySelect = screen.getByLabelText(/category/i);
      await user.click(categorySelect);

      // Check all options are available
      expect(screen.getByRole('option', { name: 'Climate Science' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Economics' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Psychology' })).toBeInTheDocument();
    });

    it('should allow selecting a category', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      const categorySelect = screen.getByLabelText(/category/i);
      await user.selectOptions(categorySelect, 'tag-2');

      expect(categorySelect).toHaveValue('tag-2');
    });
  });

  describe('Credential Type Selector', () => {
    it('should display all credential types', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      const typeSelect = screen.getByLabelText(/credential type/i);
      await user.click(typeSelect);

      expect(screen.getByRole('option', { name: 'Doctorate (PhD, MD, JD)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: "Master's Degree" })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: "Bachelor's Degree" })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Professional License' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Industry Certification' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Publication' })).toBeInTheDocument();
    });

    it('should allow selecting a credential type', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      const typeSelect = screen.getByLabelText(/credential type/i);
      await user.selectOptions(typeSelect, 'ACADEMIC_DOCTORATE');

      expect(typeSelect).toHaveValue('ACADEMIC_DOCTORATE');
    });
  });

  describe('Form Validation', () => {
    it('should keep submit disabled when category is not selected', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill required fields except category
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Submit button should remain disabled
      expect(screen.getByRole('button', { name: /submit credential/i })).toBeDisabled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should keep submit disabled when credential type is not selected', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill required fields except type
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Submit button should remain disabled
      expect(screen.getByRole('button', { name: /submit credential/i })).toBeDisabled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should keep submit disabled when title is empty', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill required fields except title
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Submit button should remain disabled
      expect(screen.getByRole('button', { name: /submit credential/i })).toBeDisabled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should keep submit disabled when institution is empty', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill required fields except institution
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');

      // Submit button should remain disabled
      expect(screen.getByRole('button', { name: /submit credential/i })).toBeDisabled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for invalid document URL', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill all required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Enter invalid URL
      const documentUrlInput = screen.getByLabelText(/document url/i);
      await user.type(documentUrlInput, 'not-a-url');
      await user.tab(); // Trigger blur validation

      // Wait for validation error
      await waitFor(
        () => {
          expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      // Submit should be disabled due to invalid URL
      expect(screen.getByRole('button', { name: /submit credential/i })).toBeDisabled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error for invalid verification URL', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill all required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Enter invalid URL
      const verificationUrlInput = screen.getByLabelText(/verification url/i);
      await user.type(verificationUrlInput, 'invalid-url');
      await user.tab(); // Trigger blur validation

      // Wait for validation error
      await waitFor(
        () => {
          expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      // Submit should be disabled due to invalid URL
      expect(screen.getByRole('button', { name: /submit credential/i })).toBeDisabled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Submit Button State', () => {
    it('should be disabled while form is invalid', async () => {
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Initially disabled (no fields filled)
      expect(screen.getByRole('button', { name: /submit credential/i })).toBeDisabled();
    });

    it('should be enabled when all required fields are valid', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill all required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /submit credential/i })).toBeEnabled();
        },
        { timeout: 10000 },
      );
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill all fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Clinical Psychology');
      await user.type(screen.getByLabelText(/institution/i), 'Stanford University');
      await user.type(screen.getByLabelText(/document url/i), 'https://example.com/diploma.pdf');
      await user.type(
        screen.getByLabelText(/verification url/i),
        'https://verify.stanford.edu/12345',
      );

      // Submit
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      await waitFor(
        () => {
          expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        },
        { timeout: 10000 },
      );

      expect(mockOnSubmit).toHaveBeenCalledWith({
        tagId: 'tag-1',
        type: 'ACADEMIC_DOCTORATE',
        title: 'PhD in Clinical Psychology',
        institution: 'Stanford University',
        documentUrl: 'https://example.com/diploma.pdf',
        verificationUrl: 'https://verify.stanford.edu/12345',
        expiresAt: undefined,
      });
    });

    it('should call onSubmit with expiration date when provided', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'PROFESSIONAL_LICENSE');
      await user.type(screen.getByLabelText(/title/i), 'Licensed Clinical Psychologist');
      await user.type(screen.getByLabelText(/institution/i), 'State Board of Psychology');

      // Set expiration date
      const expirationInput = screen.getByLabelText(/expiration date/i);
      await user.type(expirationInput, '2027-12-31');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      await waitFor(
        () => {
          expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        },
        { timeout: 10000 },
      );

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: '2027-12-31',
        }),
      );
    });

    it('should omit optional fields when not provided', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill only required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-2');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_MASTERS');
      await user.type(screen.getByLabelText(/title/i), "Master's in Economics");
      await user.type(screen.getByLabelText(/institution/i), 'Harvard University');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      await waitFor(
        () => {
          expect(mockOnSubmit).toHaveBeenCalledTimes(1);
        },
        { timeout: 10000 },
      );

      expect(mockOnSubmit).toHaveBeenCalledWith({
        tagId: 'tag-2',
        type: 'ACADEMIC_MASTERS',
        title: "Master's in Economics",
        institution: 'Harvard University',
        documentUrl: undefined,
        verificationUrl: undefined,
        expiresAt: undefined,
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveSubmit: () => void;
      const pendingSubmit = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(pendingSubmit);

      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      // Check loading state
      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();

      // Resolve submission
      resolveSubmit!();

      await waitFor(
        () => {
          expect(screen.getByRole('button', { name: /submit credential/i })).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
    });

    it('should disable form inputs during submission', async () => {
      const user = userEvent.setup({ delay: null });
      let resolveSubmit: () => void;
      const pendingSubmit = new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValue(pendingSubmit);

      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      // Check inputs are disabled
      await waitFor(
        () => {
          expect(screen.getByLabelText(/category/i)).toBeDisabled();
          expect(screen.getByLabelText(/credential type/i)).toBeDisabled();
          expect(screen.getByLabelText(/title/i)).toBeDisabled();
          expect(screen.getByLabelText(/institution/i)).toBeDisabled();
        },
        { timeout: 10000 },
      );

      // Resolve submission
      resolveSubmit!();

      await waitFor(
        () => {
          expect(screen.getByLabelText(/category/i)).toBeEnabled();
        },
        { timeout: 10000 },
      );
    });
  });

  describe('Error State', () => {
    it('should show error state on submission failure', async () => {
      const user = userEvent.setup({ delay: null });
      mockOnSubmit.mockRejectedValue(new Error('Submission failed'));

      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Fill required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      await waitFor(
        () => {
          expect(screen.getByText(/failed to submit credential/i)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
    });

    it('should allow retry after error', async () => {
      const user = userEvent.setup({ delay: null });
      mockOnSubmit.mockRejectedValueOnce(new Error('First attempt failed'));
      mockOnSubmit.mockResolvedValueOnce(undefined);

      render(
        <CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} onSuccess={mockOnSuccess} />,
      );

      // Fill required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // First submit - fails
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      await waitFor(
        () => {
          expect(screen.getByText(/failed to submit credential/i)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      // Second submit - succeeds
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalled();
        },
        { timeout: 10000 },
      );
    });
  });

  describe('Success Callback', () => {
    it('should call onSuccess after successful submission', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} onSuccess={mockOnSuccess} />,
      );

      // Fill required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalledTimes(1);
        },
        { timeout: 10000 },
      );
    });

    it('should not call onSuccess on submission failure', async () => {
      const user = userEvent.setup({ delay: null });
      mockOnSubmit.mockRejectedValue(new Error('Submission failed'));

      render(
        <CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} onSuccess={mockOnSuccess} />,
      );

      // Fill required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      await waitFor(
        () => {
          expect(screen.getByText(/failed to submit credential/i)).toBeInTheDocument();
        },
        { timeout: 10000 },
      );
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} onSuccess={mockOnSuccess} />,
      );

      // Fill required fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.selectOptions(screen.getByLabelText(/credential type/i), 'ACADEMIC_DOCTORATE');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');
      await user.type(screen.getByLabelText(/institution/i), 'MIT');

      // Submit
      await user.click(screen.getByRole('button', { name: /submit credential/i }));

      await waitFor(
        () => {
          expect(mockOnSuccess).toHaveBeenCalled();
        },
        { timeout: 10000 },
      );

      // Form should be reset
      await waitFor(
        () => {
          expect(screen.getByLabelText(/category/i)).toHaveValue('');
          expect(screen.getByLabelText(/credential type/i)).toHaveValue('');
          expect(screen.getByLabelText(/title/i)).toHaveValue('');
          expect(screen.getByLabelText(/institution/i)).toHaveValue('');
        },
        { timeout: 10000 },
      );
    });
  });

  describe('Cancel Action', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onSubmit when cancel is clicked', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />,
      );

      // Fill some fields
      await user.selectOptions(screen.getByLabelText(/category/i), 'tag-1');
      await user.type(screen.getByLabelText(/title/i), 'PhD in Physics');

      // Click cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // All inputs should have associated labels
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/credential type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/institution/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/document url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/verification url/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expiration date/i)).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Required indicator should be present (typically shown as * in the label)
      // Use getAllByText and filter to get labels, as there may be multiple elements with these texts
      const selects = Array.from(document.querySelectorAll('select')).map((select) => {
        const labelId = select.id;
        return document.querySelector(`label[for="${labelId}"]`);
      });

      // Check that category and credential type labels contain *
      const categoryLabel = selects.find((label) => label?.textContent?.includes('Category'));
      const typeLabel = selects.find((label) => label?.textContent?.includes('Credential Type'));

      expect(categoryLabel?.textContent).toContain('*');
      expect(typeLabel?.textContent).toContain('*');

      // Check title and institution labels via their inputs
      const titleInput = screen.getByLabelText(/title/i);
      const institutionInput = screen.getByLabelText(/institution/i);

      const titleLabel = document.querySelector(`label[for="${titleInput.id}"]`);
      const institutionLabel = document.querySelector(`label[for="${institutionInput.id}"]`);

      expect(titleLabel?.textContent).toContain('*');
      expect(institutionLabel?.textContent).toContain('*');
    });

    it('should have aria-invalid on fields with errors', async () => {
      const user = userEvent.setup({ delay: null });
      render(<CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />);

      // Type in title field then clear it to trigger validation error
      const titleInput = screen.getByLabelText(/title/i);
      await user.type(titleInput, 'Test');
      await user.clear(titleInput);
      await user.tab(); // Trigger blur validation

      // Field with error should have aria-invalid
      await waitFor(
        () => {
          expect(titleInput).toHaveAttribute('aria-invalid', 'true');
        },
        { timeout: 10000 },
      );
    });
  });

  describe('Dark Mode Support', () => {
    it('should include dark mode classes', () => {
      const { container } = render(
        <CredentialSubmitForm tags={mockTags} onSubmit={mockOnSubmit} />,
      );

      // Check that dark mode classes are present
      expect(container.innerHTML).toMatch(/dark:/);
    });
  });
});
