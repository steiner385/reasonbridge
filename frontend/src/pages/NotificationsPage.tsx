/**
 * Notifications Page
 * Displays a list of user notifications
 * Includes unread badges, marking as read, and filtering
 */

export default function NotificationsPage() {
  // Placeholder implementation - will be populated with actual notifications logic
  const notifications = [
    {
      id: '1',
      type: 'comment',
      message: 'New comment on your discussion',
      timestamp: '2 hours ago',
      read: false,
    },
    {
      id: '2',
      type: 'mention',
      message: 'You were mentioned in a topic',
      timestamp: '5 hours ago',
      read: false,
    },
    {
      id: '3',
      type: 'system',
      message: 'Your feedback preferences have been updated',
      timestamp: '1 day ago',
      read: true,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Stay updated with your discussions and mentions
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button className="border-b-2 border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600">
          All
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
          Unread
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
          Mentions
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-lg border p-4 transition-colors ${
              notification.read
                ? 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                : 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {/* Icon based on type */}
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      notification.type === 'comment'
                        ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                        : notification.type === 'mention'
                          ? 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {notification.type === 'comment' && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
                        />
                      </svg>
                    )}
                    {notification.type === 'mention' && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                        />
                      </svg>
                    )}
                    {notification.type === 'system' && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="flex-1">
                    <p
                      className={`text-sm ${
                        notification.read
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'font-semibold text-gray-900 dark:text-white'
                      }`}
                    >
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {notification.timestamp}
                    </p>
                  </div>
                </div>
              </div>

              {/* Unread indicator */}
              {!notification.read && (
                <div className="h-2 w-2 rounded-full bg-blue-600" aria-label="Unread" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state (when no notifications) */}
      {notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mb-4 h-12 w-12 text-gray-400"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No notifications</h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            You're all caught up! Check back later for updates.
          </p>
        </div>
      )}
    </div>
  );
}
