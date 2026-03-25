/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export { useSuggestionActions } from './useSuggestionActions';
export type {
  ApplyTagOptions,
  ApplyTopicLinkOptions,
  SuggestionActionsState,
} from './useSuggestionActions';
export { useNotification, useShowNotification } from './useNotification';
export { useModerationNotifications } from './useModerationNotifications';
export { useDraftAutoSave } from './useDraftAutoSave';
export type {
  DraftSaveStatus,
  UseDraftAutoSaveOptions,
  UseDraftAutoSaveResult,
} from './useDraftAutoSave';
export { useOnlineStatus, useIsOnline } from './useOnlineStatus';
export type { OnlineStatusState, UseOnlineStatusOptions } from './useOnlineStatus';
export { useDocumentMeta } from './useDocumentMeta';
export type { DocumentMetaConfig } from './useDocumentMeta';
export { useTypingIndicator } from './useTypingIndicator';
export type {
  UseTypingIndicatorOptions,
  UseTypingIndicatorReturn,
  TypingUser,
} from './useTypingIndicator';
export { useVotes } from './useVotes';
export type { UseVotesResult } from './useVotes';
export { usePrivacySettings } from './usePrivacySettings';
export type {
  UsePrivacySettingsOptions,
  UsePrivacySettingsResult,
  PrivacySettingsResponse,
  UpdatePrivacySettingsDto,
} from './usePrivacySettings';
export { useNotificationPreferences } from './useNotificationPreferences';
export type {
  UseNotificationPreferencesOptions,
  UseNotificationPreferencesResult,
  NotificationPreferencesResponse,
  UpdateNotificationPreferencesDto,
  NotificationPreferences,
} from './useNotificationPreferences';
export { useCanViewSection, getPrivacyMessage } from './useCanViewSection';
export type {
  ProfileSection,
  UseCanViewSectionOptions,
  UseCanViewSectionResult,
  PrivacyMessageProps,
} from './useCanViewSection';
export { useRequireAuth } from './useRequireAuth';
export { useKeyboardNavigation, DEFAULT_SHORTCUTS } from './useKeyboardNavigation';
export type {
  KeyboardShortcut,
  UseKeyboardNavigationOptions,
  UseKeyboardNavigationReturn,
} from './useKeyboardNavigation';
