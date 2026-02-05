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
    element: <TopicsPage />,
  },
  {
    path: '/topics/:id',
    element: <TopicDetailPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/profile/:id',
    element: <UserProfilePage />,
  },
  {
    path: '/notifications',
    element: <NotificationsPage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    path: '/settings/feedback',
    element: <FeedbackPreferencesPage />,
  },
  {
    path: '/verification',
    element: <VerificationPage />,
  },
  {
    path: '/admin/moderation',
    element: <ModerationDashboardPage />,
  },
  {
    path: '/appeals',
    element: <AppealStatusPage />,
  },
  {
    path: '/simulator',
    element: <DiscussionSimulatorPage />,
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
