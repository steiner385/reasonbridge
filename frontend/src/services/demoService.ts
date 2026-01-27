/**
 * Service for fetching demo content from the API
 */

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

export interface ViewsSpectrum {
  stronglySupport: number;
  support: number;
  neutral: number;
  oppose: number;
  stronglyOppose: number;
}

export interface DemoDiscussion {
  id: string;
  title: string;
  topic: string;
  participantCount: number;
  propositionCount: number;
  commonGroundScore: number;
  topCommonGround: string[];
  viewsSpectrum: ViewsSpectrum;
  createdAt: string;
}

export interface SocialProof {
  averageCommonGroundScore: number;
  totalParticipants: number;
  platformSatisfaction: number;
}

export interface DemoDiscussionsResponse {
  discussions: DemoDiscussion[];
  socialProof?: SocialProof;
}

class DemoService {
  /**
   * Generate or retrieve visitor session ID
   * Stored in localStorage for tracking demo interactions
   */
  getVisitorSessionId(): string {
    let sessionId = localStorage.getItem('visitorSessionId');

    if (!sessionId) {
      // Generate UUID v4
      sessionId = this.generateUUID();
      localStorage.setItem('visitorSessionId', sessionId);
    }

    return sessionId;
  }

  /**
   * Fetch demo discussions from the API
   */
  async getDemoDiscussions(limit: number = 5): Promise<DemoDiscussionsResponse> {
    const sessionId = this.getVisitorSessionId();

    const response = await fetch(
      `${API_BASE_URL}/demo/discussions?limit=${limit}&sessionId=${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch demo discussions');
    }

    return response.json();
  }

  /**
   * Generate a UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export const demoService = new DemoService();
