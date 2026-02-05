import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { apiClient } from '../lib/api';
import { useToast } from './ToastContext';
import { getJWTTimeUntilExpiry } from '../lib/jwt';
import { SessionExpirationModal } from '../components/auth/SessionExpirationModal';
import type { UserProfile } from '../types/user';

/**
 * AuthContext - Global authentication state management
 *
 * Provides user authentication state, login/logout methods, and profile data
 * across the application. Handles token validation, profile fetching, and
 * cross-tab synchronization.
 */

export interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(0);
  const toast = useToast();

  /**
   * Fetch user profile from API
   * Called on mount if token exists, and after login
   */
  const fetchUserProfile = useCallback(async () => {
    try {
      const profile = await apiClient.get<UserProfile>('/users/me');
      setUser(profile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      // Token invalid or expired, clear it
      authService.logout();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * On mount: Check for existing token and fetch profile
   */
  useEffect(() => {
    const token = authService.getAuthToken();
    if (token) {
      // Token exists, fetch profile
      fetchUserProfile();
    } else {
      // No token, not authenticated
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  /**
   * Cross-tab authentication synchronization
   * Listen for storage changes (login/logout in another tab)
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        if (e.newValue) {
          // Token added in another tab, fetch profile
          fetchUserProfile();
        } else {
          // Token removed in another tab, logout this tab
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchUserProfile]);

  /**
   * Login method
   * Calls authService.login (stores tokens), then fetches user profile
   * Returns a Promise that resolves ONLY after state is set
   */
  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      // Show "Still working" message after 3 seconds
      const timeoutId = setTimeout(() => {
        toast.info('Still working on your request...', 3000);
      }, 3000);

      try {
        // Login and store tokens (always stores in localStorage first)
        await authService.login({ email, password });

        // Remember Me logic: Move tokens to sessionStorage if rememberMe is false
        if (!rememberMe) {
          authService.moveTokensToSessionStorage();
        }
        // If rememberMe is true, tokens stay in localStorage (30+ day expiry)

        // Fetch full user profile after successful login
        const profile = await apiClient.get<UserProfile>('/users/me');
        clearTimeout(timeoutId);

        // Set user state immediately
        setUser(profile);
        toast.success(`Welcome back, ${profile.displayName}!`);

        // Wait for next tick to ensure state has propagated
        // This prevents navigation from happening before isAuthenticated becomes true
        await new Promise((resolve) => setTimeout(resolve, 0));
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
    [toast],
  );

  /**
   * Logout method
   * Clears tokens and user state
   */
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    toast.success("You've been logged out");
  }, [toast]);

  /**
   * Refresh user profile
   * Useful for updating profile after changes
   */
  const refreshUserProfile = useCallback(async () => {
    if (authService.getAuthToken()) {
      await fetchUserProfile();
    }
  }, [fetchUserProfile]);

  /**
   * Handle continue session button
   * For now, just closes the modal. In future, this could refresh the token.
   */
  const handleContinueSession = useCallback(() => {
    setShowSessionModal(false);
    // TODO: Implement token refresh in future enhancement
  }, []);

  /**
   * Handle session expiration logout
   * Called when user clicks "Log Out" or when countdown reaches zero
   */
  const handleSessionExpired = useCallback(() => {
    setShowSessionModal(false);
    logout();
  }, [logout]);

  /**
   * Session expiration checking
   * Check token expiry every minute and show warning 5 minutes before expiry
   */
  useEffect(() => {
    if (!user) {
      return; // Not authenticated, no need to check
    }

    const checkTokenExpiry = () => {
      const token = authService.getAuthToken();
      if (!token) {
        return;
      }

      const timeLeft = getJWTTimeUntilExpiry(token);

      // Show warning modal 5 minutes (300 seconds) before expiry
      if (timeLeft > 0 && timeLeft <= 300) {
        setSessionTimeRemaining(Math.floor(timeLeft));
        setShowSessionModal(true);
      } else if (timeLeft === 0) {
        // Token expired, auto-logout
        logout();
      }
    };

    // Check immediately
    checkTokenExpiry();

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60000);

    return () => clearInterval(interval);
  }, [user, logout]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionExpirationModal
        isOpen={showSessionModal}
        timeRemaining={sessionTimeRemaining}
        onContinue={handleContinueSession}
        onLogout={handleSessionExpired}
      />
    </AuthContext.Provider>
  );
}
