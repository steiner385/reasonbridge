/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Service for generating unique URL-friendly slugs from topic titles
 * Feature 016: Topic Management (T013)
 *
 * Generates slugs in the format: "topic-title-here-abc123"
 * Where abc123 is a short hash for uniqueness
 */
@Injectable()
export class SlugGeneratorService {
  private readonly logger = new Logger(SlugGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a URL-friendly slug from a title
   * T013: Convert title to lowercase, replace spaces with hyphens, remove special chars
   *
   * @param title - Topic title
   * @returns Base slug (not guaranteed unique)
   */
  private generateBaseSlug(title: string): string {
    return (
      title
        .toLowerCase()
        .trim()
        // Remove apostrophes and quotes
        .replace(/['"]/g, '')
        // Replace non-alphanumeric chars (except hyphens) with spaces
        .replace(/[^a-z0-9\s-]/g, ' ')
        // Replace multiple spaces/hyphens with single hyphen
        .replace(/[\s-]+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
        // Limit length to 200 chars
        .substring(0, 200)
    );
  }

  /**
   * Generate a short hash suffix for uniqueness
   * T013: Creates 6-character alphanumeric suffix
   *
   * @param input - Input string to hash
   * @returns 6-character hash
   */
  private generateHashSuffix(input: string): string {
    // Simple hash using character codes
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Convert to base36 (alphanumeric) and take 6 chars
    const base36 = Math.abs(hash).toString(36);
    return base36.substring(0, 6).padStart(6, '0');
  }

  /**
   * Check if a slug already exists in the database
   * T013: Verify uniqueness before returning
   *
   * @param slug - Slug to check
   * @returns True if slug exists, false otherwise
   */
  private async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.discussionTopic.count({
      where: { slug },
    });
    return count > 0;
  }

  /**
   * Generate a unique slug for a topic title
   * T013: Main entry point - guarantees uniqueness
   *
   * Algorithm:
   * 1. Generate base slug from title
   * 2. Add hash suffix for uniqueness
   * 3. Check if slug exists
   * 4. If exists, append timestamp-based suffix
   *
   * @param title - Topic title
   * @returns Unique URL-friendly slug
   */
  async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = this.generateBaseSlug(title);

    if (!baseSlug) {
      // Fallback if title produces empty slug
      this.logger.warn(`Title "${title}" produced empty base slug, using fallback`);
      return `topic-${this.generateHashSuffix(title + Date.now())}`;
    }

    // Generate initial slug with hash suffix
    const hashSuffix = this.generateHashSuffix(title + Date.now());
    let slug = `${baseSlug}-${hashSuffix}`;

    // Ensure slug is within length limit (250 chars from schema)
    if (slug.length > 250) {
      const maxBaseLength = 250 - hashSuffix.length - 1; // -1 for hyphen
      slug = `${baseSlug.substring(0, maxBaseLength)}-${hashSuffix}`;
    }

    // Check uniqueness
    if (!(await this.slugExists(slug))) {
      this.logger.debug(`Generated unique slug: ${slug}`);
      return slug;
    }

    // Collision detected - append timestamp-based suffix
    let attempt = 1;
    const maxAttempts = 10;

    while (attempt <= maxAttempts) {
      const timestamp = Date.now().toString(36);
      const fallbackSlug = `${baseSlug}-${timestamp}`;

      if (!(await this.slugExists(fallbackSlug))) {
        this.logger.log(`Generated unique slug after ${attempt} attempts: ${fallbackSlug}`);
        return fallbackSlug;
      }

      attempt++;
      // Small delay to ensure timestamp changes
      await new Promise((resolve) => setTimeout(resolve, 1));
    }

    // Ultimate fallback: UUID-based slug
    const uuid = Math.random().toString(36).substring(2, 10);
    const ultimateFallback = `${baseSlug.substring(0, 100)}-${uuid}`;

    this.logger.warn(
      `Used fallback UUID-based slug after ${maxAttempts} attempts: ${ultimateFallback}`,
    );

    return ultimateFallback;
  }

  /**
   * Regenerate slug for an existing topic (e.g., after title change)
   * T013: Update slug while preserving topic ID
   *
   * @param topicId - Existing topic ID
   * @param newTitle - New topic title
   * @returns New unique slug
   */
  async regenerateSlug(topicId: string, newTitle: string): Promise<string> {
    const newSlug = await this.generateUniqueSlug(newTitle);

    try {
      await this.prisma.discussionTopic.update({
        where: { id: topicId },
        data: { slug: newSlug },
      });

      this.logger.log(`Regenerated slug for topic ${topicId}: ${newSlug}`);
      return newSlug;
    } catch (error) {
      this.logger.error(`Failed to regenerate slug: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate a custom slug (for advanced users/moderators)
   * T013: Check if a user-provided slug is acceptable
   *
   * @param slug - User-provided slug
   * @returns Validation result with error message if invalid
   */
  async validateCustomSlug(slug: string): Promise<{ valid: boolean; error?: string }> {
    // Check format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        valid: false,
        error: 'Slug must contain only lowercase letters, numbers, and hyphens',
      };
    }

    // Check length
    if (slug.length < 3 || slug.length > 250) {
      return {
        valid: false,
        error: 'Slug must be between 3 and 250 characters',
      };
    }

    // Check for leading/trailing hyphens
    if (slug.startsWith('-') || slug.endsWith('-')) {
      return {
        valid: false,
        error: 'Slug cannot start or end with a hyphen',
      };
    }

    // Check uniqueness
    if (await this.slugExists(slug)) {
      return {
        valid: false,
        error: 'Slug already exists',
      };
    }

    return { valid: true };
  }
}
