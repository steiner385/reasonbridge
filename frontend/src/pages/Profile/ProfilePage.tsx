/**
 * Profile page for the current authenticated user
 */

import { useCurrentUser } from '../../lib/useCurrentUser';
import Card, { CardHeader, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';

function ProfilePage() {
  const { data: user, isLoading, isError, error } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-600">Loading your profile...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to Load Profile
              </h2>
              <p className="text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'An error occurred while loading your profile.'}
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Not Logged In
              </h2>
              <p className="text-gray-600 mb-4">
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
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user.displayName}
              </h2>
              <p className="text-gray-600">{user.email}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-500">Verification Level</p>
                <p className="text-lg text-gray-900">
                  {user.verificationLevel.replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-lg text-gray-900">{user.status}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Member Since</p>
                <p className="text-lg text-gray-900">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Trust Scores */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-gray-900">Trust Scores</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Ability</span>
                <span className="text-sm font-semibold text-primary-600">
                  {formatTrustScore(user.trustScoreAbility)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: formatTrustScore(user.trustScoreAbility) }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Benevolence</span>
                <span className="text-sm font-semibold text-secondary-600">
                  {formatTrustScore(user.trustScoreBenevolence)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-secondary-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: formatTrustScore(user.trustScoreBenevolence) }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Integrity</span>
                <span className="text-sm font-semibold text-indigo-600">
                  {formatTrustScore(user.trustScoreIntegrity)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
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
            <h2 className="text-xl font-semibold text-gray-900">Activity</h2>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {user.topicCount !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{user.topicCount}</p>
                  <p className="text-sm text-gray-600">Topics</p>
                </div>
              )}
              {user.responseCount !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{user.responseCount}</p>
                  <p className="text-sm text-gray-600">Responses</p>
                </div>
              )}
              {user.followerCount !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{user.followerCount}</p>
                  <p className="text-sm text-gray-600">Followers</p>
                </div>
              )}
              {user.followingCount !== undefined && (
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{user.followingCount}</p>
                  <p className="text-sm text-gray-600">Following</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default ProfilePage;
