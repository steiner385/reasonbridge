/**
 * Topic API service for Feature 016: Topic Management
 * Handles topic creation, listing, and management
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  status: 'SEEDING' | 'ACTIVE' | 'ARCHIVED' | 'LOCKED';
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  slug?: string;
  evidenceStandards: 'MINIMAL' | 'STANDARD' | 'RIGOROUS';
  minimumDiversityScore: number;
  currentDiversityScore: number | null;
  participantCount: number;
  responseCount: number;
  crossCuttingThemes: string[];
  createdAt: string;
  activatedAt: string | null;
  archivedAt: string | null;
  tags: Tag[];
}

export interface CreateTopicRequest {
  title: string;
  description: string;
  tags: string[];
  visibility?: 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
  evidenceStandards?: 'MINIMAL' | 'STANDARD' | 'RIGOROUS';
}

export interface DuplicateSuggestion {
  id: string;
  title: string;
  description: string;
  similarityScore: number;
  matchType: 'exact' | 'trigram' | 'semantic';
}

export interface TopicCreationError {
  message: string;
  suggestions?: DuplicateSuggestion[];
}

class TopicService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Create a new discussion topic
   * T018: API call for topic creation
   *
   * @throws {TopicCreationError} If similar topics exist (409 Conflict)
   */
  async createTopic(data: CreateTopicRequest): Promise<Topic> {
    const response = await fetch(`${API_BASE_URL}/topics`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      if (response.status === 409) {
        // Conflict - similar topics exist
        const error: TopicCreationError = await response.json();
        const duplicateError = new Error(error.message) as Error & TopicCreationError;
        duplicateError.suggestions = error.suggestions;
        throw duplicateError;
      }

      if (response.status === 429) {
        // Rate limit exceeded
        throw new Error('Rate limit exceeded. You can create up to 5 topics per day.');
      }

      const error = await response.json().catch(() => ({ message: 'Failed to create topic' }));
      throw new Error(error.message || 'Failed to create topic');
    }

    return response.json();
  }

  /**
   * Get a single topic by ID
   */
  async getTopic(id: string): Promise<Topic> {
    const response = await fetch(`${API_BASE_URL}/topics/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch topic' }));
      throw new Error(error.message || 'Failed to fetch topic');
    }

    return response.json();
  }

  /**
   * List topics with filtering and pagination
   */
  async listTopics(params?: {
    status?: string;
    visibility?: string;
    tags?: string[];
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Topic[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const searchParams = new URLSearchParams();

    if (params?.status) searchParams.append('status', params.status);
    if (params?.visibility) searchParams.append('visibility', params.visibility);
    if (params?.tags) params.tags.forEach((tag) => searchParams.append('tags', tag));
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const url = `${API_BASE_URL}/topics${searchParams.toString() ? `?${searchParams}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch topics' }));
      throw new Error(error.message || 'Failed to fetch topics');
    }

    return response.json();
  }
}

export const topicService = new TopicService();
