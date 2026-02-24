/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ContactList component for displaying imported contacts from social providers
 *
 * @remarks
 * Shows a list of contacts imported from connected social providers (Google, Facebook).
 * Each contact can be invited to a topic if they're not on the platform, or their
 * profile can be viewed if they're already matched to a user.
 *
 * **Features:**
 * - Displays imported contacts with privacy-aware truncated names
 * - Provider icon indicates source (Google/Facebook)
 * - "Invite to Topic" button for non-platform contacts
 * - "On ReasonBridge" indicator for matched users
 * - Import more contacts dropdown menu
 * - Loading states with skeletons
 * - Empty state when no contacts imported
 * - Dark mode support
 * - Touch-friendly (44px minimum tap targets)
 *
 * @example
 * ```tsx
 * <ContactList
 *   className="max-w-lg"
 *   onInvite={(contact) => openInviteModal(contact)}
 * />
 * ```
 */

import React, { useState } from 'react';
import Button from '../ui/Button';
import Card, { CardHeader, CardBody } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';
import EmptyState from '../ui/EmptyState';
import {
  useContacts,
  useImportContacts,
  useConnections,
  type ImportedContact,
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
// Helper Functions
// ==================

/**
 * Get the appropriate icon component for a provider
 */
function getProviderIcon(provider: SocialProvider): React.ComponentType<{ className?: string }> {
  switch (provider) {
    case 'GOOGLE':
      return GoogleIcon;
    case 'FACEBOOK':
      return FacebookIcon;
    default:
      return GoogleIcon;
  }
}

/**
 * Get the color class for a provider icon
 */
function getProviderColorClass(provider: SocialProvider): string {
  switch (provider) {
    case 'GOOGLE':
      return 'text-red-500 dark:text-red-400';
    case 'FACEBOOK':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
}

/**
 * Truncate display name for privacy (shows first name + last initial)
 */
function truncateDisplayName(name: string | null): string {
  if (!name) return 'Unknown';

  const trimmed = name.trim();
  if (trimmed.length === 0) return 'Unknown';

  const parts = trimmed.split(/\s+/);
  const firstName = parts[0] || 'Unknown';

  if (parts.length === 1) {
    // Single name, show first 6 characters + "..."
    return firstName.length > 6 ? `${firstName.slice(0, 6)}...` : firstName;
  }

  // Multiple names: show first name + last initial
  const lastName = parts[parts.length - 1] || '';
  if (!lastName) return firstName;
  return `${firstName} ${lastName.charAt(0).toUpperCase()}.`;
}

// ==================
// Component Props
// ==================

export interface ContactListProps {
  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Callback when user wants to invite a contact to a topic
   */
  onInvite?: (contact: ImportedContact) => void;
}

// ==================
// Contact Row Component
// ==================

interface ContactRowProps {
  contact: ImportedContact;
  onInvite?: (contact: ImportedContact) => void;
}

function ContactRow({ contact, onInvite }: ContactRowProps) {
  const colorClass = getProviderColorClass(contact.provider);
  const displayName = truncateDisplayName(contact.displayName);
  const isOnPlatform = !!contact.matchedUserId;

  return (
    <div
      className={`
        flex items-center justify-between p-3 sm:p-4 rounded-lg
        bg-gray-50 dark:bg-gray-800/50
        hover:bg-gray-100 dark:hover:bg-gray-800
        transition-colors
      `}
      role="listitem"
      aria-label={`Contact: ${displayName}`}
    >
      {/* Contact info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Avatar placeholder */}
        <div
          className={`
            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
            bg-gray-200 dark:bg-gray-700
          `}
        >
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {(contact.displayName || 'U').charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Name and provider */}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{displayName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {contact.provider === 'GOOGLE' ? (
              <GoogleIcon className={`w-3.5 h-3.5 ${colorClass}`} />
            ) : (
              <FacebookIcon className={`w-3.5 h-3.5 ${colorClass}`} />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {contact.provider === 'GOOGLE' ? 'Google' : 'Facebook'}
            </span>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0 ml-3">
        {isOnPlatform ? (
          <span
            className={`
              inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
              bg-green-100 text-green-800
              dark:bg-green-900/30 dark:text-green-400
            `}
          >
            On ReasonBridge
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onInvite?.(contact)}
            aria-label={`Invite ${displayName} to a topic`}
          >
            Invite to Topic
          </Button>
        )}
      </div>
    </div>
  );
}

// ==================
// Contact Skeleton Component
// ==================

function ContactRowSkeleton() {
  return (
    <div
      className={`
        flex items-center justify-between p-3 sm:p-4 rounded-lg
        bg-gray-50 dark:bg-gray-800/50
        animate-pulse
      `}
      role="presentation"
      aria-hidden="true"
    >
      {/* Avatar skeleton */}
      <div className="flex items-center gap-3 flex-1">
        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
        </div>
      </div>
      {/* Button skeleton */}
      <div className="h-9 w-28 bg-gray-300 dark:bg-gray-600 rounded-md" />
    </div>
  );
}

// ==================
// Import Menu Component
// ==================

interface ImportMenuProps {
  onImport: (provider: SocialProvider) => void;
  isImporting: boolean;
  connectedProviders: SocialProvider[];
}

function ImportMenu({ onImport, isImporting, connectedProviders }: ImportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // If no providers connected, don't show the menu
  if (connectedProviders.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isImporting}
        isLoading={isImporting}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Import more contacts"
      >
        {isImporting ? 'Importing...' : 'Import More'}
        {!isImporting && (
          <svg
            className={`ml-1 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} aria-hidden="true" />

          {/* Menu */}
          <div
            className={`
              absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              py-1
            `}
            role="menu"
            aria-orientation="vertical"
          >
            {connectedProviders.map((provider) => {
              const IconComponent = getProviderIcon(provider);
              const colorClass = getProviderColorClass(provider);
              const providerName = provider === 'GOOGLE' ? 'Google' : 'Facebook';

              return (
                <button
                  key={provider}
                  onClick={() => {
                    onImport(provider);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-2 px-4 py-2.5
                    text-sm text-gray-700 dark:text-gray-200
                    hover:bg-gray-100 dark:hover:bg-gray-700
                    transition-colors min-h-[44px]
                  `}
                  role="menuitem"
                >
                  <IconComponent className={`w-4 h-4 ${colorClass}`} />
                  <span>Import from {providerName}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ==================
// Main Component
// ==================

export function ContactList({ className = '', onInvite }: ContactListProps) {
  const { data: contactsData, isLoading: isLoadingContacts } = useContacts({ limit: 50 });
  const { data: connectionsData } = useConnections();
  const importContacts = useImportContacts();

  // Get connected providers from connections data
  const connectedProviders: SocialProvider[] = React.useMemo(() => {
    if (!connectionsData?.connections) return [];
    return connectionsData.connections.map((c) => c.provider);
  }, [connectionsData]);

  // Handle import action
  const handleImport = (provider: SocialProvider) => {
    importContacts.mutate(provider);
  };

  // Loading state
  if (isLoadingContacts) {
    return (
      <Card variant="default" padding="lg" className={className}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Imported Contacts
          </h3>
        </CardHeader>
        <CardBody>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <ContactRowSkeleton key={i} />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  const contacts = contactsData?.contacts ?? [];
  const totalContacts = contactsData?.total ?? 0;

  // Empty state
  if (contacts.length === 0) {
    return (
      <Card variant="default" padding="lg" className={className}>
        <CardHeader>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Imported Contacts
          </h3>
        </CardHeader>
        <CardBody>
          <EmptyState
            title="No contacts imported"
            message="Connect your social accounts and import your contacts to invite friends to discussions."
            showAction={connectedProviders.length > 0}
            actionLabel={
              connectedProviders.length > 0 && connectedProviders[0]
                ? `Import from ${connectedProviders[0] === 'GOOGLE' ? 'Google' : 'Facebook'}`
                : 'Import'
            }
            onAction={
              connectedProviders.length > 0 && connectedProviders[0]
                ? () => {
                    const provider = connectedProviders[0];
                    if (provider) handleImport(provider);
                  }
                : undefined
            }
            wrapped={false}
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg" className={className}>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Imported Contacts ({totalContacts})
          </h3>
          <ImportMenu
            onImport={handleImport}
            isImporting={importContacts.isPending}
            connectedProviders={connectedProviders}
          />
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-2" role="list" aria-label="Imported contacts">
          {contacts.map((contact) => (
            <ContactRow key={contact.id} contact={contact} onInvite={onInvite} />
          ))}
        </div>

        {/* Show loading indicator when importing */}
        {importContacts.isPending && (
          <div className="flex justify-center py-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <LoadingSpinner size="sm" label="Importing contacts..." />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export default ContactList;
