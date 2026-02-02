import type { RouteObject } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import { LoginPage, RegisterPage, ForgotPasswordPage } from '../pages/Auth';
import { SignupPage } from '../pages/SignupPage';
import { AuthCallbackPage } from '../pages/AuthCallbackPage';
import TopicsPage from '../pages/Topics';
import TopicDetailPage from '../pages/Topics/TopicDetailPage';
import CommonGroundDemoPage from '../pages/Topics/CommonGroundDemoPage';
import AgreementVisualizationDemoPage from '../pages/Topics/AgreementVisualizationDemoPage';
import { DemoCredentialsPage } from '../pages/Demo';
import LoadingDemo from '../pages/Demo/LoadingDemo';
import { ProfilePage, UserProfilePage } from '../pages/Profile';
import { FeedbackPreferencesPage } from '../pages/Settings';
import { VerificationPage } from '../pages/Verification/VerificationPage';
import ModerationDashboardPage from '../pages/Admin/ModerationDashboardPage';
import AppealStatusPage from '../pages/Appeal/AppealStatusPage';
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
    element: <HomePage />,
  },
  {
    path: '/about',
    element: <AboutPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
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
    path: '/demo/common-ground',
    element: <CommonGroundDemoPage />,
  },
  {
    path: '/demo/agreement-visualization',
    element: <AgreementVisualizationDemoPage />,
  },
  {
    path: '/demo/credentials',
    element: <DemoCredentialsPage />,
  },
  {
    path: '/demo/loading',
    element: <LoadingDemo />,
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
    path: '*',
    element: <NotFoundPage />,
  },
];
