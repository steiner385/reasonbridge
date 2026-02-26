/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SafetyReportsPage from '../SafetyReportsPage';
import * as moderationApi from '../../../lib/moderation-api';

// Mock the moderation API
vi.mock('../../../lib/moderation-api', () => ({
  getCsamReports: vi.fn(),
  getSafetyReportsStats: vi.fn(),
  updateCsamReportStatus: vi.fn(),
  submitToNcmec: vi.fn(),
}));

const mockGetCsamReports = vi.mocked(moderationApi.getCsamReports);
const mockGetSafetyReportsStats = vi.mocked(moderationApi.getSafetyReportsStats);
const mockUpdateCsamReportStatus = vi.mocked(moderationApi.updateCsamReportStatus);
const mockSubmitToNcmec = vi.mocked(moderationApi.submitToNcmec);

const mockStats = {
  totalPending: 5,
  approachingDeadline: 2,
  submittedToday: 3,
  awaitingEvidence: 1,
};

const mockReports = [
  {
    id: 'report-1',
    detectionSource: 'AI_DETECTION' as const,
    status: 'PENDING_REVIEW' as const,
    contentType: 'response',
    contentId: 'content-123',
    contentAuthorId: 'user-456',
    evidenceS3Key: 'evidence/2026/report-1.json.enc',
    evidenceHash: 'abcd1234567890',
    ncmecDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours from now
    isLegalHold: true,
    aiConfidenceScore: 0.95,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'report-2',
    detectionSource: 'USER_REPORT' as const,
    status: 'EVIDENCE_PRESERVED' as const,
    contentType: 'topic',
    contentId: 'content-789',
    evidenceS3Key: 'evidence/2026/report-2.json.enc',
    evidenceHash: 'efgh5678901234',
    ncmecDeadline: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), // 20 hours from now
    isLegalHold: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('SafetyReportsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner while fetching', async () => {
      mockGetSafetyReportsStats.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockStats), 100)),
      );
      mockGetCsamReports.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ reports: [], totalCount: 0, nextCursor: null }), 100),
          ),
      );

      renderWithRouter(<SafetyReportsPage />);

      expect(screen.getByText('Safety Reports')).toBeInTheDocument();
      expect(screen.getByText('Loading statistics...')).toBeInTheDocument();
    });
  });

  describe('statistics display', () => {
    it('displays statistics correctly', async () => {
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({ reports: [], totalCount: 0, nextCursor: null });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // totalPending
      });

      expect(screen.getByText('2')).toBeInTheDocument(); // approachingDeadline
      expect(screen.getByText('3')).toBeInTheDocument(); // submittedToday
      expect(screen.getByText('1')).toBeInTheDocument(); // awaitingEvidence
    });
  });

  describe('reports display', () => {
    it('shows reports with status badges', async () => {
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({
        reports: mockReports,
        totalCount: 2,
        nextCursor: null,
      });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('PENDING REVIEW')).toBeInTheDocument();
      });

      expect(screen.getByText('EVIDENCE PRESERVED')).toBeInTheDocument();
      expect(screen.getByText('AI Detection')).toBeInTheDocument();
      expect(screen.getByText('User Report')).toBeInTheDocument();
    });

    it('shows AI confidence score', async () => {
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({
        reports: [mockReports[0]],
        totalCount: 1,
        nextCursor: null,
      });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('AI: 95%')).toBeInTheDocument();
      });
    });

    it('shows deadline status', async () => {
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({
        reports: [mockReports[0]],
        totalCount: 1,
        nextCursor: null,
      });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        // Should show hours remaining (12h from now)
        expect(screen.getByText(/\d+h remaining/)).toBeInTheDocument();
      });
    });
  });

  describe('empty state', () => {
    it('shows empty state when no reports', async () => {
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({ reports: [], totalCount: 0, nextCursor: null });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('No reports found')).toBeInTheDocument();
      });
    });
  });

  describe('status filtering', () => {
    it('filters by status when dropdown changes', async () => {
      const user = userEvent.setup();
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({
        reports: mockReports,
        totalCount: 2,
        nextCursor: null,
      });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('PENDING REVIEW')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox', { name: 'Filter by status' });
      await user.selectOptions(select, 'EVIDENCE_PRESERVED');

      await waitFor(() => {
        expect(mockGetCsamReports).toHaveBeenCalledWith({ status: 'EVIDENCE_PRESERVED' });
      });
    });
  });

  describe('action buttons', () => {
    it('shows preserve evidence button for pending reports', async () => {
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({
        reports: [mockReports[0]],
        totalCount: 1,
        nextCursor: null,
      });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Preserve Evidence' })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: 'Reject (False Positive)' })).toBeInTheDocument();
    });

    it('shows submit to NCMEC button for evidence preserved reports', async () => {
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({
        reports: [mockReports[1]],
        totalCount: 1,
        nextCursor: null,
      });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submit to NCMEC' })).toBeInTheDocument();
      });
    });

    it('calls updateCsamReportStatus when preserve evidence clicked', async () => {
      const user = userEvent.setup();
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({
        reports: [mockReports[0]],
        totalCount: 1,
        nextCursor: null,
      });
      mockUpdateCsamReportStatus.mockResolvedValue({
        ...mockReports[0],
        status: 'EVIDENCE_PRESERVED',
      });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Preserve Evidence' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Preserve Evidence' }));

      await waitFor(() => {
        expect(mockUpdateCsamReportStatus).toHaveBeenCalledWith('report-1', 'EVIDENCE_PRESERVED');
      });
    });

    it('calls submitToNcmec when submit button clicked', async () => {
      const user = userEvent.setup();
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({
        reports: [mockReports[1]],
        totalCount: 1,
        nextCursor: null,
      });
      mockSubmitToNcmec.mockResolvedValue({
        ...mockReports[1],
        status: 'SUBMITTED_NCMEC',
        ncmecReportId: 'NCMEC-12345',
      });

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submit to NCMEC' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Submit to NCMEC' }));

      await waitFor(() => {
        expect(mockSubmitToNcmec).toHaveBeenCalledWith('report-2');
      });
    });
  });

  describe('error handling', () => {
    it('shows error message when fetch fails', async () => {
      mockGetSafetyReportsStats.mockRejectedValue(new Error('Failed to load safety reports data'));
      mockGetCsamReports.mockRejectedValue(new Error('Failed to load safety reports data'));

      renderWithRouter(<SafetyReportsPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load safety reports data')).toBeInTheDocument();
      });
    });
  });

  describe('legal notice', () => {
    it('displays NCMEC compliance notice', async () => {
      mockGetSafetyReportsStats.mockResolvedValue(mockStats);
      mockGetCsamReports.mockResolvedValue({ reports: [], totalCount: 0, nextCursor: null });

      renderWithRouter(<SafetyReportsPage />);

      expect(screen.getByText(/18 U.S.C. 2258A/)).toBeInTheDocument();
      expect(
        screen.getByText(/All reports must be submitted to NCMEC within 24 hours/),
      ).toBeInTheDocument();
    });
  });
});
