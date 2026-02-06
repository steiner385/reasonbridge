/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FlagContentModal - Modal for reporting inappropriate content
 *
 * Provides a form where users can report content with specific reasons,
 * descriptions, and optional anonymity settings.
 */

import React, { useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import type { FlagCategory } from '../../types/moderation';
import { FLAG_CATEGORIES } from '../../types/moderation';
import { useFlagContent } from '../../lib/useFlagContent';
import { useShowNotification } from '../../hooks/useNotification';

export interface FlagContentModalProps {
  /**
   * Whether the modal is open
   */
  isOpen: boolean;

  /**
   * Callback when the modal should be closed
   */
  onClose: () => void;

  /**
   * ID of the content being flagged
   */
  contentId: string;

  /**
   * Type of content being flagged
   */
  contentType: 'response' | 'comment' | 'topic' | 'other';

  /**
   * Optional callback when flag is successfully submitted
   */
  onSuccess?: () => void;
}

const FlagContentModal: React.FC<FlagContentModalProps> = ({
  isOpen,
  onClose,
  contentId,
  contentType,
  onSuccess,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<FlagCategory>('other');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { flagContent, isLoading, isSuccess, isError, error } = useFlagContent();
  const notify = useShowNotification();
  const prevIsOpenRef = useRef(isOpen);

  // Reset form when modal transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      // Schedule state updates asynchronously to avoid cascading renders
      const timer = setTimeout(() => {
        setSelectedCategory('other');
        setReason('');
        setDescription('');
        setIsAnonymous(true);
        setValidationError(null);
      }, 0);
      prevIsOpenRef.current = isOpen;
      return () => clearTimeout(timer);
    }
    prevIsOpenRef.current = isOpen;
    return undefined;
  }, [isOpen]);

  // Close modal and call onSuccess when flag is submitted successfully
  useEffect(() => {
    if (isSuccess) {
      notify.success(
        'Report submitted',
        'Thank you! Our moderation team will review your report.',
        4000,
      );
      onSuccess?.();
      onClose();
    }
  }, [isSuccess, onClose, onSuccess, notify]);

  // Show error notification when submission fails
  useEffect(() => {
    if (isError && error) {
      notify.error('Failed to submit report', error);
    }
  }, [isError, error, notify]);

  const validateForm = (): boolean => {
    if (!selectedCategory) {
      setValidationError('Please select a category');
      return false;
    }
    if (!reason.trim()) {
      setValidationError('Please provide a reason');
      return false;
    }
    if (!description.trim()) {
      setValidationError('Please provide a detailed description');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await flagContent({
        contentId,
        contentType,
        category: selectedCategory,
        reason,
        description,
        isAnonymous,
      });
    } catch {
      // Error is handled by the hook state
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Report Content"
      size="lg"
      showCloseButton={!isLoading}
      closeOnBackdropClick={!isLoading}
      closeOnEscape={!isLoading}
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={isLoading}
          >
            Submit Report
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Success Message */}
        {isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              Thank you! Your report has been submitted and will be reviewed by our moderation team.
            </p>
          </div>
        )}

        {/* Error Message */}
        {isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              {error || 'Failed to submit report. Please try again.'}
            </p>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">{validationError}</p>
          </div>
        )}

        {/* Content Type Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">Content Type</p>
          <p className="text-sm font-medium text-gray-900 mt-1 capitalize">{contentType}</p>
        </div>

        {/* Category Selection */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-3">
            Report Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as FlagCategory)}
            disabled={isLoading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
          >
            {Object.entries(FLAG_CATEGORIES).map(([key, { label, description }]) => (
              <option key={key} value={key}>
                {label} - {description}
              </option>
            ))}
          </select>
        </div>

        {/* Reason Input */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason <span className="text-red-500">*</span>
          </label>
          <Input
            id="reason"
            type="text"
            placeholder="Briefly summarize the issue"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isLoading}
            maxLength={100}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{reason.length}/100 characters</p>
        </div>

        {/* Description Input */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Detailed Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            placeholder="Provide specific details about why you're reporting this content..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
            maxLength={500}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm resize-none"
            rows={4}
            required
          />
          <p className="text-xs text-gray-500 mt-1">{description.length}/500 characters</p>
        </div>

        {/* Anonymity Checkbox */}
        <div className="flex items-center gap-3">
          <input
            id="anonymous"
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            disabled={isLoading}
            className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed"
          />
          <label htmlFor="anonymous" className="text-sm text-gray-700">
            Submit anonymously (your account won't be associated with this report)
          </label>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-900">
            Your report will be reviewed by our moderation team. We take all reports seriously and
            will investigate appropriately. If you provide your contact information, we may reach
            out for additional details.
          </p>
        </div>
      </form>
    </Modal>
  );
};

export default FlagContentModal;
