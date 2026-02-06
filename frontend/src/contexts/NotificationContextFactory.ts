/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext } from 'react';
import type { NotificationContextType } from './NotificationContext';

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);
