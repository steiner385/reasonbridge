/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for useTopicDraft hook
 * Feature 016: Topic Management - T231
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTopicDraft, EMPTY_DRAFT, type TopicDraftData } from '../useTopicDraft';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useTopicDraft', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should initialize with no draft', () => {
      const { result } = renderHook(() => useTopicDraft());

      expect(result.current.hasDraft).toBe(false);
      expect(result.current.saveStatus).toBe('idle');
      expect(result.current.lastSavedAt).toBeNull();
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('should detect existing draft on mount', () => {
      const existingDraft: TopicDraftData = {
        ...EMPTY_DRAFT,
        title: 'Existing Draft Title',
        description: 'Existing description content',
      };
      mockLocalStorage.setItem('topic-draft', JSON.stringify(existingDraft));

      const { result } = renderHook(() => useTopicDraft());

      expect(result.current.hasDraft).toBe(true);
    });

    it('should use custom storage key', () => {
      const { result } = renderHook(() => useTopicDraft({ storageKey: 'custom-draft-key' }));

      act(() => {
        result.current.updateDraft({
          title: 'Test Title Here',
          description: 'Test description here',
        });
      });

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('custom-draft-key', expect.any(String));
    });
  });

  describe('Updating Draft', () => {
    it('should mark as having unsaved changes when updated', () => {
      const { result } = renderHook(() => useTopicDraft());

      act(() => {
        result.current.updateDraft({ title: 'New Title' });
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('should debounce saves', () => {
      const { result } = renderHook(() => useTopicDraft({ debounceDelay: 500 }));

      // Update multiple times quickly
      act(() => {
        result.current.updateDraft({ title: 'Title 1' });
      });
      act(() => {
        result.current.updateDraft({ title: 'Title 2' });
      });
      act(() => {
        result.current.updateDraft({ title: 'Final Title' });
      });

      // Storage should not be called yet
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      // Wait for debounce
      act(() => {
        vi.advanceTimersByTime(600);
      });

      // Should only save once with final value
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(1);
      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData.title).toBe('Final Title');
    });

    it('should not save if content is too short', () => {
      const { result } = renderHook(() => useTopicDraft({ minContentLength: 20 }));

      act(() => {
        result.current.updateDraft({ title: 'Short' });
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should save when title meets minimum length', () => {
      const { result } = renderHook(() => useTopicDraft({ minContentLength: 10 }));

      act(() => {
        result.current.updateDraft({ title: 'This is a long enough title' });
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should save when description meets minimum length', () => {
      const { result } = renderHook(() => useTopicDraft({ minContentLength: 10 }));

      act(() => {
        result.current.updateDraft({ description: 'This is a long enough description' });
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Save Status', () => {
    it('should update save status during save cycle', async () => {
      const { result } = renderHook(() => useTopicDraft({ debounceDelay: 100 }));

      expect(result.current.saveStatus).toBe('idle');

      act(() => {
        result.current.updateDraft({ title: 'Title for saving' });
      });

      // Wait for debounce to trigger save
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Should transition to 'saving' then 'saved'
      await waitFor(() => {
        expect(result.current.saveStatus).toBe('saved');
      });

      // Should return to idle after 2 seconds
      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(result.current.saveStatus).toBe('idle');
    });

    it('should update lastSavedAt timestamp', () => {
      const { result } = renderHook(() => useTopicDraft({ debounceDelay: 100 }));

      expect(result.current.lastSavedAt).toBeNull();

      act(() => {
        result.current.updateDraft({ title: 'Title for timestamp test' });
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    });
  });

  describe('Getting Draft', () => {
    it('should return null when no draft exists', () => {
      const { result } = renderHook(() => useTopicDraft());

      expect(result.current.getDraft()).toBeNull();
    });

    it('should return draft data from storage', () => {
      const savedDraft = {
        ...EMPTY_DRAFT,
        title: 'Saved Title',
        description: 'Saved Description',
        tags: ['tag1', 'tag2'],
        savedAt: new Date().toISOString(),
      };
      mockLocalStorage.setItem('topic-draft', JSON.stringify(savedDraft));

      const { result } = renderHook(() => useTopicDraft());

      const draft = result.current.getDraft();
      expect(draft).not.toBeNull();
      expect(draft?.title).toBe('Saved Title');
      expect(draft?.description).toBe('Saved Description');
      expect(draft?.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('Clearing Draft', () => {
    it('should clear draft from storage', () => {
      mockLocalStorage.setItem('topic-draft', JSON.stringify(EMPTY_DRAFT));

      const { result } = renderHook(() => useTopicDraft());

      act(() => {
        result.current.clearDraft();
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('topic-draft');
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.lastSavedAt).toBeNull();
    });
  });

  describe('Force Save', () => {
    it('should save immediately without debounce', () => {
      const { result } = renderHook(() => useTopicDraft({ debounceDelay: 5000 }));

      act(() => {
        result.current.updateDraft({ title: 'Title for force save' });
      });

      // Don't wait for debounce
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();

      act(() => {
        result.current.saveDraftNow();
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should not save if content is too short', () => {
      const { result } = renderHook(() => useTopicDraft({ minContentLength: 20 }));

      act(() => {
        result.current.updateDraft({ title: 'Short' });
        result.current.saveDraftNow();
      });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Restoring Draft', () => {
    it('should restore draft from storage', () => {
      const savedDraft = {
        ...EMPTY_DRAFT,
        title: 'Restored Title',
        description: 'Restored Description',
        savedAt: new Date().toISOString(),
      };
      mockLocalStorage.setItem('topic-draft', JSON.stringify(savedDraft));

      const { result } = renderHook(() => useTopicDraft());

      let restored: TopicDraftData | null = null;
      act(() => {
        restored = result.current.restoreDraft();
      });

      expect(restored).not.toBeNull();
      expect(restored?.title).toBe('Restored Title');
      expect(restored?.description).toBe('Restored Description');
    });

    it('should call onDraftRestored callback', () => {
      const savedDraft = {
        ...EMPTY_DRAFT,
        title: 'Callback Test',
        savedAt: new Date().toISOString(),
      };
      mockLocalStorage.setItem('topic-draft', JSON.stringify(savedDraft));

      const onDraftRestored = vi.fn();
      const { result } = renderHook(() => useTopicDraft({ onDraftRestored }));

      act(() => {
        result.current.restoreDraft();
      });

      expect(onDraftRestored).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Callback Test' }),
      );
    });

    it('should return null when no draft exists', () => {
      const { result } = renderHook(() => useTopicDraft());

      let restored: TopicDraftData | null = null;
      act(() => {
        restored = result.current.restoreDraft();
      });

      expect(restored).toBeNull();
    });
  });

  describe('Full Draft Data', () => {
    it('should save all draft fields correctly', () => {
      const { result } = renderHook(() => useTopicDraft({ debounceDelay: 100 }));

      const fullDraft: TopicDraftData = {
        title: 'Full Draft Title',
        description: 'Full Draft Description',
        tags: ['climate', 'policy'],
        visibility: 'PRIVATE',
        evidenceStandards: 'RIGOROUS',
        isMatureContent: true,
      };

      act(() => {
        result.current.updateDraft(fullDraft);
      });

      act(() => {
        vi.advanceTimersByTime(200);
      });

      const savedData = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
      expect(savedData.title).toBe('Full Draft Title');
      expect(savedData.description).toBe('Full Draft Description');
      expect(savedData.tags).toEqual(['climate', 'policy']);
      expect(savedData.visibility).toBe('PRIVATE');
      expect(savedData.evidenceStandards).toBe('RIGOROUS');
      expect(savedData.isMatureContent).toBe(true);
    });
  });
});
