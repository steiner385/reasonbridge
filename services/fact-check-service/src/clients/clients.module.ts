/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Module, Global } from '@nestjs/common';
import { GoogleFactCheckClient } from './google-fact-check.client.js';
import { FACT_CHECK_CLIENTS } from './abstract-fact-check.client.js';

/**
 * Module providing external fact-check API clients
 *
 * This module is global, making all clients available throughout
 * the fact-check service without explicit imports.
 *
 * Clients are injected both individually (for direct use) and
 * as an array via FACT_CHECK_CLIENTS token (for aggregation).
 */
@Global()
@Module({
  providers: [
    GoogleFactCheckClient,
    // Future clients can be added here:
    // SnopesClient,
    // PolitiFactClient,
    // FactCheckOrgClient,
    {
      provide: FACT_CHECK_CLIENTS,
      useFactory: (googleClient: GoogleFactCheckClient) => {
        // Return array of all configured clients
        const clients = [googleClient];
        return clients.filter((c) => c.isConfigured());
      },
      inject: [GoogleFactCheckClient],
    },
  ],
  exports: [GoogleFactCheckClient, FACT_CHECK_CLIENTS],
})
export class ClientsModule {}
