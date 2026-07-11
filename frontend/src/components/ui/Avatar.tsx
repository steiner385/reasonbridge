/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { User as UserIcon } from 'lucide-react';
import type { User } from '../../types/user';
import { getMD5Hash } from '../../lib/crypto';

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
 * Uses MD5 hash of lowercase, trimmed email per Gravatar specification
 * @param email - User email address
 * @param size - Avatar size in pixels (default 200)
 * @returns Gravatar URL
 */
function getGravatarUrl(email: string, size = 200): string {
  // Gravatar expects lowercase, trimmed email
  const normalizedEmail = email.toLowerCase().trim();
  const hash = getMD5Hash(normalizedEmail);
  // Use 'identicon' as default for users without Gravatar accounts
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=identicon`;
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
          <img
            src={urls.jpg}
            alt={user.displayName}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to icon if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        </picture>
      </div>
    );
  }

  // Legacy fallback: use avatarUrl or Gravatar (if email is available)
  // Note: Public profile API may not include email for privacy reasons
  const fallbackSrc = user.avatarUrl || (user.email ? getGravatarUrl(user.email) : null);

  // If no fallback source (no avatar and no email), show default icon
  if (!fallbackSrc) {
    return (
      <div className={baseClasses} {...testAttributes}>
        <UserIcon
          className={`${iconSizeClasses[size]} text-gray-400 dark:text-gray-500`}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className={baseClasses} {...testAttributes}>
      <img
        src={fallbackSrc}
        alt={user.displayName}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to icon if image fails to load
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  );
}

export default Avatar;
