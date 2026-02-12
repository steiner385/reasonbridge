/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for TopicDescriptionEditor component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import { TopicDescriptionEditor, useTopicDescriptionValidation } from '../TopicDescriptionEditor';

describe('TopicDescriptionEditor', () => {
  describe('Rendering', () => {
    it('should render with label', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} />);
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('should render with required indicator', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} />);
      expect(screen.getByPlaceholderText(/provide context/i)).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(
        <TopicDescriptionEditor value="" onChange={() => {}} placeholder="Custom placeholder" />,
      );
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should render character count', () => {
      render(<TopicDescriptionEditor value="Test description" onChange={() => {}} />);
      expect(screen.getByText('16/5,000')).toBeInTheDocument();
    });

    it('should render character hint when empty', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} />);
      expect(screen.getByText(/50-5000 characters/i)).toBeInTheDocument();
    });

    it('should render as textarea', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} />);
      expect(screen.getByRole('textbox').tagName).toBe('TEXTAREA');
    });

    it('should render with specified rows', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} rows={10} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '10');
    });
  });

  describe('Validation', () => {
    it('should show error when description is too short', () => {
      render(<TopicDescriptionEditor value="Short text" onChange={() => {}} />);
      expect(screen.getByRole('alert')).toHaveTextContent('40 more characters needed');
    });

    it('should not show error when description meets minimum length', () => {
      const validDescription =
        'This is a valid topic description that meets the minimum length requirement.';
      render(<TopicDescriptionEditor value={validDescription} onChange={() => {}} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should show singular character when 1 more needed', () => {
      // 49 characters - need 1 more
      const almostValid = 'This is almost valid and just needs one more char';
      render(<TopicDescriptionEditor value={almostValid} onChange={() => {}} />);
      expect(screen.getByRole('alert')).toHaveTextContent('1 more character needed');
    });

    it('should show external error when provided', () => {
      render(
        <TopicDescriptionEditor
          value="Valid description that is long enough to pass validation checks."
          onChange={() => {}}
          hasExternalError
          externalError="Content flagged for review"
        />,
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Content flagged for review');
    });

    it('should use custom minLength', () => {
      render(
        <TopicDescriptionEditor value="12345678901234567890" onChange={() => {}} minLength={20} />,
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should use custom maxLength', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} maxLength={1000} />);
      expect(screen.getByText(/50-1000 characters/i)).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when typing', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TopicDescriptionEditor value="" onChange={onChange} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'Test');

      expect(onChange).toHaveBeenCalledTimes(4);
      expect(onChange).toHaveBeenLastCalledWith('t');
    });

    it('should prevent typing beyond maxLength', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TopicDescriptionEditor value="12345" onChange={onChange} maxLength={5} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, 'extra');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should auto-focus when autoFocus is true', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} autoFocus />);
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('Validation Callback', () => {
    it('should call onValidationChange with validation state', () => {
      const onValidationChange = vi.fn();
      const validDescription =
        'This is a valid topic description that meets the minimum character requirement.';
      render(
        <TopicDescriptionEditor
          value={validDescription}
          onChange={() => {}}
          onValidationChange={onValidationChange}
        />,
      );

      expect(onValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          error: null,
          charCount: validDescription.length,
        }),
      );
    });

    it('should call onValidationChange with error when invalid', () => {
      const onValidationChange = vi.fn();
      render(
        <TopicDescriptionEditor
          value="Too short"
          onChange={() => {}}
          onValidationChange={onValidationChange}
        />,
      );

      expect(onValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          error: '41 more characters needed',
        }),
      );
    });
  });

  describe('Accessibility', () => {
    it('should have aria-invalid when error exists', () => {
      render(<TopicDescriptionEditor value="Short" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not have aria-invalid when valid', () => {
      const validDescription =
        'This is a valid topic description that meets the minimum length requirement.';
      render(<TopicDescriptionEditor value={validDescription} onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
    });

    it('should have aria-describedby pointing to error', () => {
      render(<TopicDescriptionEditor value="Short" onChange={() => {}} id="test-desc" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'test-desc-error');
    });

    it('should have aria-describedby pointing to hint when valid', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} id="test-desc" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'test-desc-hint');
    });
  });

  describe('Auto-resize', () => {
    it('should not have rows attribute when autoResize is true', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} autoResize />);
      expect(screen.getByRole('textbox')).not.toHaveAttribute('rows');
    });

    it('should have rows attribute when autoResize is false', () => {
      render(<TopicDescriptionEditor value="" onChange={() => {}} autoResize={false} rows={8} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '8');
    });
  });
});

describe('useTopicDescriptionValidation', () => {
  it('should return valid state for valid description', () => {
    const validDescription =
      'This is a valid topic description that meets the minimum character count for validation.';
    const { result } = renderHook(() => useTopicDescriptionValidation(validDescription));

    expect(result.current.isValid).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.charCount).toBe(validDescription.length);
    expect(result.current.isAtMinimum).toBe(true);
    expect(result.current.isAtMaximum).toBe(false);
  });

  it('should return invalid state for short description', () => {
    const { result } = renderHook(() => useTopicDescriptionValidation('Too short'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('41 more characters needed');
    expect(result.current.charCount).toBe(9);
    expect(result.current.isAtMinimum).toBe(false);
  });

  it('should return invalid state for empty description', () => {
    const { result } = renderHook(() => useTopicDescriptionValidation(''));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.charCount).toBe(0);
  });

  it('should handle custom min/max lengths', () => {
    const { result } = renderHook(() =>
      useTopicDescriptionValidation('This is a test description', 10, 100),
    );

    expect(result.current.isValid).toBe(true);
    expect(result.current.remainingChars).toBe(74);
  });

  it('should return error when exceeding max length', () => {
    const longText = 'a'.repeat(110);
    const { result } = renderHook(() => useTopicDescriptionValidation(longText, 10, 100));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('Description exceeds maximum length by 10 characters');
  });

  it('should calculate remaining chars correctly', () => {
    const { result } = renderHook(() => useTopicDescriptionValidation('Test', 50, 5000));

    expect(result.current.remainingChars).toBe(4996);
  });
});
