/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';

/**
 * Configuration for document meta tags
 */
export interface DocumentMetaConfig {
  /** Page title (will be appended with " | ReasonBridge") */
  title?: string;
  /** Meta description (max 160 characters recommended) */
  description?: string;
  /** Keywords for SEO */
  keywords?: string[];
  /** Canonical URL for the page */
  canonical?: string;
  /** Open Graph type (default: 'website') */
  ogType?: 'website' | 'article' | 'profile';
  /** Open Graph image URL */
  ogImage?: string;
  /** Twitter card type */
  twitterCard?: 'summary' | 'summary_large_image';
}

const DEFAULT_TITLE = 'ReasonBridge - Rational Discussion Platform';
const DEFAULT_DESCRIPTION =
  'ReasonBridge: A rational discussion platform for structured debates, claim validation, and evidence-based dialogue.';

/**
 * Hook for managing document meta tags dynamically
 *
 * Updates document.title and meta tags when the component mounts,
 * and cleans up (restores defaults) when it unmounts.
 *
 * @param config - Meta tag configuration
 *
 * @example
 * // In a topic detail page
 * useDocumentMeta({
 *   title: topic.title,
 *   description: topic.description.substring(0, 160),
 *   keywords: topic.tags.map(t => t.name),
 *   ogType: 'article',
 * });
 */
export function useDocumentMeta(config: DocumentMetaConfig): void {
  useEffect(() => {
    // Store original values for cleanup
    const originalTitle = document.title;

    // Update title
    if (config.title) {
      document.title = `${config.title} | ReasonBridge`;
    }

    // Helper to update or create meta tag
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;

      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Update description
    if (config.description) {
      setMetaTag('description', config.description);
      setMetaTag('og:description', config.description, true);
      setMetaTag('twitter:description', config.description);
    }

    // Update keywords
    if (config.keywords?.length) {
      setMetaTag('keywords', config.keywords.join(', '));
    }

    // Update canonical URL
    if (config.canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', config.canonical);
    }

    // Update Open Graph tags
    if (config.ogType) {
      setMetaTag('og:type', config.ogType, true);
    }
    if (config.title) {
      setMetaTag('og:title', config.title, true);
      setMetaTag('twitter:title', config.title);
    }
    if (config.ogImage) {
      setMetaTag('og:image', config.ogImage, true);
      setMetaTag('twitter:image', config.ogImage);
    }

    // Update Twitter card
    if (config.twitterCard) {
      setMetaTag('twitter:card', config.twitterCard);
    }

    // Cleanup: restore defaults on unmount
    return () => {
      document.title = originalTitle || DEFAULT_TITLE;

      // Restore default meta tags
      setMetaTag('description', DEFAULT_DESCRIPTION);
      setMetaTag('og:description', DEFAULT_DESCRIPTION, true);
      setMetaTag('twitter:description', DEFAULT_DESCRIPTION);
      setMetaTag('og:title', DEFAULT_TITLE, true);
      setMetaTag('twitter:title', DEFAULT_TITLE);
      setMetaTag('og:type', 'website', true);
      setMetaTag('twitter:card', 'summary_large_image');

      // Remove canonical if it was added
      if (config.canonical) {
        const link = document.querySelector('link[rel="canonical"]');
        if (link) {
          link.remove();
        }
      }
    };
  }, [
    config.title,
    config.description,
    config.keywords,
    config.canonical,
    config.ogType,
    config.ogImage,
    config.twitterCard,
  ]);
}

export default useDocumentMeta;
