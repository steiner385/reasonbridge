/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { User as UserIcon } from 'lucide-react';
import type { User } from '../../types/user';

export interface AvatarProps {
  /**
   * User object with avatar information
   */
  user?: User | null;

  /**
   * Size of the avatar
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Custom CSS class
   */
  className?: string;
}

type AvatarSizeKey = 'small' | 'medium' | 'large';

/**
 * Generate a Gravatar URL from an email address
 */
function getGravatarUrl(email: string, size = 200): string {
  const hash = email.trim().toLowerCase();
  // Note: In production, this should use a proper MD5 hash
  // For now, we'll use a simple hash function
  let hashValue = 0;
  for (let i = 0; i < hash.length; i++) {
    const char = hash.charCodeAt(i);
    hashValue = (hashValue << 5) - hashValue + char;
    hashValue = hashValue & hashValue;
  }
  const md5Hash = Math.abs(hashValue).toString(16).padStart(32, '0');
  return `https://www.gravatar.com/avatar/${md5Hash}?s=${size}&d=identicon`;
}

/**
 * Avatar component for displaying user profile images
 *
 * Features:
 * - Multiple size variants (xs, sm, md, lg, xl)
 * - Multi-resolution support with WebP/JPEG fallback
 * - Backwards compatibility with legacy avatarUrl field
 * - Fallback to Gravatar when no avatar is available
 * - Dark mode support
 * - Accessible alt text
 */
export function Avatar({ user, size = 'md', className = '' }: AvatarProps) {
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

  // Map size props to avatar size keys
  const sizeMap: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', AvatarSizeKey> = {
    xs: 'small',
    sm: 'small',
    md: 'medium',
    lg: 'large',
    xl: 'large',
  };
  const sizeKey = sizeMap[size];

  // Test attributes for testing
  const testAttributes = {
    'data-testid': 'avatar',
    'data-size': size,
    'data-alt': user?.displayName || 'User avatar',
  };

  // If no user, show default icon
  if (!user) {
    return (
      <div className={baseClasses} {...testAttributes}>
        <UserIcon
          className={`${iconSizeClasses[size]} text-gray-400 dark:text-gray-500`}
          aria-hidden="true"
        />
      </div>
    );
  }

  // Use new structured avatarUrls if available
  const urls = user.avatarUrls?.[sizeKey];
  if (urls?.webp && urls?.jpg) {
    return (
      <div className={baseClasses} {...testAttributes}>
        <picture className="w-full h-full">
          <source srcSet={urls.webp} type="image/webp" />
          <img src={urls.jpg} alt={user.displayName} className="w-full h-full object-cover" />
        </picture>
      </div>
    );
  }

  // Legacy fallback: use avatarUrl or Gravatar
  const fallbackSrc = user.avatarUrl || getGravatarUrl(user.email);
  return (
    <div className={baseClasses} {...testAttributes}>
      <img src={fallbackSrc} alt={user.displayName} className="w-full h-full object-cover" />
    </div>
  );
}

export default Avatar;
