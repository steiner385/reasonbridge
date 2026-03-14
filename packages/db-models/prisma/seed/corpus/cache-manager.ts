/**
 * Corpus Cache Manager
 *
 * Provides caching layer for generated demo data to enable instant re-seeding
 * without AI regeneration. Manages JSON corpus files for users, topics,
 * discussions, responses, propositions, and alignments.
 *
 * @packageDocumentation
 * Copyright (c) 2026 ReasonBridge. All rights reserved.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = __dirname;

/**
 * Manifest describing the cached corpus data
 */
export interface CorpusManifest {
  version: string;
  generatedAt: string;
  scale: string;
  counts: {
    users: number;
    topics: number;
    discussions: number;
    responses: number;
    propositions: number;
    alignments: number;
  };
}

/**
 * Wrapper for corpus data with its manifest
 */
export interface CorpusData<T> {
  manifest: CorpusManifest;
  data: T;
}

/**
 * Save data to the corpus cache
 *
 * @param filename - Name of the JSON file to save (without path)
 * @param data - Data to cache
 * @param manifest - Manifest describing the corpus
 */
export function saveToCorpus<T>(filename: string, data: T, manifest: CorpusManifest): void {
  const filePath = path.join(CORPUS_DIR, filename);
  const corpusData: CorpusData<T> = { manifest, data };

  fs.writeFileSync(filePath, JSON.stringify(corpusData, null, 2), 'utf-8');
  console.log(`[Corpus] Saved ${filename} to corpus cache`);
}

/**
 * Load data from the corpus cache
 *
 * @param filename - Name of the JSON file to load (without path)
 * @returns Cached data with manifest, or null if file doesn't exist
 */
export function loadFromCorpus<T>(filename: string): CorpusData<T> | null {
  const filePath = path.join(CORPUS_DIR, filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as CorpusData<T>;
}

/**
 * Check if a valid corpus exists for the specified scale
 *
 * @param scale - Scale identifier to check (e.g., 'demo', 'full')
 * @returns true if valid corpus exists for the scale
 */
export function hasValidCorpus(scale: string): boolean {
  try {
    const manifestPath = path.join(CORPUS_DIR, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      return false;
    }

    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as CorpusManifest;

    return manifest.scale === scale;
  } catch {
    return false;
  }
}

/**
 * Save the corpus manifest
 *
 * @param manifest - Manifest to save
 */
export function saveManifest(manifest: CorpusManifest): void {
  const filePath = path.join(CORPUS_DIR, 'manifest.json');
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[Corpus] Saved manifest (scale: ${manifest.scale})`);
}

/**
 * Clear all cached corpus data
 */
export function clearCorpus(): void {
  const files = fs.readdirSync(CORPUS_DIR);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const filePath = path.join(CORPUS_DIR, file);
      fs.unlinkSync(filePath);
    }
  }

  console.log('[Corpus] Cleared all cached corpus data');
}

export default {
  saveToCorpus,
  loadFromCorpus,
  hasValidCorpus,
  saveManifest,
  clearCorpus,
};
