/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable react-refresh/only-export-components */
// Disable react-refresh warning: This file intentionally exports both
// lazy-loaded component definitions and helper components (LazyRoute,
// PageLoadingFallback). This is the standard pattern for route-based
// code splitting with React.lazy().

import { lazy, Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';
import { Navigate, useParams } from 'react-router-dom';
// Eager-loaded components (critical path)
import { LandingPage } from '../pages/LandingPage';
import NotFoundPage from '../pages/NotFoundPage';
import { ProtectedRoute } from '../components/auth';
// Lazy-loaded page components for code splitting
const AboutPage = lazy(() => import('../pages/AboutPage'));
const RegisterPage = lazy(() => import('../pages/Auth').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() =>
  import('../pages/Auth').then((m) => ({ default: m.ForgotPasswordPage })),
);
const SignupPage = lazy(() =>
  import('../pages/SignupPage').then((m) => ({ default: m.SignupPage })),
);
const AuthCallbackPage = lazy(() =>
  import('../pages/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })),
);
const TopicsPage = lazy(() => import('../pages/Topics'));
const DiscussionPage = lazy(() =>
  import('../pages/Topics/DiscussionPage').then((m) => ({ default: m.DiscussionPage })),
);
const ProfilePage = lazy(() =>
  import('../pages/Profile').then((m) => ({ default: m.ProfilePage })),
);
const UserProfilePage = lazy(() =>
  import('../pages/Profile').then((m) => ({ default: m.UserProfilePage })),
);
const FeedbackPreferencesPage = lazy(() =>
  import('../pages/Settings').then((m) => ({ default: m.FeedbackPreferencesPage })),
);
const SettingsPage = lazy(() =>
  import('../pages/Settings').then((m) => ({ default: m.SettingsPage })),
);
const VerificationPage = lazy(() =>
  import('../pages/Verification/VerificationPage').then((m) => ({ default: m.VerificationPage })),
);
const ModerationDashboardPage = lazy(() => import('../pages/Admin/ModerationDashboardPage'));
const SafetyReportsPage = lazy(() => import('../pages/Admin/SafetyReportsPage'));
const RankingAnalyticsPage = lazy(() => import('../pages/Admin/RankingAnalytics'));
const AppealStatusPage = lazy(() => import('../pages/Appeal/AppealStatusPage'));
const DiscussionSimulatorPage = lazy(() => import('../pages/DiscussionSimulatorPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const ActivityFeedPage = lazy(() =>
  import('../pages/Feed').then((m) => ({ default: m.ActivityFeedPage })),
);
const TermsPage = lazy(() => import('../pages/TermsPage'));
const PrivacyPage = lazy(() => import('../pages/PrivacyPage'));
const ConsentPendingPage = lazy(() =>
  import('../pages/ParentalConsent').then((m) => ({ default: m.ConsentPendingPage })),
);
const ConsentVerifyPage = lazy(() =>
  import('../pages/ParentalConsent').then((m) => ({ default: m.ConsentVerifyPage })),
);
const ParentalDashboardPage = lazy(() =>
  import('../pages/ParentalConsent').then((m) => ({ default: m.ParentalDashboardPage })),
);

/**
 * Loading fallback for lazy-loaded routes
 * Uses transparent background to avoid flash during route transitions
 * and matches App wrapper's background colors for consistency
 */
function PageLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    </div>
  );
}

/**
 * Wrapper component for lazy-loaded routes with Suspense
 */
function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoadingFallback />}>{children}</Suspense>;
}

/**
 * Redirect component for /topics/:id -> /discussions?topic=:id
 * Provides backward compatibility for old topic detail URLs
 */
function TopicRedirect() {
  const { id } = useParams();
  return <Navigate to={`/discussions?topic=${id}`} replace />;
}

/**
 * Route definitions for the ReasonBridge application.
 *
 * This file defines all routes using React Router v7.
 * Each route maps a URL path to a component.
 *
 * Code splitting is implemented using React.lazy() for all pages except:
 * - LandingPage (critical entry point, must load instantly)
 * - NotFoundPage (should show immediately for better UX)
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/about',
    element: (
      <LazyRoute>
        <AboutPage />
      </LazyRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <LazyRoute>
        <RegisterPage />
      </LazyRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <LazyRoute>
        <ForgotPasswordPage />
      </LazyRoute>
    ),
  },
  {
    path: '/signup',
    element: (
      <LazyRoute>
        <SignupPage />
      </LazyRoute>
    ),
  },
  {
    path: '/auth/callback/:provider',
    element: (
      <LazyRoute>
        <AuthCallbackPage />
      </LazyRoute>
    ),
  },
  {
    path: '/topics',
    element: (
      <LazyRoute>
        <TopicsPage />
      </LazyRoute>
    ),
  },
  {
    path: '/topics/:id',
    element: <TopicRedirect />,
  },
  {
    path: '/discussions',
    element: (
      <LazyRoute>
        <DiscussionPage />
      </LazyRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <LazyRoute>
        <ProfilePage />
      </LazyRoute>
    ),
  },
  {
    path: '/profile/:id',
    element: (
      <LazyRoute>
        <UserProfilePage />
      </LazyRoute>
    ),
  },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <NotificationsPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/feed',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <ActivityFeedPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <SettingsPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/feedback',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <FeedbackPreferencesPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/verification',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <VerificationPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  // Parental Consent Routes
  {
    path: '/parental-consent/pending',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <ConsentPendingPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/parental-consent/verify/:token',
    element: (
      <LazyRoute>
        <ConsentVerifyPage />
      </LazyRoute>
    ),
  },
  {
    path: '/parental-dashboard/:token',
    element: (
      <LazyRoute>
        <ParentalDashboardPage />
      </LazyRoute>
    ),
  },
  {
    path: '/admin/moderation',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <ModerationDashboardPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/safety-reports',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <SafetyReportsPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/ranking',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <RankingAnalyticsPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/appeals',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <AppealStatusPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/simulator',
    element: (
      <ProtectedRoute>
        <LazyRoute>
          <DiscussionSimulatorPage />
        </LazyRoute>
      </ProtectedRoute>
    ),
  },
  {
    path: '/terms',
    element: (
      <LazyRoute>
        <TermsPage />
      </LazyRoute>
    ),
  },
  {
    path: '/privacy',
    element: (
      <LazyRoute>
        <PrivacyPage />
      </LazyRoute>
    ),
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
