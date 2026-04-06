/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleContactsProvider } from '../google-contacts.provider.js';

// Create mock list function outside the mock factory
const mockList = vi.fn();
const mockSetCredentials = vi.fn();

// Mock the googleapis module
// Note: vitest 4.x requires function/class syntax for constructors (not arrow functions)
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn(function () {
        return { setCredentials: mockSetCredentials };
      }),
    },
    people: vi.fn(function () {
      return {
        people: {
          connections: {
            list: mockList,
          },
        },
      };
    }),
  },
}));

describe('GoogleContactsProvider', () => {
  let provider: GoogleContactsProvider;

  beforeEach(() => {
    // Clear mock call history but keep implementation
    mockList.mockClear();
    mockSetCredentials.mockClear();
    // Reset any mockResolvedValueOnce queue
    mockList.mockReset();
    provider = new GoogleContactsProvider();
  });

  describe('fetchContacts', () => {
    it('should fetch contacts from Google People API', async () => {
      const mockContacts = [
        {
          names: [{ displayName: 'John Smith' }],
          emailAddresses: [{ value: 'john@example.com' }],
        },
        {
          names: [{ displayName: 'Jane Doe' }],
          emailAddresses: [{ value: 'jane@example.com' }],
        },
      ];

      mockList.mockResolvedValueOnce({
        data: {
          connections: mockContacts,
          totalItems: 2,
        },
      });

      const result = await provider.fetchContacts('test-access-token');

      expect(result.contacts).toHaveLength(2);
      expect(result.contacts[0].email).toBe('john@example.com');
      expect(result.contacts[0].displayName).toBe('John Smith');
      expect(result.contacts[1].email).toBe('jane@example.com');
      expect(result.contacts[1].displayName).toBe('Jane Doe');
      expect(result.totalFetched).toBe(2);
    });

    it('should call People API with correct parameters', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          connections: [],
          totalItems: 0,
        },
      });

      await provider.fetchContacts('test-access-token');

      expect(mockList).toHaveBeenCalledWith({
        resourceName: 'people/me',
        pageSize: 1000,
        pageToken: undefined,
        personFields: 'names,emailAddresses',
      });
    });

    it('should set credentials with access token', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          connections: [],
          totalItems: 0,
        },
      });

      await provider.fetchContacts('my-special-token');

      expect(mockSetCredentials).toHaveBeenCalledWith({
        access_token: 'my-special-token',
      });
    });

    it('should skip contacts without email addresses', async () => {
      const mockContacts = [
        {
          names: [{ displayName: 'John Smith' }],
          emailAddresses: [{ value: 'john@example.com' }],
        },
        {
          names: [{ displayName: 'No Email Person' }],
          // No emailAddresses
        },
        {
          names: [{ displayName: 'Empty Emails' }],
          emailAddresses: [],
        },
      ];

      mockList.mockResolvedValueOnce({
        data: {
          connections: mockContacts,
          totalItems: 3,
        },
      });

      const result = await provider.fetchContacts('test-access-token');

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].email).toBe('john@example.com');
      expect(result.totalFetched).toBe(3);
    });

    it('should handle contacts without names', async () => {
      const mockContacts = [
        {
          emailAddresses: [{ value: 'noname@example.com' }],
        },
        {
          names: [],
          emailAddresses: [{ value: 'emptynames@example.com' }],
        },
      ];

      mockList.mockResolvedValueOnce({
        data: {
          connections: mockContacts,
          totalItems: 2,
        },
      });

      const result = await provider.fetchContacts('test-access-token');

      expect(result.contacts).toHaveLength(2);
      expect(result.contacts[0].email).toBe('noname@example.com');
      expect(result.contacts[0].displayName).toBeNull();
      expect(result.contacts[1].email).toBe('emptynames@example.com');
      expect(result.contacts[1].displayName).toBeNull();
    });

    it('should handle empty connections gracefully', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          connections: [],
          totalItems: 0,
        },
      });

      const result = await provider.fetchContacts('test-access-token');

      expect(result.contacts).toHaveLength(0);
      expect(result.totalFetched).toBe(0);
    });

    it('should handle null connections gracefully', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          connections: null,
          totalItems: 0,
        },
      });

      const result = await provider.fetchContacts('test-access-token');

      expect(result.contacts).toHaveLength(0);
      expect(result.totalFetched).toBe(0);
    });

    it('should handle undefined connections gracefully', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          totalItems: 0,
        },
      });

      const result = await provider.fetchContacts('test-access-token');

      expect(result.contacts).toHaveLength(0);
      expect(result.totalFetched).toBe(0);
    });

    it('should handle pagination with nextPageToken', async () => {
      // First page
      mockList.mockResolvedValueOnce({
        data: {
          connections: [
            {
              names: [{ displayName: 'Page 1 Contact' }],
              emailAddresses: [{ value: 'page1@example.com' }],
            },
          ],
          nextPageToken: 'page2token',
          totalItems: 2,
        },
      });

      // Second page (no more pages)
      mockList.mockResolvedValueOnce({
        data: {
          connections: [
            {
              names: [{ displayName: 'Page 2 Contact' }],
              emailAddresses: [{ value: 'page2@example.com' }],
            },
          ],
          totalItems: 2,
        },
      });

      const result = await provider.fetchContacts('test-access-token');

      expect(mockList).toHaveBeenCalledTimes(2);
      expect(result.contacts).toHaveLength(2);
      expect(result.contacts[0].email).toBe('page1@example.com');
      expect(result.contacts[1].email).toBe('page2@example.com');
      expect(result.totalFetched).toBe(2);
    });

    it('should use pageToken for subsequent requests', async () => {
      mockList
        .mockResolvedValueOnce({
          data: {
            connections: [
              {
                names: [{ displayName: 'Contact 1' }],
                emailAddresses: [{ value: 'c1@example.com' }],
              },
            ],
            nextPageToken: 'secondPageToken',
          },
        })
        .mockResolvedValueOnce({
          data: {
            connections: [
              {
                names: [{ displayName: 'Contact 2' }],
                emailAddresses: [{ value: 'c2@example.com' }],
              },
            ],
          },
        });

      await provider.fetchContacts('test-access-token');

      expect(mockList).toHaveBeenNthCalledWith(1, {
        resourceName: 'people/me',
        pageSize: 1000,
        pageToken: undefined,
        personFields: 'names,emailAddresses',
      });

      expect(mockList).toHaveBeenNthCalledWith(2, {
        resourceName: 'people/me',
        pageSize: 1000,
        pageToken: 'secondPageToken',
        personFields: 'names,emailAddresses',
      });
    });

    it('should throw error when API call fails', async () => {
      const apiError = new Error('API quota exceeded');
      mockList.mockRejectedValueOnce(apiError);

      await expect(provider.fetchContacts('test-access-token')).rejects.toThrow(
        'API quota exceeded',
      );
    });

    it('should use first email when contact has multiple email addresses', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          connections: [
            {
              names: [{ displayName: 'Multi Email User' }],
              emailAddresses: [
                { value: 'primary@example.com' },
                { value: 'secondary@example.com' },
              ],
            },
          ],
        },
      });

      const result = await provider.fetchContacts('test-access-token');

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].email).toBe('primary@example.com');
    });

    it('should use first name when contact has multiple names', async () => {
      mockList.mockResolvedValueOnce({
        data: {
          connections: [
            {
              names: [{ displayName: 'Primary Name' }, { displayName: 'Nickname' }],
              emailAddresses: [{ value: 'test@example.com' }],
            },
          ],
        },
      });

      const result = await provider.fetchContacts('test-access-token');

      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].displayName).toBe('Primary Name');
    });
  });

  describe('MAX_CONTACTS limit', () => {
    it('should stop fetching when MAX_CONTACTS limit is reached', async () => {
      // Create contacts for first page (1000 contacts)
      const createContacts = (count: number, prefix: string) =>
        Array.from({ length: count }, (_, i) => ({
          names: [{ displayName: `User ${prefix}${i}` }],
          emailAddresses: [{ value: `user${prefix}${i}@example.com` }],
        }));

      // Simulate 6 pages of 1000 contacts each (total 6000, but limit is 5000)
      for (let page = 0; page < 6; page++) {
        const isLastPage = page === 5;
        mockList.mockResolvedValueOnce({
          data: {
            connections: createContacts(1000, `p${page}_`),
            nextPageToken: isLastPage ? undefined : `page${page + 1}token`,
          },
        });
      }

      const result = await provider.fetchContacts('test-access-token');

      // Should stop at 5000 contacts (MAX_CONTACTS)
      expect(result.contacts.length).toBe(5000);
      // Should have made 5 calls (1000 * 5 = 5000)
      expect(mockList).toHaveBeenCalledTimes(5);
    });

    it('should not continue pagination after reaching limit', async () => {
      const createContacts = (count: number, prefix: string) =>
        Array.from({ length: count }, (_, i) => ({
          names: [{ displayName: `User ${prefix}${i}` }],
          emailAddresses: [{ value: `user${prefix}${i}@example.com` }],
        }));

      // 5 pages of 1000 contacts = exactly 5000 (limit)
      for (let page = 0; page < 5; page++) {
        mockList.mockResolvedValueOnce({
          data: {
            connections: createContacts(1000, `p${page}_`),
            nextPageToken: `page${page + 1}token`, // Always has next page
          },
        });
      }

      const result = await provider.fetchContacts('test-access-token');

      expect(result.contacts.length).toBe(5000);
      // Should not request page 6 even though nextPageToken exists
      expect(mockList).toHaveBeenCalledTimes(5);
    });
  });
});
