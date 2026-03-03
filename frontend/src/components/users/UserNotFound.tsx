/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * UserNotFound - 404 page for missing user profiles
 *
 * Displays a friendly error message when a user profile
 * cannot be found or has been deleted.
 */

import { Link } from 'react-router-dom';
import Card, { CardBody } from '../ui/Card';
import Button from '../ui/Button';

export interface UserNotFoundProps {
  /** Custom title (default: "User Not Found") */
  title?: string;
  /** Custom message */
  message?: string;
  /** Show back to home button (default: true) */
  showHomeButton?: boolean;
  /** Show search users button (default: false) */
  showSearchButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * User not found error component
 *
 * @remarks
 * **Use Cases:**
 * - User ID doesn't exist
 * - User account was deleted
 * - User profile is private/hidden
 *
 * @example
 * ```tsx
 * // Basic usage
 * if (!user) {
 *   return <UserNotFound />;
 * }
 *
 * // Custom message
 * <UserNotFound
 *   title="Profile Unavailable"
 *   message="This user's profile is private."
 * />
 * ```
 */
export function UserNotFound({
  title = 'User Not Found',
  message = "The user you're looking for doesn't exist or may have been removed.",
  showHomeButton = true,
  showSearchButton = false,
  className = '',
}: UserNotFoundProps) {
  return (
    <div className={`max-w-lg mx-auto ${className}`}>
      <Card>
        <CardBody>
          <div className="text-center py-8">
            {/* Illustration */}
            <div className="text-6xl mb-4">👤</div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>

            {/* Message */}
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">{message}</p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {showHomeButton && (
                <Link to="/">
                  <Button variant="primary">Go to Home</Button>
                </Link>
              )}
              {showSearchButton && (
                <Link to="/search?type=users">
                  <Button variant="secondary">Search Users</Button>
                </Link>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default UserNotFound;
