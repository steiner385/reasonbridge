/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for TopicTitleInput component
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook, act } from '@testing-library/react';
import { TopicTitleInput, useTopicTitleValidation } from '../TopicTitleInput';

describe('TopicTitleInput', () => {
  describe('Rendering', () => {
    it('should render with label', () => {
      render(<TopicTitleInput value="" onChange={() => {}} />);
      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    });

    it('should render with required indicator', () => {
      render(<TopicTitleInput value="" onChange={() => {}} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<TopicTitleInput value="" onChange={() => {}} />);
      expect(screen.getByPlaceholderText(/carbon taxes/i)).toBeInTheDocument();
    });

    it('should render with custom placeholder', () => {
      render(<TopicTitleInput value="" onChange={() => {}} placeholder="Custom placeholder" />);
      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });

    it('should render character count', () => {
      render(<TopicTitleInput value="Test" onChange={() => {}} />);
      expect(screen.getByText('4/200')).toBeInTheDocument();
    });

    it('should render character hint when empty', () => {
      render(<TopicTitleInput value="" onChange={() => {}} />);
      expect(screen.getByText('10-200 characters')).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('should show error when title is too short', () => {
      render(<TopicTitleInput value="Short" onChange={() => {}} />);
      expect(screen.getByRole('alert')).toHaveTextContent('5 more characters needed');
    });

    it('should not show error when title meets minimum length', () => {
      render(<TopicTitleInput value="This is a valid topic title" onChange={() => {}} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should show singular character when 1 more needed', () => {
      render(<TopicTitleInput value="123456789" onChange={() => {}} />);
      expect(screen.getByRole('alert')).toHaveTextContent('1 more character needed');
    });

    it('should show external error when provided', () => {
      render(
        <TopicTitleInput
          value="Valid title here"
          onChange={() => {}}
          hasExternalError
          externalError="Duplicate title detected"
        />,
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Duplicate title detected');
    });

    it('should use custom minLength', () => {
      render(<TopicTitleInput value="12345" onChange={() => {}} minLength={5} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should use custom maxLength', () => {
      render(<TopicTitleInput value="" onChange={() => {}} maxLength={100} />);
      expect(screen.getByText('10-100 characters')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should call onChange when typing', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TopicTitleInput value="" onChange={onChange} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Test');

      expect(onChange).toHaveBeenCalledTimes(4);
      expect(onChange).toHaveBeenLastCalledWith('t');
    });

    it('should prevent typing beyond maxLength', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(<TopicTitleInput value="12345" onChange={onChange} maxLength={5} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'extra');

      expect(onChange).not.toHaveBeenCalled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<TopicTitleInput value="" onChange={() => {}} disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should auto-focus when autoFocus is true', () => {
      render(<TopicTitleInput value="" onChange={() => {}} autoFocus />);
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  describe('Validation Callback', () => {
    it('should call onValidationChange with validation state', () => {
      const onValidationChange = vi.fn();
      render(
        <TopicTitleInput
          value="Valid title text"
          onChange={() => {}}
          onValidationChange={onValidationChange}
        />,
      );

      expect(onValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          error: null,
          charCount: 16,
        }),
      );
    });

    it('should call onValidationChange with error when invalid', () => {
      const onValidationChange = vi.fn();
      render(
        <TopicTitleInput
          value="Short"
          onChange={() => {}}
          onValidationChange={onValidationChange}
        />,
      );

      expect(onValidationChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          error: '5 more characters needed',
        }),
      );
    });
  });

  describe('Accessibility', () => {
    it('should have aria-invalid when error exists', () => {
      render(<TopicTitleInput value="Short" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('should not have aria-invalid when valid', () => {
      render(<TopicTitleInput value="This is a valid title" onChange={() => {}} />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'false');
    });

    it('should have aria-describedby pointing to error', () => {
      render(<TopicTitleInput value="Short" onChange={() => {}} id="test-title" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'test-title-error');
    });

    it('should have aria-describedby pointing to hint when valid', () => {
      render(<TopicTitleInput value="" onChange={() => {}} id="test-title" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'test-title-hint');
    });
  });
});

describe('useTopicTitleValidation', () => {
  it('should return valid state for valid title', () => {
    const { result } = renderHook(() => useTopicTitleValidation('This is a valid topic title'));

    expect(result.current.isValid).toBe(true);
    expect(result.current.error).toBeNull();
    expect(result.current.charCount).toBe(27);
    expect(result.current.isAtMinimum).toBe(true);
    expect(result.current.isAtMaximum).toBe(false);
  });

  it('should return invalid state for short title', () => {
    const { result } = renderHook(() => useTopicTitleValidation('Short'));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('5 more characters needed');
    expect(result.current.charCount).toBe(5);
    expect(result.current.isAtMinimum).toBe(false);
  });

  it('should return invalid state for empty title', () => {
    const { result } = renderHook(() => useTopicTitleValidation(''));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.charCount).toBe(0);
  });

  it('should handle custom min/max lengths', () => {
    const { result } = renderHook(() => useTopicTitleValidation('12345', 5, 10));

    expect(result.current.isValid).toBe(true);
    expect(result.current.remainingChars).toBe(5);
  });

  it('should return error when exceeding max length', () => {
    const { result } = renderHook(() => useTopicTitleValidation('123456789012345', 5, 10));

    expect(result.current.isValid).toBe(false);
    expect(result.current.error).toBe('Title exceeds maximum length by 5 characters');
  });
});
