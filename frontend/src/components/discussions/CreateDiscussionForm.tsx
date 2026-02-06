/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * T028 [P] [US1] - Create Discussion Form Component (Feature 009)
 * T032 [US1] - Form validation for discussion creation
 *
 * Form for creating new discussions with:
 * - Title input (10-200 chars)
 * - Initial response content (50-25000 chars)
 * - Optional citations (max 10)
 * - Real-time validation
 * - Character counters
 */

import { useState, type FormEvent } from 'react';
import { useCreateDiscussion } from '../../hooks/useCreateDiscussion';
import Button from '../ui/Button';
import type { CitationInput } from '../../services/discussionService';

export interface CreateDiscussionFormProps {
  topicId: string;
  onSuccess?: (discussionId: string) => void;
  onCancel?: () => void;
}

interface FormErrors {
  title?: string;
  content?: string;
  citations?: string;
}

export function CreateDiscussionForm({ topicId, onSuccess, onCancel }: CreateDiscussionFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [citations, setCitations] = useState<CitationInput[]>([]);
  const [newCitationUrl, setNewCitationUrl] = useState('');
  const [newCitationTitle, setNewCitationTitle] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const {
    mutate: createDiscussion,
    isPending,
    error: apiError,
  } = useCreateDiscussion({
    onSuccess: (data) => {
      onSuccess?.(data.id);
    },
  });

  // T032: Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Title validation (10-200 chars)
    if (title.trim().length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    } else if (title.trim().length > 200) {
      newErrors.title = 'Title cannot exceed 200 characters';
    }

    // Content validation (50-25000 chars)
    if (content.trim().length < 50) {
      newErrors.content = 'Initial response must be at least 50 characters';
    } else if (content.trim().length > 25000) {
      newErrors.content = 'Initial response cannot exceed 25,000 characters';
    }

    // Citations validation (max 10)
    if (citations.length > 10) {
      newErrors.citations = 'Maximum 10 citations allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddCitation = () => {
    if (!newCitationUrl.trim()) return;

    // Basic URL validation
    try {
      new URL(newCitationUrl);
    } catch {
      setErrors({ ...errors, citations: 'Invalid URL format' });
      return;
    }

    if (citations.length >= 10) {
      setErrors({ ...errors, citations: 'Maximum 10 citations allowed' });
      return;
    }

    setCitations([
      ...citations,
      {
        url: newCitationUrl.trim(),
        title: newCitationTitle.trim() || undefined,
      },
    ]);
    setNewCitationUrl('');
    setNewCitationTitle('');
    setErrors({ ...errors, citations: undefined });
  };

  const handleRemoveCitation = (index: number) => {
    setCitations(citations.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createDiscussion({
      topicId,
      title: title.trim(),
      initialResponse: {
        content: content.trim(),
        citations: citations.length > 0 ? citations : undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* API Error Display */}
      {apiError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{apiError.message}</p>
        </div>
      )}

      {/* Title Input */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Discussion Title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Should carbon taxes be increased in 2027?"
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={200}
        />
        <div className="flex justify-between mt-1">
          <span className="text-sm text-red-500">{errors.title}</span>
          <span className="text-sm text-gray-500">{title.length}/200</span>
        </div>
      </div>

      {/* Content Textarea */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          Initial Response <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-gray-600 mb-2">
          Share your perspective on this topic. Be thoughtful and substantive.
        </p>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="I believe we need to address this issue because..."
          rows={8}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.content ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={25000}
        />
        <div className="flex justify-between mt-1">
          <span className="text-sm text-red-500">{errors.content}</span>
          <span className="text-sm text-gray-500">{content.length.toLocaleString()}/25,000</span>
        </div>
      </div>

      {/* Citations Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Citations (Optional)</label>
        <p className="text-sm text-gray-600 mb-3">Add sources to support your argument (max 10)</p>

        {/* Existing Citations */}
        {citations.length > 0 && (
          <div className="space-y-2 mb-3">
            {citations.map((citation, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-md">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{citation.url}</p>
                  {citation.title && (
                    <p className="text-sm text-gray-600 truncate">{citation.title}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCitation(index)}
                  className="text-red-500 hover:text-red-700"
                  aria-label="Remove citation"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Citation */}
        {citations.length < 10 && (
          <div className="space-y-2">
            <input
              type="url"
              value={newCitationUrl}
              onChange={(e) => setNewCitationUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newCitationTitle}
              onChange={(e) => setNewCitationTitle(e.target.value)}
              placeholder="Citation title (optional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCitation}
              disabled={!newCitationUrl.trim()}
            >
              Add Citation
            </Button>
          </div>
        )}
        {errors.citations && <p className="text-sm text-red-500 mt-1">{errors.citations}</p>}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? 'Publishing...' : 'Publish Discussion'}
        </Button>
      </div>
    </form>
  );
}
