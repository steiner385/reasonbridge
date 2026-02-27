/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SocialConnections component for managing OAuth social provider connections
 *
 * @remarks
 * Displays a list of social providers (Google, Facebook) with their connection status.
 * Users can connect new providers via OAuth or disconnect existing connections.
 *
 * **Features:**
 * - Shows connection status for each provider (connected/not connected)
 * - Connect button initiates OAuth flow (redirects to provider)
 * - Disconnect button removes the connection
 * - Loading states during mutations
 * - Dark mode support
 * - Touch-friendly (44px minimum tap targets)
 *
 * @example
 * ```tsx
 * <SocialConnections className="max-w-md" />
 * ```
 */

import React from 'react';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import {
  useConnections,
  useInitiateConnection,
  useDeleteConnection,
  type SocialProvider,
} from '../../hooks/useContacts';

// ==================
// Provider Icons
// ==================

/**
 * Google icon SVG component
 */
function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
    </svg>
  );
}

/**
 * Facebook icon SVG component
 */
function FacebookIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

// ==================
// Provider Configuration
// ==================

interface ProviderConfig {
  id: SocialProvider;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColorClass: string;
  brandColorClass: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'GOOGLE',
    name: 'Google',
    icon: GoogleIcon,
    iconColorClass: 'text-red-500 dark:text-red-400',
    brandColorClass: 'bg-red-50 dark:bg-red-900/20',
  },
  {
    id: 'FACEBOOK',
    name: 'Facebook',
    icon: FacebookIcon,
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    brandColorClass: 'bg-blue-50 dark:bg-blue-900/20',
  },
];

// ==================
// Component Props
// ==================

export interface SocialConnectionsProps {
  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Callback when a connection status changes
   */
  onConnectionChange?: (provider: SocialProvider, connected: boolean) => void;
}

// ==================
// Connection Row Component
// ==================

interface ConnectionRowProps {
  provider: ProviderConfig;
  isConnected: boolean;
  isConnecting: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

function ConnectionRow({
  provider,
  isConnected,
  isConnecting,
  isDisconnecting,
  onConnect,
  onDisconnect,
}: ConnectionRowProps) {
  const IconComponent = provider.icon;
  const isLoading = isConnecting || isDisconnecting;

  return (
    <div
      className={`
        flex items-center justify-between p-3 sm:p-4 rounded-lg
        ${provider.brandColorClass}
        transition-colors
      `}
      role="listitem"
      aria-label={`${provider.name} connection status`}
    >
      {/* Provider info */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            bg-white dark:bg-gray-800 shadow-sm
          `}
        >
          <IconComponent className={`w-5 h-5 ${provider.iconColorClass}`} />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{provider.name}</p>
          <p
            className={`
              text-sm truncate
              ${
                isConnected
                  ? 'text-success-DEFAULT dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              }
            `}
          >
            {isConnected ? 'Connected' : 'Not connected'}
          </p>
        </div>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0 ml-3">
        {isConnected ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            disabled={isLoading}
            isLoading={isDisconnecting}
            aria-label={`Disconnect ${provider.name}`}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={onConnect}
            disabled={isLoading}
            isLoading={isConnecting}
            aria-label={`Connect ${provider.name}`}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================
// Main Component
// ==================

export function SocialConnections({ className = '', onConnectionChange }: SocialConnectionsProps) {
  const { data: connectionsData, isLoading: isLoadingConnections } = useConnections();

  const initiateConnection = useInitiateConnection({
    onSuccess: ({ authUrl }) => {
      // Redirect to OAuth provider
      window.location.href = authUrl;
    },
  });

  const deleteConnection = useDeleteConnection({
    onSuccess: () => {
      // Connection change will be reflected after query invalidation
    },
  });

  // Track which provider is being mutated
  const [pendingProvider, setPendingProvider] = React.useState<SocialProvider | null>(null);

  // Check if a provider is connected
  const isProviderConnected = (provider: SocialProvider): boolean => {
    if (!connectionsData?.connections) return false;
    return connectionsData.connections.some((c) => c.provider === provider);
  };

  // Handle connect action
  const handleConnect = async (provider: SocialProvider) => {
    setPendingProvider(provider);
    try {
      await initiateConnection.mutateAsync(provider);
      onConnectionChange?.(provider, true);
    } finally {
      setPendingProvider(null);
    }
  };

  // Handle disconnect action
  const handleDisconnect = async (provider: SocialProvider) => {
    setPendingProvider(provider);
    try {
      await deleteConnection.mutateAsync(provider);
      onConnectionChange?.(provider, false);
    } finally {
      setPendingProvider(null);
    }
  };

  // Loading state
  if (isLoadingConnections) {
    return (
      <Card variant="default" padding="lg" className={className}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Connected Accounts
          </h3>
        </CardHeader>
        <CardBody>
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" label="Loading connections..." />
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg" className={className}>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Connected Accounts
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Connect your social accounts to import contacts and invite friends
        </p>
      </CardHeader>
      <CardBody>
        <div className="space-y-3" role="list" aria-label="Social connections">
          {PROVIDERS.map((provider) => {
            const isConnected = isProviderConnected(provider.id);
            const isConnecting = initiateConnection.isPending && pendingProvider === provider.id;
            const isDisconnecting = deleteConnection.isPending && pendingProvider === provider.id;

            return (
              <ConnectionRow
                key={provider.id}
                provider={provider}
                isConnected={isConnected}
                isConnecting={isConnecting}
                isDisconnecting={isDisconnecting}
                onConnect={() => handleConnect(provider.id)}
                onDisconnect={() => handleDisconnect(provider.id)}
              />
            );
          })}
        </div>

        {/* Info text */}
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
          Your data is secure. We only access your contacts with your permission.
        </p>
      </CardBody>
    </Card>
  );
}

export default SocialConnections;
