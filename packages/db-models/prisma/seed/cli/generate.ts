#!/usr/bin/env tsx
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CLI for generating seeding content.
 *
 * Usage:
 *   pnpm seed:generate          # Generate if cache invalid
 *   pnpm seed:generate --force  # Force regeneration
 */

import { GenerationOrchestrator } from '../generators/orchestrator.js';

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');

  console.log('🤖 LLM Seeding Content Generator');
  console.log('================================');
  console.log('');

  const orchestrator = new GenerationOrchestrator();

  try {
    const data = await orchestrator.getData({ forceRegenerate: force });

    console.log('');
    console.log('✅ Generation complete!');
    console.log('');
    console.log('Cache files written to: prisma/seed/cache/');
    console.log(`  • ${data.metadata.topicCount} topics`);
    console.log(`  • ${data.metadata.responseCount} responses`);
    console.log(`  • ${data.metadata.propositionCount} propositions`);
    console.log(`  • ${data.metadata.commonGroundCount} common ground analyses`);
    console.log(`  • ${data.metadata.bridgingCount} bridging suggestions`);
  } finally {
    orchestrator.destroy();
  }
}

main().catch((error) => {
  console.error('Generation failed:', error);
  process.exit(1);
});
