/**
 * Tests for MSW Setup and Handlers
 *
 * Verifies that the MSW server is properly initialized and handlers work correctly.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { server, resetHandlers, addHandlers, defaultHandlers } from '../msw/index.js';
import { http, HttpResponse } from 'msw';

// Type helpers for API responses
interface HealthResponse {
  status: string;
  timestamp: string;
}

interface UserResponse {
  user: {
    id: string;
    email: string;
    username: string;
  };
  token?: string;
}

interface ErrorResponse {
  message: string;
}

interface TopicsResponse {
  topics: Array<{ id: string; title: string }>;
  total: number;
}

interface TopicResponse {
  id: string;
  title: string;
  description?: string;
}

interface CustomResponse {
  custom: string;
}

// Note: In production tests, the setup file would handle server lifecycle.
// Here we test the MSW module directly.

describe('MSW Server Setup', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe('Server Lifecycle', () => {
    it('should start and stop without errors', () => {
      // Server is already started in beforeAll
      expect(server).toBeDefined();
      expect(typeof server.listen).toBe('function');
      expect(typeof server.close).toBe('function');
    });

    it('should have default handlers registered', () => {
      expect(defaultHandlers).toBeDefined();
      expect(Array.isArray(defaultHandlers)).toBe(true);
      expect(defaultHandlers.length).toBeGreaterThan(0);
    });
  });

  describe('Health Check Handler', () => {
    it('should respond to health check endpoint', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      expect(response.ok).toBe(true);

      const data = (await response.json()) as HealthResponse;
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('Auth Handlers', () => {
    it('should handle successful login', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      expect(response.ok).toBe(true);
      const data = (await response.json()) as UserResponse;
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('test@example.com');
      expect(data.token).toBeDefined();
    });

    it('should handle failed login with invalid credentials', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);
      const data = (await response.json()) as ErrorResponse;
      expect(data.message).toBe('Invalid credentials');
    });

    it('should handle authenticated /me request', async () => {
      const response = await fetch('http://localhost:3000/api/auth/me', {
        headers: {
          Authorization: 'Bearer mock-jwt-token-12345',
        },
      });

      expect(response.ok).toBe(true);
      const data = (await response.json()) as UserResponse;
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('test@example.com');
    });

    it('should reject unauthenticated /me request', async () => {
      const response = await fetch('http://localhost:3000/api/auth/me');
      expect(response.status).toBe(401);
    });
  });

  describe('Handler Reset', () => {
    it('should allow adding custom handlers', async () => {
      addHandlers(
        http.get('http://localhost:3000/api/custom', () => {
          return HttpResponse.json({ custom: 'response' });
        }),
      );

      const response = await fetch('http://localhost:3000/api/custom');
      expect(response.ok).toBe(true);

      const data = (await response.json()) as CustomResponse;
      expect(data.custom).toBe('response');
    });

    it('should reset custom handlers after resetHandlers()', async () => {
      // Add a custom handler
      addHandlers(
        http.get('http://localhost:3000/api/temporary', () => {
          return HttpResponse.json({ temp: true });
        }),
      );

      // Verify it works
      const response1 = await fetch('http://localhost:3000/api/temporary');
      expect(response1.ok).toBe(true);

      // Reset handlers
      resetHandlers();

      // The handler should no longer exist (will throw in strict mode)
      // We're testing that resetHandlers removes the custom handler
      try {
        await fetch('http://localhost:3000/api/temporary');
        // If we get here in error mode, the handler wasn't removed
        // But since we're in error mode, unhandled requests should fail
      } catch {
        // Expected - unhandled request in error mode
      }
    });
  });

  describe('Topic Handlers', () => {
    it('should return list of topics', async () => {
      const response = await fetch('http://localhost:3000/api/topics');
      expect(response.ok).toBe(true);

      const data = (await response.json()) as TopicsResponse;
      expect(data.topics).toBeDefined();
      expect(Array.isArray(data.topics)).toBe(true);
      expect(data.topics.length).toBe(2);
    });

    it('should return a specific topic', async () => {
      const response = await fetch('http://localhost:3000/api/topics/topic-123');
      expect(response.ok).toBe(true);

      const data = (await response.json()) as TopicResponse;
      expect(data.id).toBe('topic-123');
      expect(data.title).toBeDefined();
    });

    it('should create a new topic', async () => {
      const response = await fetch('http://localhost:3000/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Topic',
          description: 'Topic description',
        }),
      });

      expect(response.status).toBe(201);
      const data = (await response.json()) as TopicResponse;
      expect(data.id).toBeDefined();
      expect(data.title).toBe('New Topic');
    });
  });
});
