/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from 'lucide-react';

export interface AvatarProps {
  /**
   * URL of the avatar image
   */
  src?: string | null;

  /**
   * Alt text for the avatar image
   */
  alt?: string;

  /**
   * Size of the avatar
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Custom CSS class
   */
  className?: string;
}

/**
 * Avatar component for displaying user profile images
 *
 * Features:
 * - Multiple size variants
 * - Fallback to user icon when no image
 * - Dark mode support
 * - Accessible alt text
 */
export function Avatar({ src, alt = 'User avatar', size = 'md', className = '' }: AvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const iconSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const baseClasses = `
    inline-flex items-center justify-center
    rounded-full overflow-hidden
    bg-gray-100 dark:bg-gray-700
    ${sizeClasses[size]}
    ${className}
  `;

  if (src) {
    return (
      <div className={baseClasses}>
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={baseClasses}>
      <User
        className={`${iconSizeClasses[size]} text-gray-400 dark:text-gray-500`}
        aria-hidden="true"
      />
    </div>
  );
}

export default Avatar;
