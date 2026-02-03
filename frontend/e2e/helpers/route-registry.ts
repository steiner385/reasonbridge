/**
 * Route Registry for Navigation Crawl E2E Tests
 *
 * Single source of truth for all application routes.
 * When adding new routes to the app, update this registry.
 */

export interface RouteDefinition {
  path: string;
  name: string;
  requiresAuth: boolean;
  isDynamic: boolean;
  testParams?: Record<string, string>; // For dynamic routes like /topics/:id
  skipReason?: string; // For routes that can't be tested in isolation
}

/**
 * Complete registry of all application routes.
 * Routes are organized by category for clarity.
 */
export const ROUTE_REGISTRY: RouteDefinition[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Public Routes - No authentication required
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/',
    name: 'Home',
    requiresAuth: false,
    isDynamic: false,
  },
  {
    path: '/about',
    name: 'About',
    requiresAuth: false,
    isDynamic: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Authentication Routes - Login and registration flows
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/login',
    name: 'Login',
    requiresAuth: false,
    isDynamic: false,
  },
  {
    path: '/register',
    name: 'Register',
    requiresAuth: false,
    isDynamic: false,
  },
  {
    path: '/signup',
    name: 'Signup',
    requiresAuth: false,
    isDynamic: false,
  },
  {
    path: '/forgot-password',
    name: 'Forgot Password',
    requiresAuth: false,
    isDynamic: false,
  },
  {
    path: '/auth/callback/:provider',
    name: 'OAuth Callback',
    requiresAuth: false,
    isDynamic: true,
    testParams: { provider: 'google' },
    skipReason: 'Requires OAuth provider redirect flow - tested separately in oauth-flow.spec.ts',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Topics Routes - Discussion topics and details
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/topics',
    name: 'Topics List',
    requiresAuth: false,
    isDynamic: false,
  },
  {
    path: '/topics/:id',
    name: 'Topic Detail',
    requiresAuth: false,
    isDynamic: true,
    testParams: { id: 'test-topic-1' },
    skipReason:
      'Requires seeded topic UUID - topic tests covered in browse-topics-and-view-details.spec.ts',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Demo Routes - Feature demonstrations
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/demo/common-ground',
    name: 'Demo Common Ground',
    requiresAuth: false,
    isDynamic: false,
  },
  {
    path: '/demo/agreement-visualization',
    name: 'Demo Agreement Visualization',
    requiresAuth: false,
    isDynamic: false,
  },
  {
    path: '/demo/credentials',
    name: 'Demo Credentials',
    requiresAuth: false,
    isDynamic: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Profile Routes - User profiles
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/profile',
    name: 'My Profile',
    requiresAuth: true,
    isDynamic: false,
  },
  {
    path: '/profile/:id',
    name: 'User Profile',
    requiresAuth: false, // Public - can view other users' profiles
    isDynamic: true,
    testParams: { id: 'test-user-1' },
    skipReason:
      'Requires seeded user UUID - profile tests covered in profile-trust-indicators.spec.ts',
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Settings Routes - User preferences and configuration
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/settings/feedback',
    name: 'Feedback Settings',
    requiresAuth: true,
    isDynamic: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Verification Routes - Account verification flows
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/verification',
    name: 'Verification',
    requiresAuth: true,
    isDynamic: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Admin Routes - Administration and moderation
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/admin/moderation',
    name: 'Admin Moderation',
    requiresAuth: true,
    isDynamic: false,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Appeal Routes - Moderation appeal handling
  // ═══════════════════════════════════════════════════════════════════════════
  {
    path: '/appeals',
    name: 'Appeals',
    requiresAuth: true,
    isDynamic: false,
  },
];

/**
 * Get routes by category
 */
export function getPublicRoutes(): RouteDefinition[] {
  return ROUTE_REGISTRY.filter((r) => !r.requiresAuth && !r.skipReason);
}

export function getAuthenticatedRoutes(): RouteDefinition[] {
  return ROUTE_REGISTRY.filter((r) => r.requiresAuth && !r.skipReason);
}

export function getSkippedRoutes(): RouteDefinition[] {
  return ROUTE_REGISTRY.filter((r) => !!r.skipReason);
}

export function getAllTestableRoutes(): RouteDefinition[] {
  return ROUTE_REGISTRY.filter((r) => !r.skipReason);
}

/**
 * Resolve a route path, replacing dynamic segments with test values
 */
export function resolvePath(route: RouteDefinition): string {
  let path = route.path;
  if (route.isDynamic && route.testParams) {
    for (const [key, value] of Object.entries(route.testParams)) {
      path = path.replace(`:${key}`, value);
    }
  }
  return path;
}
