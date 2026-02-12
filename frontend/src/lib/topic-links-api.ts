/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Topic Links API Client
 * Feature 016: Topic Management - Topic Linking (T217, T230)
 *
 * Provides API functions for managing topic links, including:
 * - Fetching linked topics for a topic
 * - Creating new topic links
 * - Updating link confirmation status
 * - Deleting topic links
 */

import type {
  TopicLink,
  LinkedTopic,
  CreateTopicLinkRequest,
  UpdateTopicLinkStatusRequest,
  GetTopicLinksQuery,
} from '../types/topic-links';
import { apiClient } from './api';

/**
 * Fetch linked topics for a topic (simplified view)
 *
 * @param topicId - ID of the topic to get links for
 * @param confirmedOnly - Only return confirmed links (default: true)
 * @returns Array of linked topics with relationship info
 */
export async function fetchLinkedTopics(
  topicId: string,
  confirmedOnly = true,
): Promise<LinkedTopic[]> {
  return apiClient.get<LinkedTopic[]>(`/topics/${topicId}/linked`, {
    params: { confirmedOnly: confirmedOnly.toString() },
  });
}

/**
 * Fetch all topic links for a topic (full details)
 *
 * @param topicId - ID of the topic
 * @param query - Optional filter parameters
 * @returns Array of topic links with full details
 */
export async function fetchTopicLinks(
  topicId: string,
  query?: GetTopicLinksQuery,
): Promise<TopicLink[]> {
  const params: Record<string, string> = {};

  if (query?.relationshipType) {
    params['relationshipType'] = query.relationshipType;
  }
  if (query?.status) {
    params['status'] = query.status;
  }
  if (query?.linkSource) {
    params['linkSource'] = query.linkSource;
  }

  return apiClient.get<TopicLink[]>(`/topics/${topicId}/links`, { params });
}

/**
 * Create a new topic link
 *
 * @param topicId - ID of the source topic
 * @param request - Link creation details
 * @returns Created topic link
 */
export async function createTopicLink(
  topicId: string,
  request: CreateTopicLinkRequest,
): Promise<TopicLink> {
  return apiClient.post<TopicLink>(`/topics/${topicId}/links`, request);
}

/**
 * Update a topic link's confirmation status
 *
 * @param topicId - ID of the topic
 * @param linkId - ID of the link to update
 * @param request - Status update details
 * @returns Updated topic link
 */
export async function updateTopicLinkStatus(
  topicId: string,
  linkId: string,
  request: UpdateTopicLinkStatusRequest,
): Promise<TopicLink> {
  return apiClient.patch<TopicLink>(`/topics/${topicId}/links/${linkId}`, request);
}

/**
 * Delete a topic link
 *
 * @param topicId - ID of the topic
 * @param linkId - ID of the link to delete
 * @returns Deleted topic link
 */
export async function deleteTopicLink(topicId: string, linkId: string): Promise<TopicLink> {
  return apiClient.delete<TopicLink>(`/topics/${topicId}/links/${linkId}`);
}

/**
 * Get a specific topic link by ID
 *
 * @param topicId - ID of the topic
 * @param linkId - ID of the link
 * @returns Topic link details
 */
export async function fetchTopicLink(topicId: string, linkId: string): Promise<TopicLink> {
  return apiClient.get<TopicLink>(`/topics/${topicId}/links/${linkId}`);
}
