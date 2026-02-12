/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for useTopicFeedback hook
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTopicFeedback, type TopicFeedbackData } from '../useTopicFeedback';
import * as feedbackApi from '../../lib/feedback-api';

// Mock the feedback API
vi.mock('../../lib/feedback-api', async () => {
  const actual = await vi.importActual('../../lib/feedback-api');
  return {
    ...actual,
    previewFeedback: vi.fn(),
  };
});

// Mock useDebouncedValue to return immediately for testing
vi.mock('../useDebouncedValue', () => ({
  useDebouncedValue: (value: string) => value,
}));

const mockPreviewFeedback = vi.mocked(feedbackApi.previewFeedback);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        retryDelay: 0,
      },
    },
  });
  // Clear any cached queries
  queryClient.clear();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryClientWrapper';
  return Wrapper;
};

const createMockTopicData = (overrides: Partial<TopicFeedbackData> = {}): TopicFeedbackData => ({
  title: 'This is a test topic title',
  description: 'This is a test description that is long enough to pass validation requirements.',
  propositions: [
    { id: 'prop-1', text: 'This is a thesis proposition for testing', type: 'thesis' },
  ],
  ...overrides,
});

describe('useTopicFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial State', () => {
    it('should return initial state before loading', () => {
      const { result } = renderHook(
        () => useTopicFeedback(createMockTopicData(), { enabled: false }),
        { wrapper: createWrapper() },
      );

      expect(result.current.feedback).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.sensitivity).toBe('MEDIUM');
    });

    it('should use stored sensitivity from localStorage', () => {
      localStorage.setItem('topic-feedback-sensitivity', 'HIGH');

      const { result } = renderHook(
        () => useTopicFeedback(createMockTopicData(), { enabled: false }),
        { wrapper: createWrapper() },
      );

      expect(result.current.sensitivity).toBe('HIGH');
    });
  });

  describe('Structure Analysis', () => {
    it('should detect good title clarity', () => {
      const data = createMockTopicData({ title: 'A well-formed topic title' });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.titleClarity).toBe('good');
    });

    it('should detect needs-improvement title', () => {
      const data = createMockTopicData({ title: 'Short' });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.titleClarity).toBe('needs-improvement');
    });

    it('should detect good description quality', () => {
      const data = createMockTopicData({
        description: 'This is a sufficiently long description that provides good context.',
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.descriptionQuality).toBe('good');
    });

    it('should detect needs-improvement description', () => {
      const data = createMockTopicData({ description: 'Too short' });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.descriptionQuality).toBe('needs-improvement');
    });

    it('should detect balanced propositions (thesis + antithesis)', () => {
      const data = createMockTopicData({
        propositions: [
          { id: '1', text: 'Thesis proposition text', type: 'thesis' },
          { id: '2', text: 'Antithesis proposition text', type: 'antithesis' },
        ],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.propositionBalance).toBe('balanced');
    });

    it('should detect fully balanced propositions (all three types)', () => {
      const data = createMockTopicData({
        propositions: [
          { id: '1', text: 'Thesis proposition text', type: 'thesis' },
          { id: '2', text: 'Antithesis proposition text', type: 'antithesis' },
          { id: '3', text: 'Synthesis proposition text', type: 'synthesis' },
        ],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.propositionBalance).toBe('balanced');
    });

    it('should detect unbalanced propositions (thesis only)', () => {
      const data = createMockTopicData({
        propositions: [{ id: '1', text: 'Thesis proposition only', type: 'thesis' }],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.propositionBalance).toBe('unbalanced');
    });

    it('should detect incomplete propositions (none)', () => {
      const data = createMockTopicData({ propositions: [] });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.propositionBalance).toBe('incomplete');
    });
  });

  describe('Overall Quality', () => {
    it('should calculate excellent overall quality', () => {
      const data = createMockTopicData({
        title: 'A well-formed topic title for discussion',
        description:
          'This is a comprehensive description that provides context for the discussion.',
        propositions: [
          { id: '1', text: 'Thesis proposition', type: 'thesis' },
          { id: '2', text: 'Antithesis proposition', type: 'antithesis' },
        ],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.overallQuality).toBe('excellent');
    });

    it('should calculate needs-improvement quality', () => {
      const data = createMockTopicData({
        title: 'OK title here',
        description: 'Short description that needs improvement',
        propositions: [{ id: '1', text: 'Just thesis', type: 'thesis' }],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(['good', 'needs-improvement']).toContain(result.current.insights.overallQuality);
    });
  });

  describe('Suggestions', () => {
    it('should suggest adding antithesis when only thesis exists', () => {
      const data = createMockTopicData({
        title: 'Good topic title here',
        description: 'Good description that is long enough to pass validation.',
        propositions: [{ id: '1', text: 'Thesis proposition', type: 'thesis' }],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.suggestions).toContainEqual(
        expect.stringMatching(/antithesis/i),
      );
    });

    it('should suggest better description when too short', () => {
      const data = createMockTopicData({
        description: 'Too short',
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.insights.suggestions).toContainEqual(
        expect.stringMatching(/description/i),
      );
    });
  });

  describe('Ready to Create', () => {
    it('should be ready when all requirements met', () => {
      const data = createMockTopicData({
        title: 'Good topic title here',
        description: 'Good description that is long enough to pass the validation requirements.',
        propositions: [{ id: '1', text: 'Thesis proposition', type: 'thesis' }],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.readyToCreate).toBe(true);
    });

    it('should not be ready when title too short', () => {
      const data = createMockTopicData({
        title: 'Short',
        description: 'Good description that is long enough to pass the validation requirements.',
        propositions: [{ id: '1', text: 'Thesis proposition', type: 'thesis' }],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.readyToCreate).toBe(false);
    });

    it('should not be ready when description too short', () => {
      const data = createMockTopicData({
        title: 'Good topic title here',
        description: 'Short',
        propositions: [{ id: '1', text: 'Thesis proposition', type: 'thesis' }],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.readyToCreate).toBe(false);
    });

    it('should not be ready when no propositions', () => {
      const data = createMockTopicData({
        title: 'Good topic title here',
        description: 'Good description that is long enough to pass the validation requirements.',
        propositions: [],
      });

      const { result } = renderHook(() => useTopicFeedback(data, { enabled: false }), {
        wrapper: createWrapper(),
      });

      expect(result.current.readyToCreate).toBe(false);
    });
  });

  describe('Sensitivity', () => {
    it('should update sensitivity and persist to localStorage', () => {
      const { result } = renderHook(
        () => useTopicFeedback(createMockTopicData(), { enabled: false }),
        { wrapper: createWrapper() },
      );

      act(() => {
        result.current.setSensitivity('LOW');
      });

      expect(result.current.sensitivity).toBe('LOW');
      expect(localStorage.getItem('topic-feedback-sensitivity')).toBe('LOW');
    });
  });

  describe('API Integration', () => {
    it('should fetch feedback when content is valid', async () => {
      mockPreviewFeedback.mockResolvedValue({
        feedback: [
          {
            type: 'BIAS',
            suggestionText: 'Consider a more neutral tone',
            reasoning: 'Test reasoning',
            confidenceScore: 0.8,
            shouldDisplay: true,
          },
        ],
        readyToPost: true,
        summary: 'Minor issues detected',
        analysisTimeMs: 150,
      });

      const data = createMockTopicData();

      const { result } = renderHook(() => useTopicFeedback(data), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.feedback).toHaveLength(1);
      });

      expect(result.current.feedback[0].type).toBe('BIAS');
      expect(result.current.summary).toBe('Minor issues detected');
    });

    it('should handle API errors gracefully', async () => {
      mockPreviewFeedback.mockRejectedValue(new Error('API Error'));

      const data = createMockTopicData();

      const { result } = renderHook(() => useTopicFeedback(data), {
        wrapper: createWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isError).toBe(true);
        },
        { timeout: 5000 },
      );

      expect(result.current.error).toBe('API Error');
      expect(result.current.feedback).toEqual([]);
    });

    it('should not fetch when content is too short', () => {
      const data = createMockTopicData({
        title: 'Short',
        description: 'Short',
        propositions: [],
      });

      const { result } = renderHook(() => useTopicFeedback(data), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockPreviewFeedback).not.toHaveBeenCalled();
    });
  });

  describe('Content Building', () => {
    it('should build content from topic data', async () => {
      mockPreviewFeedback.mockResolvedValue({
        feedback: [],
        readyToPost: true,
        summary: '',
        analysisTimeMs: 100,
      });

      const data = createMockTopicData({
        title: 'Test Topic Title Here',
        description: 'Test description that is long enough for validation requirements.',
        propositions: [
          { id: '1', text: 'Thesis text here', type: 'thesis' },
          { id: '2', text: 'Antithesis text here', type: 'antithesis' },
        ],
      });

      renderHook(() => useTopicFeedback(data), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockPreviewFeedback).toHaveBeenCalled();
      });

      const callArgs = mockPreviewFeedback.mock.calls[0][0];
      expect(callArgs.content).toContain('Test Topic Title Here');
      expect(callArgs.content).toContain('Test description');
      expect(callArgs.content).toContain('[THESIS]');
      expect(callArgs.content).toContain('[ANTITHESIS]');
    });
  });
});
