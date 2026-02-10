/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Moderation History Page
 *
 * Displays complete history of all moderation actions
 */

import { ModerationHistoryView } from '../../components/moderation';

/**
 * ModerationHistoryPage component
 */
export default function ModerationHistoryPage() {
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Moderation History
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View all moderation actions with filtering and sorting
        </p>
      </div>

      {/* History View */}
      <ModerationHistoryView pageSize={25} />
    </div>
  );
}
