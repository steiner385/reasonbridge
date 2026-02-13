/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraftAutoSave } from '../useDraftAutoSave';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

interface TestData {
  title: string;
  description: string;
}

const initialData: TestData = {
  title: '',
  description: '',
};

const STORAGE_KEY = 'test-draft';

describe('useDraftAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('initializes with initial data when no draft exists', () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
        }),
      );

      expect(result.current.data).toEqual(initialData);
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.status).toBe('idle');
      expect(result.current.hasUnsavedChanges).toBe(false);
    });

    it('restores draft from localStorage on mount', () => {
      const savedData: TestData = { title: 'Saved Title', description: 'Saved Description' };
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify({ data: savedData, savedAt: new Date().toISOString() }),
      );

      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
        }),
      );

      expect(result.current.data).toEqual(savedData);
      expect(result.current.hasDraft).toBe(true);
    });

    it('calls onRestore callback when draft is restored', async () => {
      const savedData: TestData = { title: 'Restored', description: 'Data' };
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify({ data: savedData, savedAt: new Date().toISOString() }),
      );

      const onRestore = vi.fn();
      renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          onRestore,
        }),
      );

      // Wait for queueMicrotask to execute
      await vi.runAllTimersAsync();

      expect(onRestore).toHaveBeenCalledWith(savedData);
    });

    it('does not restore draft when restoreOnMount is false', () => {
      const savedData: TestData = { title: 'Saved', description: 'Data' };
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify({ data: savedData, savedAt: new Date().toISOString() }),
      );

      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          restoreOnMount: false,
        }),
      );

      expect(result.current.data).toEqual(initialData);
    });

    it('handles corrupted localStorage data gracefully', () => {
      localStorageMock.setItem(STORAGE_KEY, 'invalid json{');

      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
        }),
      );

      expect(result.current.data).toEqual(initialData);
    });
  });

  describe('setData', () => {
    it('updates data immediately', () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
        }),
      );

      act(() => {
        result.current.setData({ title: 'New Title', description: '' });
      });

      expect(result.current.data.title).toBe('New Title');
    });

    it('sets hasUnsavedChanges to true when data changes', () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
        }),
      );

      expect(result.current.hasUnsavedChanges).toBe(false);

      act(() => {
        result.current.setData({ title: 'Changed', description: '' });
      });

      expect(result.current.hasUnsavedChanges).toBe(true);
    });

    it('supports function updater', () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
        }),
      );

      act(() => {
        result.current.setData((prev) => ({ ...prev, title: prev.title + 'Updated' }));
      });

      expect(result.current.data.title).toBe('Updated');
    });
  });

  describe('debounced save', () => {
    it('saves to localStorage after debounce delay', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 500,
        }),
      );

      act(() => {
        result.current.setData({ title: 'Test', description: '' });
      });

      // Should not be saved yet
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('Test'),
      );

      // Advance timer past debounce delay
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('Test'),
      );
    });

    it('resets debounce timer on subsequent changes', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 500,
        }),
      );

      act(() => {
        result.current.setData({ title: 'First', description: '' });
      });

      // Advance partway through debounce
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Change again - should reset timer
      act(() => {
        result.current.setData({ title: 'Second', description: '' });
      });

      // Advance another 300ms (total 600ms from first change, but 300ms from second)
      await act(async () => {
        vi.advanceTimersByTime(300);
      });

      // Should still not be saved (only 300ms since last change)
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Advance to complete debounce from second change
      await act(async () => {
        vi.advanceTimersByTime(200);
      });

      // Now should be saved with 'Second'
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('Second'),
      );
    });

    it('updates status during save cycle', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 100,
        }),
      );

      expect(result.current.status).toBe('idle');

      act(() => {
        result.current.setData({ title: 'Test', description: '' });
      });

      // Trigger debounced save
      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.status).toBe('saved');

      // Status resets to idle after 2 seconds
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.status).toBe('idle');
    });

    it('calls onSave callback when save succeeds', async () => {
      const onSave = vi.fn();
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 100,
          onSave,
        }),
      );

      act(() => {
        result.current.setData({ title: 'Callback Test', description: '' });
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(onSave).toHaveBeenCalledWith({ title: 'Callback Test', description: '' });
    });
  });

  describe('saveNow', () => {
    it('saves immediately bypassing debounce', () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 5000,
        }),
      );

      act(() => {
        result.current.setData({ title: 'Immediate', description: '' });
      });

      // Should not be saved yet due to long debounce
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      act(() => {
        result.current.saveNow();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('Immediate'),
      );
    });

    it('clears pending debounced save', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 500,
        }),
      );

      act(() => {
        result.current.setData({ title: 'First', description: '' });
      });

      act(() => {
        result.current.saveNow();
      });

      // Clear the mock to track new calls
      localStorageMock.setItem.mockClear();

      // Advance past original debounce - should not trigger another save
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('clearDraft', () => {
    it('removes draft from localStorage', () => {
      localStorageMock.setItem(
        STORAGE_KEY,
        JSON.stringify({ data: { title: 'Existing', description: '' }, savedAt: '' }),
      );

      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
        }),
      );

      act(() => {
        result.current.clearDraft();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('resets data to initialData', () => {
      const savedData = { title: 'Saved', description: 'Content' };
      localStorageMock.setItem(STORAGE_KEY, JSON.stringify({ data: savedData, savedAt: '' }));

      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
        }),
      );

      expect(result.current.data).toEqual(savedData);

      act(() => {
        result.current.clearDraft();
      });

      expect(result.current.data).toEqual(initialData);
      expect(result.current.hasDraft).toBe(false);
      expect(result.current.hasUnsavedChanges).toBe(false);
      expect(result.current.status).toBe('idle');
    });

    it('cancels pending debounced saves', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 500,
        }),
      );

      act(() => {
        result.current.setData({ title: 'Will be cleared', description: '' });
      });

      act(() => {
        result.current.clearDraft();
      });

      // Clear the mock
      localStorageMock.setItem.mockClear();

      // Advance past debounce - should not save
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('shouldSave validation', () => {
    it('does not save when shouldSave returns false', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 100,
          shouldSave: (data: TestData) => data.title.length > 5,
        }),
      );

      act(() => {
        result.current.setData({ title: 'Hi', description: '' }); // Too short
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('saves when shouldSave returns true', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 100,
          shouldSave: (data: TestData) => data.title.length > 5,
        }),
      );

      act(() => {
        result.current.setData({ title: 'Long enough title', description: '' });
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('interval save', () => {
    it('saves at specified intervals when hasUnsavedChanges is true', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 2000, // Long debounce to avoid interference
          intervalMs: 500,
        }),
      );

      act(() => {
        result.current.setData({ title: 'Interval test', description: '' });
      });

      // Should not be saved yet (neither debounce nor interval triggered)
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Advance to first interval save
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      // Should have saved via interval
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('Interval test'),
      );
    });

    it('does not set up interval when intervalMs is 0', async () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          intervalMs: 0,
        }),
      );

      // Should not have set up interval for draft saving
      expect(setIntervalSpy).not.toHaveBeenCalled();

      setIntervalSpy.mockRestore();
    });
  });

  describe('lastSavedAt', () => {
    it('updates lastSavedAt after successful save', async () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 100,
        }),
      );

      expect(result.current.lastSavedAt).toBeNull();

      act(() => {
        result.current.setData({ title: 'Test', description: '' });
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.lastSavedAt).toBeInstanceOf(Date);
    });
  });

  describe('error handling', () => {
    it('sets status to error when save fails', async () => {
      // Make localStorage.setItem throw
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 100,
          onError,
        }),
      );

      act(() => {
        result.current.setData({ title: 'Error test', description: '' });
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.status).toBe('error');
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('beforeunload', () => {
    it('saves on beforeunload when there are unsaved changes', () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 5000, // Long debounce so save doesn't trigger
        }),
      );

      act(() => {
        result.current.setData({ title: 'Unsaved on unload', description: '' });
      });

      expect(result.current.hasUnsavedChanges).toBe(true);

      // Clear any previous calls
      localStorageMock.setItem.mockClear();

      // Trigger beforeunload
      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        expect.stringContaining('Unsaved on unload'),
      );
    });

    it('does not save on beforeunload when shouldSave returns false', () => {
      const { result } = renderHook(() =>
        useDraftAutoSave({
          storageKey: STORAGE_KEY,
          initialData,
          debounceMs: 5000,
          shouldSave: () => false,
        }),
      );

      act(() => {
        result.current.setData({ title: 'Should not save', description: '' });
      });

      localStorageMock.setItem.mockClear();

      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
});
