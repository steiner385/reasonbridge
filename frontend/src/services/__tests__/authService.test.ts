/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authService } from '../authService';

describe('AuthService', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('getAuthToken', () => {
    it('should return null when no token exists', () => {
      expect(authService.getAuthToken()).toBeNull();
    });

    it('should return token from localStorage', () => {
      localStorage.setItem('authToken', 'local-token');
      expect(authService.getAuthToken()).toBe('local-token');
    });

    it('should return token from sessionStorage', () => {
      sessionStorage.setItem('authToken', 'session-token');
      expect(authService.getAuthToken()).toBe('session-token');
    });

    it('should prefer localStorage over sessionStorage', () => {
      localStorage.setItem('authToken', 'local-token');
      sessionStorage.setItem('authToken', 'session-token');
      expect(authService.getAuthToken()).toBe('local-token');
    });
  });

  describe('logout', () => {
    it('should clear tokens from both storage locations', () => {
      localStorage.setItem('authToken', 'local-auth');
      localStorage.setItem('refreshToken', 'local-refresh');
      sessionStorage.setItem('authToken', 'session-auth');
      sessionStorage.setItem('refreshToken', 'session-refresh');

      authService.logout();

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(sessionStorage.getItem('authToken')).toBeNull();
      expect(sessionStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('moveTokensToSessionStorage', () => {
    it('should move tokens from localStorage to sessionStorage', () => {
      localStorage.setItem('authToken', 'auth-token');
      localStorage.setItem('refreshToken', 'refresh-token');

      authService.moveTokensToSessionStorage();

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(sessionStorage.getItem('authToken')).toBe('auth-token');
      expect(sessionStorage.getItem('refreshToken')).toBe('refresh-token');
    });

    it('should do nothing if tokens are not in localStorage', () => {
      sessionStorage.setItem('authToken', 'existing-session');

      authService.moveTokensToSessionStorage();

      expect(sessionStorage.getItem('authToken')).toBe('existing-session');
    });
  });

  describe('enforceSessionOnlyForMinor', () => {
    it('should do nothing for non-minor users', () => {
      localStorage.setItem('authToken', 'auth-token');
      localStorage.setItem('refreshToken', 'refresh-token');

      authService.enforceSessionOnlyForMinor(false);

      // Tokens should remain in localStorage
      expect(localStorage.getItem('authToken')).toBe('auth-token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
      expect(sessionStorage.getItem('authToken')).toBeNull();
      expect(sessionStorage.getItem('refreshToken')).toBeNull();
    });

    it('should move tokens to sessionStorage for minor users', () => {
      localStorage.setItem('authToken', 'minor-auth');
      localStorage.setItem('refreshToken', 'minor-refresh');

      authService.enforceSessionOnlyForMinor(true);

      // Tokens should be moved to sessionStorage
      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(sessionStorage.getItem('authToken')).toBe('minor-auth');
      expect(sessionStorage.getItem('refreshToken')).toBe('minor-refresh');
    });

    it('should handle only authToken in localStorage', () => {
      localStorage.setItem('authToken', 'auth-only');

      authService.enforceSessionOnlyForMinor(true);

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(sessionStorage.getItem('authToken')).toBe('auth-only');
    });

    it('should do nothing if tokens are already in sessionStorage', () => {
      sessionStorage.setItem('authToken', 'session-auth');
      sessionStorage.setItem('refreshToken', 'session-refresh');

      authService.enforceSessionOnlyForMinor(true);

      // Tokens should remain in sessionStorage
      expect(sessionStorage.getItem('authToken')).toBe('session-auth');
      expect(sessionStorage.getItem('refreshToken')).toBe('session-refresh');
      expect(localStorage.getItem('authToken')).toBeNull();
    });

    it('should be idempotent for repeated calls', () => {
      localStorage.setItem('authToken', 'auth-token');
      localStorage.setItem('refreshToken', 'refresh-token');

      authService.enforceSessionOnlyForMinor(true);
      authService.enforceSessionOnlyForMinor(true);
      authService.enforceSessionOnlyForMinor(true);

      // Should still work correctly
      expect(sessionStorage.getItem('authToken')).toBe('auth-token');
      expect(sessionStorage.getItem('refreshToken')).toBe('refresh-token');
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token exists', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true when token exists in localStorage', () => {
      localStorage.setItem('authToken', 'token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return true when token exists in sessionStorage', () => {
      sessionStorage.setItem('authToken', 'token');
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('getAuthHeader', () => {
    it('should return empty object when no token exists', () => {
      expect(authService.getAuthHeader()).toEqual({});
    });

    it('should return Authorization header when token exists', () => {
      localStorage.setItem('authToken', 'my-token');
      expect(authService.getAuthHeader()).toEqual({
        Authorization: 'Bearer my-token',
      });
    });
  });
});
