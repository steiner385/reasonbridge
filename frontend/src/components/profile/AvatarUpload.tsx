/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';
import { Camera, X, Upload, User } from 'lucide-react';
import Button from '../ui/Button';

/**
 * Allowed image MIME types
 */
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface AvatarUploadProps {
  /**
   * Current avatar URL (if any)
   */
  currentAvatarUrl?: string | null;

  /**
   * Callback when avatar is uploaded successfully
   */
  onUpload: (file: File) => Promise<void>;

  /**
   * Callback when avatar is removed
   */
  onRemove?: () => Promise<void>;

  /**
   * Whether the component is in a loading state
   */
  isLoading?: boolean;

  /**
   * Size of the avatar preview
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Custom CSS class
   */
  className?: string;
}

/**
 * Avatar upload component with preview and validation
 *
 * Features:
 * - Drag and drop support
 * - File type and size validation
 * - Circular preview
 * - Remove functionality
 * - Dark mode support
 * - WCAG 2.1 AA accessible (44px minimum touch targets)
 */
export function AvatarUpload({
  currentAvatarUrl,
  onUpload,
  onRemove,
  isLoading = false,
  size = 'lg',
  className = '',
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Size classes
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const iconSizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  /**
   * Validate file type and size
   */
  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Please select a valid image file (JPEG, PNG, GIF, or WebP)';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be less than 5MB';
    }
    return null;
  }, []);

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setSelectedFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    },
    [validateFile],
  );

  /**
   * Handle input change
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle drag events
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle upload
   */
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      setPreview(null);
    } catch {
      setError('Failed to upload avatar. Please try again.');
    }
  };

  /**
   * Handle remove
   */
  const handleRemove = async () => {
    if (!onRemove) return;

    try {
      await onRemove();
      setSelectedFile(null);
      setPreview(null);
    } catch {
      setError('Failed to remove avatar. Please try again.');
    }
  };

  /**
   * Cancel selection
   */
  const handleCancel = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Trigger file input click
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Determine what to show in the preview
  const displayImage = preview || currentAvatarUrl;

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Avatar preview/upload area */}
      <div
        role="button"
        tabIndex={0}
        aria-label={displayImage ? 'Change avatar' : 'Upload avatar'}
        className={`
          relative rounded-full overflow-hidden
          ${sizeClasses[size]}
          ${isDragging ? 'ring-4 ring-primary-500 ring-offset-2' : ''}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          bg-gray-100 dark:bg-gray-700
          border-2 border-dashed border-gray-300 dark:border-gray-600
          hover:border-primary-500 dark:hover:border-primary-400
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        `}
        onClick={!isLoading ? handleClick : undefined}
        onKeyDown={(e) => {
          if (!isLoading && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {displayImage ? (
          <img src={displayImage} alt="Avatar preview" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User
              className={`${iconSizeClasses[size]} text-gray-400 dark:text-gray-500`}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Overlay on hover */}
        {!isLoading && (
          <div
            className="
              absolute inset-0 flex items-center justify-center
              bg-black/50 opacity-0 hover:opacity-100
              transition-opacity duration-200
            "
          >
            <Camera className={`${iconSizeClasses[size]} text-white`} aria-hidden="true" />
          </div>
        )}

        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
        aria-label="Upload avatar image"
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Action buttons */}
      {selectedFile && !isLoading && (
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Upload className="w-4 h-4" />}
            onClick={handleUpload}
          >
            Upload
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<X className="w-4 h-4" />}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Remove button (only shown when there's a current avatar and no pending selection) */}
      {currentAvatarUrl && !selectedFile && !isLoading && onRemove && (
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<X className="w-4 h-4" />}
          onClick={handleRemove}
          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          Remove
        </Button>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Click or drag to upload
        <br />
        JPEG, PNG, GIF, or WebP (max 5MB)
      </p>
    </div>
  );
}

export default AvatarUpload;
