/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ReadStateDto {
  userId: string;
  topicId: string;
  lastReadAt: Date;
  lastResponseId: string | null;
}
