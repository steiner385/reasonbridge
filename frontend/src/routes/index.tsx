import type { RouteObject } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import TopicsPage from '../pages/Topics';
import TopicDetailPage from '../pages/Topics/TopicDetailPage';
import { ProfilePage, UserProfilePage } from '../pages/Profile';
import NotFoundPage from '../pages/NotFoundPage';

/**
 * Route definitions for the Unite Discord application.
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
    path: '*',
    element: <NotFoundPage />,
  },
];
