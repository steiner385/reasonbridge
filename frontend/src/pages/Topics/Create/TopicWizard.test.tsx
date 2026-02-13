/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopicWizard } from './TopicWizard';

// Test data constants
const VALID_TITLE = 'A valid topic title that is long enough';
const VALID_DESCRIPTION =
  'This is a valid description that has at least fifty characters to pass validation.';

/**
 * Helper to fill step 1 form fields quickly using fireEvent.change
 * instead of user.type() to avoid CI timeouts with long strings
 */
function fillStep1Form() {
  const titleInput = screen.getByLabelText(/Title/i);
  const descriptionInput = screen.getByLabelText(/Description/i);

  fireEvent.change(titleInput, { target: { value: VALID_TITLE } });
  fireEvent.change(descriptionInput, { target: { value: VALID_DESCRIPTION } });
}

// Mock the useCreateTopic hook
const mockCreateTopic = vi.fn();
vi.mock('../../../hooks/useCreateTopic', () => ({
  useCreateTopic: vi.fn(() => ({
    mutate: mockCreateTopic,
    isPending: false,
    error: null,
  })),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TopicWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      expect(screen.getByText('Create New Discussion Topic')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      renderWithQueryClient(<TopicWizard isOpen={false} onClose={vi.fn()} onSuccess={vi.fn()} />);

      expect(screen.queryByText('Create New Discussion Topic')).not.toBeInTheDocument();
    });

    it('shows step 1 (Basic Information) by default', () => {
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      expect(screen.getByText('What would you like to discuss?')).toBeInTheDocument();
      expect(screen.getByLabelText(/Title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });
  });

  describe('step navigation', () => {
    it('Continue button is disabled when step 1 is invalid', () => {
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      const continueButton = screen.getByRole('button', { name: /Continue/i });
      expect(continueButton).toBeDisabled();
    });

    it('enables Continue button when step 1 is valid', async () => {
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      // Fill with valid data using fireEvent for speed
      fillStep1Form();

      const continueButton = screen.getByRole('button', { name: /Continue/i });
      expect(continueButton).not.toBeDisabled();
    });

    it('navigates to step 2 when Continue is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      // Fill step 1 using fireEvent for speed
      fillStep1Form();

      // Click Continue
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      // Should show step 2 content (wait for navigation to complete)
      await waitFor(() => {
        expect(screen.getByText('Classify your topic')).toBeInTheDocument();
      });
    });

    it('shows Back button on step 2', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      // Navigate to step 2
      fillStep1Form();
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      // Wait for step 2 to render, then check for Back button
      await waitFor(() => {
        expect(screen.getByText('Classify your topic')).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Back/i })).toBeInTheDocument();
    });

    it('navigates back to step 1 when Back is clicked', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      // Navigate to step 2
      fillStep1Form();
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      // Wait for step 2 to render
      await waitFor(() => {
        expect(screen.getByText('Classify your topic')).toBeInTheDocument();
      });

      // Click Back
      await user.click(screen.getByRole('button', { name: /Back/i }));

      // Should show step 1 content again (wait for navigation to complete)
      await waitFor(() => {
        expect(screen.getByText('What would you like to discuss?')).toBeInTheDocument();
      });
    });
  });

  describe('step 2 (Classification)', () => {
    async function navigateToStep2(user: ReturnType<typeof userEvent.setup>) {
      fillStep1Form();
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      // Wait for step 2 to render before proceeding
      await waitFor(() => {
        expect(screen.getByText('Classify your topic')).toBeInTheDocument();
      });
    }

    it('Continue is disabled without tags', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      await navigateToStep2(user);

      const continueButton = screen.getByRole('button', { name: /Continue/i });
      expect(continueButton).toBeDisabled();
    });

    it('can add tags', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      await navigateToStep2(user);

      const tagInput = screen.getByPlaceholderText(/climate, policy/i);
      await user.type(tagInput, 'testtag');
      await user.click(screen.getByRole('button', { name: /Add/i }));

      expect(screen.getByText('#testtag')).toBeInTheDocument();
    }, 10000);

    it('enables Continue after adding a tag', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      await navigateToStep2(user);

      const tagInput = screen.getByPlaceholderText(/climate, policy/i);
      await user.type(tagInput, 'testtag');
      await user.click(screen.getByRole('button', { name: /Add/i }));

      const continueButton = screen.getByRole('button', { name: /Continue/i });
      expect(continueButton).not.toBeDisabled();
    });
  });

  describe('step 3 (Preview)', () => {
    async function navigateToStep3(user: ReturnType<typeof userEvent.setup>) {
      // Step 1 - use fireEvent for speed
      fillStep1Form();
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      // Wait for step 2 to render
      await waitFor(() => {
        expect(screen.getByText('Classify your topic')).toBeInTheDocument();
      });

      // Step 2
      const tagInput = screen.getByPlaceholderText(/climate, policy/i);
      await user.type(tagInput, 'testtag');
      await user.click(screen.getByRole('button', { name: /Add/i }));
      await user.click(screen.getByRole('button', { name: /Continue/i }));

      // Wait for step 3 to render
      await waitFor(() => {
        expect(screen.getByText('Review your topic')).toBeInTheDocument();
      });
    }

    it('shows preview content', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      await navigateToStep3(user);

      expect(screen.getByText('Review your topic')).toBeInTheDocument();
      expect(screen.getByText(VALID_TITLE)).toBeInTheDocument();
    });

    it('shows Create Topic button on preview step', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      await navigateToStep3(user);

      expect(screen.getByRole('button', { name: /Create Topic/i })).toBeInTheDocument();
    });
  });

  describe('cancel and close', () => {
    it('calls onClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={onClose} onSuccess={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('draft persistence', () => {
    it('saves draft to localStorage when data changes', async () => {
      const user = userEvent.setup();
      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      await user.type(screen.getByLabelText(/Title/i), 'Test title');

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'topic-wizard-draft',
          expect.any(String),
        );
      });
    });

    it('loads draft from localStorage on open', async () => {
      const draftData = JSON.stringify({
        title: 'Saved draft title',
        description: 'Saved draft description',
      });
      localStorageMock.getItem.mockReturnValue(draftData);

      renderWithQueryClient(<TopicWizard isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

      // Wait for async draft loading (queueMicrotask defers the state update)
      await waitFor(() => {
        expect(screen.getByLabelText(/Title/i)).toHaveValue('Saved draft title');
      });
    });
  });
});
