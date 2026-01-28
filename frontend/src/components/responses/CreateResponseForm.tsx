/**
 * T045 [P] [US2] - Create Response Form Component (Feature 009)
 *
 * Form for posting responses to discussions
 * Features:
 * - Content textarea (50-25000 chars)
 * - Optional citations (max 10)
 * - Real-time validation
 * - Character counter
 * - Optimistic updates
 */

import { useState, FormEvent } from 'react';
import { useCreateResponse } from '../../hooks/useCreateResponse';
import Button from '../ui/Button';
import type { CitationInput } from '../../services/discussionService';

export interface CreateResponseFormProps {
  discussionId: string;
  parentResponseId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

interface FormErrors {
  content?: string;
  citations?: string;
}

export function CreateResponseForm({
  discussionId,
  parentResponseId,
  onSuccess,
  onCancel,
  placeholder = 'Share your perspective...',
}: CreateResponseFormProps) {
  const [content, setContent] = useState('');
  const [citations, setCitations] = useState<CitationInput[]>([]);
  const [newCitationUrl, setNewCitationUrl] = useState('');
  const [newCitationTitle, setNewCitationTitle] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [showCitationInput, setShowCitationInput] = useState(false);

  const {
    mutate: createResponse,
    isPending,
    error: apiError,
  } = useCreateResponse({
    enableOptimisticUpdate: true,
    onSuccess: () => {
      setContent('');
      setCitations([]);
      setErrors({});
      onSuccess?.();
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Content validation (50-25000 chars)
    if (content.trim().length < 50) {
      newErrors.content = 'Response must be at least 50 characters';
    } else if (content.trim().length > 25000) {
      newErrors.content = 'Response cannot exceed 25,000 characters';
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
    setShowCitationInput(false);
  };

  const handleRemoveCitation = (index: number) => {
    setCitations(citations.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createResponse({
      discussionId,
      content: content.trim(),
      citations: citations.length > 0 ? citations : undefined,
      parentResponseId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* API Error Display */}
      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-700">{apiError.message}</p>
        </div>
      )}

      {/* Content Textarea */}
      <div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={6}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.content ? 'border-red-500' : 'border-gray-300'
          }`}
          maxLength={25000}
        />
        <div className="flex justify-between mt-1">
          <span className="text-sm text-red-500">{errors.content}</span>
          <span className={`text-sm ${content.length >= 50 ? 'text-green-600' : 'text-gray-500'}`}>
            {content.length.toLocaleString()}/25,000
            {content.length < 50 && ` (${50 - content.length} more needed)`}
          </span>
        </div>
      </div>

      {/* Citations Section */}
      {citations.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Citations</label>
          {citations.map((citation, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      {showCitationInput ? (
        <div className="space-y-2 p-3 bg-gray-50 rounded-md">
          <input
            type="url"
            value={newCitationUrl}
            onChange={(e) => setNewCitationUrl(e.target.value)}
            placeholder="https://example.com/source"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newCitationTitle}
            onChange={(e) => setNewCitationTitle(e.target.value)}
            placeholder="Citation title (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCitation}
              disabled={!newCitationUrl.trim()}
            >
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCitationInput(false);
                setNewCitationUrl('');
                setNewCitationTitle('');
              }}
            >
              Cancel
            </Button>
          </div>
          {errors.citations && <p className="text-sm text-red-500">{errors.citations}</p>}
        </div>
      ) : (
        citations.length < 10 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCitationInput(true)}
            className="text-blue-600"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Citation
          </Button>
        )
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" disabled={isPending || content.trim().length < 50}>
          {isPending ? 'Posting...' : 'Post Response'}
        </Button>
      </div>
    </form>
  );
}
