/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Profile page for the current authenticated user
 *
 * @remarks
 * **Features:**
 * - View own profile with trust scores and activity stats
 * - Edit profile via modal (display name, bio, avatar)
 * - Quick access to settings and logout
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentUser } from '../../lib/useCurrentUser';
import { useDelayedLoading } from '../../hooks/useDelayedLoading';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfile } from '../../hooks/useUpdateProfile';
import { usePrivacySettings } from '../../hooks/usePrivacySettings';
import { useToast } from '../../contexts/ToastContext';
import type {
  PrivacySettings as PrivacySettingsType,
  ProfileVisibility,
  TrustVisibility,
} from '../../types/user';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import ProfileSkeleton from '../../components/ui/skeletons/ProfileSkeleton';
import ProfileEditForm from '../../components/profile/ProfileEditForm';
import type { ProfileEditFormData } from '../../components/profile/ProfileEditForm';
import { uploadAvatar, deleteAvatar } from '../../lib/api';

function ProfilePage() {
  const { data: user, isLoading, isError, error } = useCurrentUser();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const showSkeleton = useDelayedLoading(isLoading);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Profile update mutation
  const updateProfileMutation = useUpdateProfile(user?.id, {
    onSuccess: () => {
      toast.success('Profile updated successfully!');
      setIsEditModalOpen(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update profile');
    },
  });

  // Privacy settings
  const {
    settings: privacySettings,
    isPending: isPrivacySaving,
    updateSettings: updatePrivacySettings,
  } = usePrivacySettings();

  const handlePrivacyChange = (
    field: keyof PrivacySettingsType,
    value: ProfileVisibility | TrustVisibility,
  ) => {
    updatePrivacySettings({ [field]: value });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (data: ProfileEditFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleAvatarUpload = async (file: File) => {
    if (!user) return;
    setIsUploadingAvatar(true);
    try {
      await uploadAvatar(user.id, file);
      toast.success('Avatar uploaded successfully!');
    } catch (err) {
      toast.error('Failed to upload avatar');
      throw err;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user) return;
    setIsUploadingAvatar(true);
    try {
      await deleteAvatar(user.id);
      toast.success('Avatar removed');
    } catch (err) {
      toast.error('Failed to remove avatar');
      throw err;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  if (showSkeleton) {
    return <ProfileSkeleton />;
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Unable to Load Profile
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {error instanceof Error
                  ? error.message
                  : 'An error occurred while loading your profile.'}
              </p>
              <Link to="/">
                <Button variant="primary">Go to Home</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Not Logged In
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Please log in to view your profile.
              </p>
              <Link to="/">
                <Button variant="primary">Go to Home</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const formatTrustScore = (score: number) => {
    return (score * 100).toFixed(0) + '%';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleEditClick}
              data-testid="edit-profile-button"
            >
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar src={user.avatarUrl} alt={user.displayName} size="xl" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {user.displayName}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">{user.email}</p>
                {user.bio && (
                  <p className="mt-2 text-gray-700 dark:text-gray-300 max-w-prose">{user.bio}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-300">
                  Verification Level
                </p>
                <p
                  className="text-lg text-gray-900 dark:text-gray-100"
                  data-testid="verification-level"
                >
                  {user.verificationLevel?.replace('_', ' ') || 'Unknown'}
                </p>
                {user.verificationLevel === 'VERIFIED_HUMAN' && (
                  <span
                    data-testid="trust-badge"
                    className="inline-flex items-center gap-1 mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700"
                    title="This user has been verified as a real human"
                  >
                    ✓ Verified Human
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Status</p>
                <p className="text-lg text-gray-900 dark:text-gray-100">{user.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-300">Member Since</p>
                <p className="text-lg text-gray-900 dark:text-gray-100">
                  {formatDate(user.createdAt)}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Trust Scores */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Trust Scores</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4" data-testid="trust-score-display">
            <div data-testid="trust-score-ability">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Ability
                </span>
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {formatTrustScore(user.trustScoreAbility)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-500 dark:bg-primary-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: formatTrustScore(user.trustScoreAbility) }}
                />
              </div>
            </div>

            <div data-testid="trust-score-benevolence">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Benevolence
                </span>
                <span className="text-sm font-semibold text-secondary-600 dark:text-secondary-400">
                  {formatTrustScore(user.trustScoreBenevolence)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-secondary-500 dark:bg-secondary-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: formatTrustScore(user.trustScoreBenevolence) }}
                />
              </div>
            </div>

            <div data-testid="trust-score-integrity">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Integrity
                </span>
                <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {formatTrustScore(user.trustScoreIntegrity)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 dark:bg-indigo-400 h-2 rounded-full transition-all duration-300"
                  style={{ width: formatTrustScore(user.trustScoreIntegrity) }}
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Activity Stats */}
      {(user.topicCount !== undefined ||
        user.responseCount !== undefined ||
        user.followerCount !== undefined ||
        user.followingCount !== undefined) && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Activity</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {user.topicCount !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {user.topicCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Topics</p>
                </div>
              )}
              {user.responseCount !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {user.responseCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Responses</p>
                </div>
              )}
              {user.followerCount !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {user.followerCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Followers</p>
                </div>
              )}
              {user.followingCount !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {user.followingCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Following</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Account Actions
          </h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Log Out</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Sign out of your account</p>
              </div>
              <Button variant="danger" onClick={handleLogout}>
                Log Out
              </Button>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Settings</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Manage your account preferences
                </p>
              </div>
              <Link to="/settings">
                <Button variant="secondary">Settings</Button>
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile"
        size="md"
      >
        <ProfileEditForm
          initialData={{
            displayName: user.displayName,
            bio: user.bio || '',
          }}
          currentAvatarUrl={user.avatarUrl}
          onSubmit={handleEditSubmit}
          onAvatarUpload={handleAvatarUpload}
          onAvatarRemove={handleAvatarRemove}
          onCancel={() => setIsEditModalOpen(false)}
          isLoading={updateProfileMutation.isPending}
          isUploadingAvatar={isUploadingAvatar}
          error={updateProfileMutation.error?.message}
          privacySettings={privacySettings}
          onPrivacyChange={handlePrivacyChange}
          isPrivacySaving={isPrivacySaving}
        />
      </Modal>
    </div>
  );
}

export default ProfilePage;
