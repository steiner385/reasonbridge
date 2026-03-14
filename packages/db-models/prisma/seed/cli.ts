#!/usr/bin/env node
/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * CLI Entry Point for Enhanced Demo Seeding
 *
 * Usage:
 *   tsx prisma/seed/cli.ts [options]
 *
 * Options:
 *   --scale=small|medium|large  Scale profile (default: 'large')
 *   --generate                  Enable AI generation (default: false)
 *   --quiet                     Disable verbose output (default: false)
 */

import { PrismaClient } from '@prisma/client';
import { seedEnhancedDemo } from './enhanced-demo-seed.js';
import type { ScaleProfile } from './config/distribution.js';

interface CLIOptions {
  scale: ScaleProfile;
  useAI: boolean;
  verbose: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    scale: 'large',
    useAI: false,
    verbose: true,
  };

  for (const arg of args) {
    if (arg.startsWith('--scale=')) {
      const value = arg.slice('--scale='.length);
      if (value === 'small' || value === 'medium' || value === 'large') {
        options.scale = value;
      } else {
        console.error(`Invalid scale value: ${value}. Must be 'small', 'medium', or 'large'.`);
        process.exit(1);
      }
    } else if (arg === '--generate') {
      options.useAI = true;
    } else if (arg === '--quiet') {
      options.verbose = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Enhanced Demo Seed CLI

Usage:
  tsx prisma/seed/cli.ts [options]

Options:
  --scale=small|medium|large  Scale profile (default: 'large')
  --generate                  Enable AI generation (default: false)
  --quiet                     Disable verbose output (default: false)
  --help, -h                  Show this help message

Examples:
  tsx prisma/seed/cli.ts                     # Large scale, mock data, verbose
  tsx prisma/seed/cli.ts --scale=small       # Small scale, mock data, verbose
  tsx prisma/seed/cli.ts --generate          # Large scale, AI generation, verbose
  tsx prisma/seed/cli.ts --quiet --scale=medium  # Medium scale, mock data, quiet
`);
      process.exit(0);
    }
  }

  return options;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  const prisma = new PrismaClient();

  try {
    await seedEnhancedDemo(prisma, {
      scale: options.scale,
      useAI: options.useAI,
      verbose: options.verbose,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Enhanced demo seed failed:', error);
  process.exit(1);
});
