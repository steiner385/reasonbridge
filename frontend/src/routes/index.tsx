import type { RouteObject } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';
import AboutPage from '../pages/AboutPage';
import { RegisterPage, ForgotPasswordPage } from '../pages/Auth';
import { SignupPage } from '../pages/SignupPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import TopicsPage from '../pages/Topics';
import TopicDetailPage from '../pages/Topics/TopicDetailPage';
import { ProfilePage, UserProfilePage } from '../pages/Profile';
import { FeedbackPreferencesPage, SettingsPage } from '../pages/Settings';
import { VerificationPage } from '../pages/Verification/VerificationPage';
import ModerationDashboardPage from '../pages/Admin/ModerationDashboardPage';
import AppealStatusPage from '../pages/Appeal/AppealStatusPage';
import DiscussionSimulatorPage from '../pages/DiscussionSimulatorPage';
import NotificationsPage from '../pages/NotificationsPage';
import TermsPage from '../pages/TermsPage';
import PrivacyPage from '../pages/PrivacyPage';
import NotFoundPage from '../pages/NotFoundPage';
import { ProtectedRoute } from '../components/auth';

/**
 * Route definitions for the ReasonBridge application.
 *
 * This file defines all routes using React Router v7.
 * Each route maps a URL path to a component.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/auth/callback/:provider',
    element: <AuthCallbackPage />,
  },
  {
    path: '/topics',
    element: (
      <ProtectedRoute>
        <TopicsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/topics/:id',
    element: (
      <ProtectedRoute>
        <TopicDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile/:id',
    element: (
      <ProtectedRoute>
        <UserProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/feedback',
    element: (
      <ProtectedRoute>
        <FeedbackPreferencesPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/verification',
    element: (
      <ProtectedRoute>
        <VerificationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/moderation',
    element: (
      <ProtectedRoute>
        <ModerationDashboardPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/appeals',
    element: (
      <ProtectedRoute>
        <AppealStatusPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/simulator',
    element: (
      <ProtectedRoute>
        <DiscussionSimulatorPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];
