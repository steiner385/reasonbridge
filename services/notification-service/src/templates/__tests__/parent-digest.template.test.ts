/**
 * Copyright 2026 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateParentDigestEmail,
  ParentDigestData,
  EmailTemplate,
} from '../parent-digest.template.js';

describe('generateParentDigestEmail', () => {
  const createTestData = (overrides: Partial<ParentDigestData> = {}): ParentDigestData => ({
    parentName: 'Jane Doe',
    parentEmail: 'jane.doe@example.com',
    childName: 'Alex',
    weekStartDate: new Date('2026-02-15'),
    weekEndDate: new Date('2026-02-22'),
    topicsParticipated: [
      { id: 'topic-1', name: 'Climate Change Solutions', responseCount: 3 },
      { id: 'topic-2', name: 'Space Exploration', responseCount: 2 },
    ],
    totalResponses: 5,
    approximateHoursActive: 2.5,
    safetyConcernsCount: 0,
    dashboardToken: 'abc123xyz',
    baseUrl: 'https://reasonbridge.org',
    ...overrides,
  });

  describe('subject line', () => {
    it('should include the child name in the subject', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.subject).toBe('Weekly Activity Summary for Alex');
    });

    it('should escape HTML entities in child name for subject', () => {
      const data = createTestData({ childName: 'Alex <script>alert("xss")</script>' });
      const result = generateParentDigestEmail(data);

      expect(result.subject).not.toContain('<script>');
      expect(result.subject).toContain('Alex');
    });
  });

  describe('email structure', () => {
    it('should return subject, html, and text properties', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('text');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.html).toBe('string');
      expect(typeof result.text).toBe('string');
    });
  });

  describe('greeting section', () => {
    it('should include parent name in greeting', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('Jane Doe');
      expect(result.text).toContain('Jane Doe');
    });

    it('should include child name in greeting', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain("Alex's activity summary");
      expect(result.text).toContain("Alex's activity summary");
    });
  });

  describe('date formatting', () => {
    it('should format date range nicely', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      // Should be formatted like "Feb 15 - Feb 22, 2026"
      expect(result.html).toContain('Feb 15');
      expect(result.html).toContain('Feb 22');
      expect(result.html).toContain('2026');
      expect(result.text).toContain('Feb 15');
      expect(result.text).toContain('Feb 22');
    });
  });

  describe('activity summary section', () => {
    it('should show total topics participated', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('2');
      expect(result.html).toContain('topic');
      expect(result.text).toContain('2');
    });

    it('should list topic names', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('Climate Change Solutions');
      expect(result.html).toContain('Space Exploration');
      expect(result.text).toContain('Climate Change Solutions');
      expect(result.text).toContain('Space Exploration');
    });

    it('should show response counts per topic', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toMatch(/Climate Change Solutions.*3/s);
      expect(result.html).toMatch(/Space Exploration.*2/s);
    });

    it('should show total responses', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('5');
      expect(result.html).toContain('response');
      expect(result.text).toContain('5 responses');
    });

    it('should show approximate hours active', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('2.5');
      expect(result.html).toContain('hour');
      expect(result.text).toContain('2.5 hours');
    });
  });

  describe('edge cases for activity', () => {
    it('should handle zero topics gracefully', () => {
      const data = createTestData({
        topicsParticipated: [],
        totalResponses: 0,
        approximateHoursActive: 0,
      });
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('0');
      expect(result.html).not.toContain('undefined');
      expect(result.text).not.toContain('undefined');
    });

    it('should handle singular topic correctly', () => {
      const data = createTestData({
        topicsParticipated: [{ id: 'topic-1', name: 'Single Topic', responseCount: 1 }],
        totalResponses: 1,
      });
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('1 topic');
      expect(result.text).toContain('1 topic');
    });

    it('should handle singular response correctly', () => {
      const data = createTestData({
        totalResponses: 1,
      });
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('1 response');
      expect(result.text).toContain('1 response');
    });

    it('should handle singular hour correctly', () => {
      const data = createTestData({
        approximateHoursActive: 1,
      });
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('1 hour');
      expect(result.text).toContain('1 hour');
    });

    it('should handle fractional hours correctly', () => {
      const data = createTestData({
        approximateHoursActive: 0.5,
      });
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('0.5');
      expect(result.text).toContain('0.5');
    });
  });

  describe('safety status section', () => {
    it('should show "All clear" when no safety concerns', () => {
      const data = createTestData({ safetyConcernsCount: 0 });
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('All clear');
      expect(result.text).toContain('All clear');
    });

    it('should show concern count when there are concerns', () => {
      const data = createTestData({ safetyConcernsCount: 2 });
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('2 concerns');
      expect(result.html).toContain('reviewed by our moderation team');
      expect(result.text).toContain('2 concerns');
    });

    it('should handle singular concern correctly', () => {
      const data = createTestData({ safetyConcernsCount: 1 });
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('1 concern');
      expect(result.html).not.toContain('1 concerns');
      expect(result.text).toContain('1 concern');
    });
  });

  describe('links section', () => {
    it('should include dashboard link with token', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      const expectedUrl = 'https://reasonbridge.org/parent/dashboard?token=abc123xyz';
      expect(result.html).toContain(expectedUrl);
      expect(result.text).toContain(expectedUrl);
    });

    it('should include settings link with token', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      const expectedUrl = 'https://reasonbridge.org/parent/settings?token=abc123xyz';
      expect(result.html).toContain(expectedUrl);
      expect(result.text).toContain(expectedUrl);
    });
  });

  describe('footer section', () => {
    it('should explain why user is receiving this email', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('parental consent');
      expect(result.text).toContain('parental consent');
    });

    it('should include unsubscribe information', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('unsubscribe');
      expect(result.text).toContain('unsubscribe');
    });

    it('should mention preference management', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('preferences');
      expect(result.text).toContain('preferences');
    });
  });

  describe('HTML formatting', () => {
    it('should include proper HTML structure', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html');
      expect(result.html).toContain('</html>');
      expect(result.html).toContain('<head>');
      expect(result.html).toContain('<body');
    });

    it('should include responsive meta tag', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.html).toContain('viewport');
    });

    it('should include dark mode safe styles', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      // Should include prefers-color-scheme media query
      expect(result.html).toContain('prefers-color-scheme');
    });
  });

  describe('XSS protection', () => {
    it('should escape HTML in child name', () => {
      const data = createTestData({ childName: '<script>alert("xss")</script>' });
      const result = generateParentDigestEmail(data);

      expect(result.html).not.toContain('<script>');
      expect(result.html).toContain('&lt;script&gt;');
    });

    it('should escape HTML in parent name', () => {
      const data = createTestData({ parentName: '<img src=x onerror=alert(1)>' });
      const result = generateParentDigestEmail(data);

      expect(result.html).not.toContain('<img');
      expect(result.html).toContain('&lt;img');
    });

    it('should escape HTML in topic names', () => {
      const data = createTestData({
        topicsParticipated: [{ id: 'topic-1', name: '<script>xss</script>', responseCount: 1 }],
      });
      const result = generateParentDigestEmail(data);

      expect(result.html).not.toContain('<script>xss</script>');
      expect(result.html).toContain('&lt;script&gt;');
    });
  });

  describe('plain text formatting', () => {
    it('should not contain HTML tags', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      // Should not have HTML tags in text version
      expect(result.text).not.toMatch(/<(?!http)[a-z]/i);
    });

    it('should be readable without HTML', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      // Should have clear section breaks
      expect(result.text).toContain('Activity Summary');
      expect(result.text).toContain('Safety Status');
    });

    it('should include all links in plain text', () => {
      const data = createTestData();
      const result = generateParentDigestEmail(data);

      expect(result.text).toContain('https://');
      expect(result.text).toContain('dashboard');
      expect(result.text).toContain('settings');
    });
  });
});
