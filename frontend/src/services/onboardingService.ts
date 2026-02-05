/**
 * Onboarding service for topic selection and onboarding progress tracking
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

export type ActivityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Topic {
  id: string;
  name: string;
  description: string;
  activeDiscussionCount: number;
  participantCount: number;
  activityLevel: ActivityLevel;
  suggestedForNewUsers: boolean;
  recentActivity?: {
    last7Days: number;
    last30Days: number;
  };
}

export interface TopicsResponse {
  topics: Topic[];
  totalCount: number;
}

export interface SelectedTopic {
  topicId: string;
  name: string;
  priority: number;
}

export interface SelectTopicsResponse {
  success: boolean;
  message: string;
  selectedTopics: SelectedTopic[];
  onboardingProgress: {
    currentStep: string;
    topicsSelected: boolean;
  };
  warnings?: string[];
}

export interface OnboardingProgressResponse {
  userId: string;
  currentStep: string;
  progress: {
    emailVerified: boolean;
    topicsSelected: boolean;
    orientationViewed: boolean;
    firstPostMade: boolean;
  };
  percentComplete: number;
  nextAction: {
    step: string;
    title: string;
    description: string;
    actionUrl: string;
  } | null;
  completedAt: string | null;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

class OnboardingService {
  /**
   * Get authorization header from stored token
   * Checks both localStorage (remember me) and sessionStorage (current session)
   */
  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      return {
        'Content-Type': 'application/json',
      };
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Fetch available topics for selection
   */
  async getTopics(suggestedOnly: boolean = true): Promise<TopicsResponse> {
    const url = new URL(`${API_BASE_URL}/topics`);
    if (suggestedOnly) {
      url.searchParams.append('suggestedOnly', 'true');
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to fetch topics');
    }

    return response.json();
  }

  /**
   * Submit selected topics with priorities
   */
  async selectTopics(topicIds: string[]): Promise<SelectTopicsResponse> {
    const response = await fetch(`${API_BASE_URL}/onboarding/select-topics`, {
      method: 'POST',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ topicIds }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to save topic selection');
    }

    return response.json();
  }

  /**
   * Get current onboarding progress
   */
  async getOnboardingProgress(): Promise<OnboardingProgressResponse> {
    const response = await fetch(`${API_BASE_URL}/onboarding/progress`, {
      method: 'GET',
      headers: this.getAuthHeader(),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to fetch onboarding progress');
    }

    return response.json();
  }

  /**
   * Mark orientation as viewed
   */
  async markOrientationViewed(viewed: boolean, skipped: boolean): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/onboarding/mark-orientation-viewed`, {
      method: 'PUT',
      headers: this.getAuthHeader(),
      body: JSON.stringify({ viewed, skipped }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to mark orientation as viewed');
    }
  }
}

export const onboardingService = new OnboardingService();
