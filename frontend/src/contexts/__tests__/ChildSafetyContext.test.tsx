/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for ChildSafetyContext
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ChildSafetyProvider, useChildSafety, type RestrictedFeature } from '../ChildSafetyContext';
import * as AuthContextModule from '../AuthContext';
import type { UserProfile, VerificationLevel, UserStatus } from '../../types/user';

// Mock the AuthContext module
vi.mock('../AuthContext', () => ({
  useAuthContext: vi.fn(),
}));

const mockUseAuthContext = vi.mocked(AuthContextModule.useAuthContext);

const createMockUser = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  verificationLevel: 'BASIC' as VerificationLevel,
  trustScoreAbility: 50,
  trustScoreBenevolence: 50,
  trustScoreIntegrity: 50,
  status: 'ACTIVE' as UserStatus,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  isMinor: false,
  ...overrides,
});

const createWrapper = () => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ChildSafetyProvider>{children}</ChildSafetyProvider>
  );
  Wrapper.displayName = 'TestChildSafetyWrapper';
  return Wrapper;
};

describe('ChildSafetyContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isChildMode', () => {
    it('should return isChildMode=true when user.isMinor=true', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: true }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isChildMode).toBe(true);
    });

    it('should return isChildMode=false when user.isMinor=false', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: false }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isChildMode).toBe(false);
    });

    it('should return isChildMode=false when user is null', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isChildMode).toBe(false);
    });

    it('should return isChildMode=false when user.isMinor is undefined', () => {
      const userWithoutIsMinor = createMockUser();
      delete (userWithoutIsMinor as Partial<UserProfile>).isMinor;

      mockUseAuthContext.mockReturnValue({
        user: userWithoutIsMinor,
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isChildMode).toBe(false);
    });
  });

  describe('restrictedFeatures', () => {
    it('should set correct restricted features for minors', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: true }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      const expectedFeatures: RestrictedFeature[] = [
        'DM',
        'USER_SEARCH',
        'PROFILE_EDIT',
        'SOCIAL_LINKS',
        'EXTERNAL_LINKS',
        'FILE_UPLOAD',
      ];

      expect(result.current.restrictedFeatures).toEqual(expectedFeatures);
    });

    it('should have empty restricted features for non-minors', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: false }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.restrictedFeatures).toEqual([]);
    });
  });

  describe('isFeatureRestricted', () => {
    it('should return true for restricted features when user is minor', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: true }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFeatureRestricted('DM')).toBe(true);
      expect(result.current.isFeatureRestricted('USER_SEARCH')).toBe(true);
      expect(result.current.isFeatureRestricted('PROFILE_EDIT')).toBe(true);
      expect(result.current.isFeatureRestricted('SOCIAL_LINKS')).toBe(true);
      expect(result.current.isFeatureRestricted('EXTERNAL_LINKS')).toBe(true);
      expect(result.current.isFeatureRestricted('FILE_UPLOAD')).toBe(true);
    });

    it('should return false for all features when user is not minor', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: false }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isFeatureRestricted('DM')).toBe(false);
      expect(result.current.isFeatureRestricted('USER_SEARCH')).toBe(false);
      expect(result.current.isFeatureRestricted('PROFILE_EDIT')).toBe(false);
      expect(result.current.isFeatureRestricted('SOCIAL_LINKS')).toBe(false);
      expect(result.current.isFeatureRestricted('EXTERNAL_LINKS')).toBe(false);
      expect(result.current.isFeatureRestricted('FILE_UPLOAD')).toBe(false);
    });
  });

  describe('showPanicButton', () => {
    it('should show panic button when user is minor (matches isChildMode)', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: true }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.showPanicButton).toBe(true);
      expect(result.current.showPanicButton).toBe(result.current.isChildMode);
    });

    it('should hide panic button when user is not minor (matches isChildMode)', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: false }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.showPanicButton).toBe(false);
      expect(result.current.showPanicButton).toBe(result.current.isChildMode);
    });
  });

  describe('uiTheme', () => {
    it('should return child-friendly theme for minors', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: true }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.uiTheme).toBe('child-friendly');
    });

    it('should return standard theme for non-minors', () => {
      mockUseAuthContext.mockReturnValue({
        user: createMockUser({ isMinor: false }),
        isAuthenticated: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.uiTheme).toBe('standard');
    });

    it('should return standard theme when user is null', () => {
      mockUseAuthContext.mockReturnValue({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        refreshUserProfile: vi.fn(),
      });

      const { result } = renderHook(() => useChildSafety(), {
        wrapper: createWrapper(),
      });

      expect(result.current.uiTheme).toBe('standard');
    });
  });

  describe('useChildSafety hook error handling', () => {
    it('should throw error when useChildSafety is used outside provider', () => {
      // Suppress console.error for this test since React will log the error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useChildSafety());
      }).toThrow('useChildSafety must be used within ChildSafetyProvider');

      consoleSpy.mockRestore();
    });
  });
});
