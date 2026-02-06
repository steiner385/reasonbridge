/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

export interface TypographyProps {
  /**
   * Content to render with typography styling
   */
  children: ReactNode;

  /**
   * Variant of typography styling
   */
  variant?: 'article' | 'comment' | 'description';

  /**
   * Whether to apply reading width constraint
   */
  constrainWidth?: boolean;

  /**
   * Custom CSS class name
   */
  className?: string;
}

/**
 * Typography - Rich text content wrapper with optimized readability
 *
 * Features:
 * - Multiple variants for different content types
 * - Optimal line length (reading width)
 * - Proper heading hierarchy
 * - Enhanced line heights
 * - Dark mode support
 * - Link styling
 * - List styling
 * - Code block styling
 *
 * @example
 * // Article content
 * <Typography variant="article">
 *   <h2>Article Title</h2>
 *   <p>Article content...</p>
 * </Typography>
 *
 * @example
 * // Comment content
 * <Typography variant="comment">
 *   <p>User comment...</p>
 * </Typography>
 */
function Typography({
  children,
  variant = 'article',
  constrainWidth = true,
  className = '',
}: TypographyProps) {
  // Base typography classes
  const baseClasses = `
    text-gray-700 dark:text-gray-300
    ${constrainWidth ? 'prose-reading-width' : ''}
  `;

  // Variant-specific classes
  const variantClasses = {
    article: `
      prose prose-lg
      prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-gray-100
      prose-h1:text-3xl prose-h1:mb-4 prose-h1:leading-tight
      prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-8 prose-h2:leading-tight
      prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-6
      prose-p:mb-4 prose-p:leading-relaxed
      prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-semibold
      prose-code:text-primary-700 dark:prose-code:text-primary-300 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
      prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100
      prose-ul:mb-4 prose-ul:list-disc prose-ul:pl-6
      prose-ol:mb-4 prose-ol:list-decimal prose-ol:pl-6
      prose-li:mb-2
      prose-blockquote:border-l-4 prose-blockquote:border-primary-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
    `,
    comment: `
      prose prose-sm
      prose-p:mb-2 prose-p:leading-relaxed
      prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-medium
      prose-code:text-primary-700 dark:prose-code:text-primary-300 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
    `,
    description: `
      prose
      prose-p:mb-3 prose-p:leading-relaxed
      prose-a:text-primary-600 dark:prose-a:text-primary-400 prose-a:no-underline hover:prose-a:underline
      prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-strong:font-medium
      prose-ul:mb-3 prose-ul:list-disc prose-ul:pl-5
      prose-ol:mb-3 prose-ol:list-decimal prose-ol:pl-5
      prose-li:mb-1
    `,
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`.trim()}>
      {children}
    </div>
  );
}

export default Typography;
