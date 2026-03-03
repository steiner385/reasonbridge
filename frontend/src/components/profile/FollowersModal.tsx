/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FollowersModal - Modal wrapper for followers list
 *
 * Displays a user's followers in a modal dialog.
 * Supports pagination via the underlying FollowersList component.
 */

import Modal from '../ui/Modal';
import { FollowersList } from '../users/FollowersList';
import { PrivacyRestrictedMessage } from './PrivacyRestrictedMessage';

export interface FollowersModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** User ID to show followers for */
  userId: string;
  /** User's display name (for title) */
  userName?: string;
  /** Whether the viewer can see this list */
  isVisible?: boolean;
  /** Restriction type if not visible */
  restrictionType?: 'FOLLOWERS_ONLY' | 'PRIVATE';
}

/**
 * FollowersModal component
 */
export function FollowersModal({
  isOpen,
  onClose,
  userId,
  userName,
  isVisible = true,
  restrictionType = 'FOLLOWERS_ONLY',
}: FollowersModalProps) {
  const title = userName ? `${userName}'s Followers` : 'Followers';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="max-h-[60vh] overflow-y-auto -mx-6 -mb-6">
        {isVisible ? (
          <FollowersList userId={userId} showFollowButtons={true} pageSize={20} />
        ) : (
          <div className="p-6">
            <PrivacyRestrictedMessage
              restrictionType={restrictionType}
              sectionName="Followers list"
              showFollowSuggestion={restrictionType === 'FOLLOWERS_ONLY'}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

export default FollowersModal;
