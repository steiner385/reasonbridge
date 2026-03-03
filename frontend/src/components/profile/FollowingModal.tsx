/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * FollowingModal - Modal wrapper for following list
 *
 * Displays users that a user is following in a modal dialog.
 * Supports pagination via the underlying FollowingList component.
 */

import Modal from '../ui/Modal';
import { FollowingList } from '../users/FollowingList';
import { PrivacyRestrictedMessage } from './PrivacyRestrictedMessage';

export interface FollowingModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** User ID to show following for */
  userId: string;
  /** User's display name (for title) */
  userName?: string;
  /** Whether the viewer can see this list */
  isVisible?: boolean;
  /** Restriction type if not visible */
  restrictionType?: 'FOLLOWERS_ONLY' | 'PRIVATE';
}

/**
 * FollowingModal component
 */
export function FollowingModal({
  isOpen,
  onClose,
  userId,
  userName,
  isVisible = true,
  restrictionType = 'FOLLOWERS_ONLY',
}: FollowingModalProps) {
  const title = userName ? `${userName} is Following` : 'Following';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="max-h-[60vh] overflow-y-auto -mx-6 -mb-6">
        {isVisible ? (
          <FollowingList userId={userId} showFollowButtons={true} pageSize={20} />
        ) : (
          <div className="p-6">
            <PrivacyRestrictedMessage
              restrictionType={restrictionType}
              sectionName="Following list"
              showFollowSuggestion={restrictionType === 'FOLLOWERS_ONLY'}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}

export default FollowingModal;
