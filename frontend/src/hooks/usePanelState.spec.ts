import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePanelState } from './usePanelState';

describe('usePanelState', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Initial state', () => {
    it('should initialize with default panel widths', () => {
      const { result } = renderHook(() => usePanelState());

      expect(result.current.panelState.leftPanelWidth).toBe(320);
      expect(result.current.panelState.rightPanelWidth).toBe(400);
      expect(result.current.panelState.isLeftPanelCollapsed).toBe(false);
      expect(result.current.panelState.isRightPanelCollapsed).toBe(false);
      expect(result.current.panelState.activeTopic).toBe(null);
    });

    it('should load state from sessionStorage if available', () => {
      const savedState = {
        leftPanelWidth: 350,
        rightPanelWidth: 450,
        isLeftPanelCollapsed: true,
        isRightPanelCollapsed: false,
        activeTopic: 'topic-123',
      };
      sessionStorage.setItem('discussion-panel-state', JSON.stringify(savedState));

      const { result } = renderHook(() => usePanelState());

      expect(result.current.panelState).toEqual(savedState);
    });

    it('should use default state if sessionStorage has invalid JSON', () => {
      sessionStorage.setItem('discussion-panel-state', 'invalid-json{');

      const { result } = renderHook(() => usePanelState());

      expect(result.current.panelState.leftPanelWidth).toBe(320);
      expect(result.current.panelState.rightPanelWidth).toBe(400);
    });
  });

  describe('setPanelWidth', () => {
    it('should update left panel width', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setPanelWidth('left', 350);
      });

      expect(result.current.panelState.leftPanelWidth).toBe(350);
    });

    it('should update right panel width', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setPanelWidth('right', 450);
      });

      expect(result.current.panelState.rightPanelWidth).toBe(450);
    });

    it('should constrain left panel width to minimum 240px', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setPanelWidth('left', 100);
      });

      expect(result.current.panelState.leftPanelWidth).toBe(240);
    });

    it('should constrain left panel width to maximum 480px', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setPanelWidth('left', 600);
      });

      expect(result.current.panelState.leftPanelWidth).toBe(480);
    });

    it('should constrain right panel width to minimum 280px', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setPanelWidth('right', 100);
      });

      expect(result.current.panelState.rightPanelWidth).toBe(280);
    });

    it('should constrain right panel width to maximum 600px', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setPanelWidth('right', 800);
      });

      expect(result.current.panelState.rightPanelWidth).toBe(600);
    });

    it('should persist state to sessionStorage', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setPanelWidth('left', 350);
      });

      const saved = JSON.parse(sessionStorage.getItem('discussion-panel-state') || '{}');
      expect(saved.leftPanelWidth).toBe(350);
    });
  });

  describe('togglePanel', () => {
    it('should collapse left panel', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.togglePanel('left');
      });

      expect(result.current.panelState.isLeftPanelCollapsed).toBe(true);
    });

    it('should expand left panel if already collapsed', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.togglePanel('left');
      });
      expect(result.current.panelState.isLeftPanelCollapsed).toBe(true);

      act(() => {
        result.current.togglePanel('left');
      });
      expect(result.current.panelState.isLeftPanelCollapsed).toBe(false);
    });

    it('should collapse right panel', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.togglePanel('right');
      });

      expect(result.current.panelState.isRightPanelCollapsed).toBe(true);
    });

    it('should persist collapsed state to sessionStorage', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.togglePanel('left');
      });

      const saved = JSON.parse(sessionStorage.getItem('discussion-panel-state') || '{}');
      expect(saved.isLeftPanelCollapsed).toBe(true);
    });
  });

  describe('setActiveTopic', () => {
    it('should set active topic', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setActiveTopic('topic-123');
      });

      expect(result.current.panelState.activeTopic).toBe('topic-123');
    });

    it('should clear active topic when set to null', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setActiveTopic('topic-123');
      });
      expect(result.current.panelState.activeTopic).toBe('topic-123');

      act(() => {
        result.current.setActiveTopic(null);
      });
      expect(result.current.panelState.activeTopic).toBe(null);
    });

    it('should persist active topic to sessionStorage', () => {
      const { result } = renderHook(() => usePanelState());

      act(() => {
        result.current.setActiveTopic('topic-456');
      });

      const saved = JSON.parse(sessionStorage.getItem('discussion-panel-state') || '{}');
      expect(saved.activeTopic).toBe('topic-456');
    });
  });
});
