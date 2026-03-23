/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for FactCheckContext
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { FactCheckProvider, useFactCheck } from '../FactCheckContext';
import { factCheckService } from '../../services/factCheckService';

vi.mock('../../services/factCheckService', () => ({
  factCheckService: {
    extractClaims: vi.fn(),
    checkClaims: vi.fn(),
  },
}));

const createWrapper = () => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <FactCheckProvider>{children}</FactCheckProvider>
  );
  Wrapper.displayName = 'TestFactCheckWrapper';
  return Wrapper;
};

describe('FactCheckContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test since React will log the error
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useFactCheck('test-id'));
    }).toThrow('useFactCheck must be used within a FactCheckProvider');

    consoleSpy.mockRestore();
  });

  it('should return idle state for unknown responseId', () => {
    const { result } = renderHook(() => useFactCheck('unknown-id'), {
      wrapper: createWrapper(),
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.claims).toBeNull();
  });

  describe('checkClaims', () => {
    it('should update status through loading to success', async () => {
      const mockClaims = [{ text: 'Test claim', startOffset: 0, endOffset: 10 }];
      const mockResults = [
        {
          id: '1',
          claimText: 'Test claim',
          claimStartOffset: 0,
          claimEndOffset: 10,
          displayedAs: 'Related Context',
          sources: [
            {
              provider: 'Test',
              url: 'https://test.com',
              title: 'Test',
              credibilityScore: 0.8,
              retrievedAt: new Date().toISOString(),
            },
          ],
          hasConflictingSources: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      vi.mocked(factCheckService.extractClaims).mockReturnValue(mockClaims);
      vi.mocked(factCheckService.checkClaims).mockResolvedValue({
        results: mockResults,
        processingTimeMs: 100,
      });

      const { result } = renderHook(() => useFactCheck('test-response'), {
        wrapper: createWrapper(),
      });

      expect(result.current.status).toBe('idle');

      await act(async () => {
        await result.current.checkClaims('Some content with claims.');
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      expect(result.current.results).toEqual(mockResults);
      expect(result.current.claims).toHaveLength(1);
      expect(result.current.claims?.[0]).toEqual({
        text: 'Test claim',
        startOffset: 0,
        endOffset: 10,
      });
    });

    it('should set no-results status when no claims are extracted', async () => {
      vi.mocked(factCheckService.extractClaims).mockReturnValue([]);

      const { result } = renderHook(() => useFactCheck('test-response'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkClaims('Short text.');
      });

      await waitFor(() => {
        expect(result.current.status).toBe('no-results');
      });

      expect(result.current.results).toEqual([]);
      expect(factCheckService.checkClaims).not.toHaveBeenCalled();
    });

    it('should set no-results status when API returns empty results', async () => {
      const mockClaims = [{ text: 'Test claim', startOffset: 0, endOffset: 10 }];

      vi.mocked(factCheckService.extractClaims).mockReturnValue(mockClaims);
      vi.mocked(factCheckService.checkClaims).mockResolvedValue({
        results: [],
        processingTimeMs: 50,
      });

      const { result } = renderHook(() => useFactCheck('test-response'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkClaims('Some content with claims.');
      });

      await waitFor(() => {
        expect(result.current.status).toBe('no-results');
      });

      expect(result.current.results).toEqual([]);
    });

    it('should set error status when API call fails', async () => {
      const mockClaims = [{ text: 'Test claim', startOffset: 0, endOffset: 10 }];

      vi.mocked(factCheckService.extractClaims).mockReturnValue(mockClaims);
      vi.mocked(factCheckService.checkClaims).mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useFactCheck('test-response'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkClaims('Some content with claims.');
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.error).toBe('API error');
      expect(result.current.results).toBeNull();
    });

    it('should handle non-Error exceptions', async () => {
      const mockClaims = [{ text: 'Test claim', startOffset: 0, endOffset: 10 }];

      vi.mocked(factCheckService.extractClaims).mockReturnValue(mockClaims);
      vi.mocked(factCheckService.checkClaims).mockRejectedValue('String error');

      const { result } = renderHook(() => useFactCheck('test-response'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkClaims('Some content with claims.');
      });

      await waitFor(() => {
        expect(result.current.status).toBe('error');
      });

      expect(result.current.error).toBe('Failed to check claims');
    });
  });

  describe('clearResults', () => {
    it('should reset state to idle after clearing', async () => {
      const mockClaims = [{ text: 'Test claim', startOffset: 0, endOffset: 10 }];
      const mockResults = [
        {
          id: '1',
          claimText: 'Test claim',
          claimStartOffset: 0,
          claimEndOffset: 10,
          displayedAs: 'Related Context',
          sources: [],
          hasConflictingSources: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      vi.mocked(factCheckService.extractClaims).mockReturnValue(mockClaims);
      vi.mocked(factCheckService.checkClaims).mockResolvedValue({
        results: mockResults,
        processingTimeMs: 100,
      });

      const { result } = renderHook(() => useFactCheck('test-response'), {
        wrapper: createWrapper(),
      });

      // First, check claims
      await act(async () => {
        await result.current.checkClaims('Some content.');
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      // Then clear
      act(() => {
        result.current.clear();
      });

      // Should be back to idle state
      expect(result.current.status).toBe('idle');
      expect(result.current.results).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.claims).toBeNull();
    });
  });

  describe('getHighlightedClaims', () => {
    it('should filter out claims without offset positions', async () => {
      const mockClaims = [{ text: 'Test claim', startOffset: 0, endOffset: 10 }];
      const mockResults = [
        {
          id: '1',
          claimText: 'Claim with offsets',
          claimStartOffset: 0,
          claimEndOffset: 18,
          displayedAs: 'Related Context',
          sources: [],
          hasConflictingSources: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          id: '2',
          claimText: 'Claim without offsets',
          // No claimStartOffset or claimEndOffset
          displayedAs: 'Related Context',
          sources: [],
          hasConflictingSources: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      vi.mocked(factCheckService.extractClaims).mockReturnValue(mockClaims);
      vi.mocked(factCheckService.checkClaims).mockResolvedValue({
        results: mockResults,
        processingTimeMs: 100,
      });

      const { result } = renderHook(() => useFactCheck('test-response'), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.checkClaims('Some content.');
      });

      await waitFor(() => {
        expect(result.current.status).toBe('success');
      });

      // Should only include the claim with offsets
      expect(result.current.claims).toHaveLength(1);
      expect(result.current.claims?.[0]).toEqual({
        text: 'Claim with offsets',
        startOffset: 0,
        endOffset: 18,
      });
    });
  });

  describe('multiple responses', () => {
    it('should maintain separate state for different responseIds', async () => {
      const mockClaims1 = [{ text: 'Claim 1', startOffset: 0, endOffset: 7 }];
      const mockClaims2 = [{ text: 'Claim 2', startOffset: 0, endOffset: 7 }];
      const mockResults1 = [
        {
          id: '1',
          claimText: 'Claim 1',
          claimStartOffset: 0,
          claimEndOffset: 7,
          displayedAs: 'Related Context',
          sources: [],
          hasConflictingSources: false,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        },
      ];

      // First call for response1
      vi.mocked(factCheckService.extractClaims).mockReturnValueOnce(mockClaims1);
      vi.mocked(factCheckService.checkClaims).mockResolvedValueOnce({
        results: mockResults1,
        processingTimeMs: 100,
      });

      // Second call for response2 will fail
      vi.mocked(factCheckService.extractClaims).mockReturnValueOnce(mockClaims2);
      vi.mocked(factCheckService.checkClaims).mockRejectedValueOnce(new Error('Failed'));

      const wrapper = createWrapper();

      const { result: result1 } = renderHook(() => useFactCheck('response-1'), { wrapper });
      const { result: result2 } = renderHook(() => useFactCheck('response-2'), { wrapper });

      // Check claims for response 1
      await act(async () => {
        await result1.current.checkClaims('Content 1');
      });

      await waitFor(() => {
        expect(result1.current.status).toBe('success');
      });

      // Check claims for response 2
      await act(async () => {
        await result2.current.checkClaims('Content 2');
      });

      await waitFor(() => {
        expect(result2.current.status).toBe('error');
      });

      // Response 1 should still be success
      expect(result1.current.status).toBe('success');
      expect(result1.current.results).toEqual(mockResults1);

      // Response 2 should be error
      expect(result2.current.status).toBe('error');
      expect(result2.current.error).toBe('Failed');
    });
  });
});
