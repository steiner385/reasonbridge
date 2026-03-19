/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * MarkdownRenderer component for safely rendering user-generated markdown content.
 *
 * @remarks
 * **Features:**
 * - Renders common Markdown: bold, italic, links, lists, code blocks, blockquotes
 * - XSS protection via DOMPurify sanitization
 * - GitHub Flavored Markdown support (tables, strikethrough, task lists)
 * - Dark mode compatible styling
 * - Accessible link handling (opens in new tab with proper rel attributes)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <MarkdownRenderer content="**Bold** and *italic* text" />
 *
 * // With custom class
 * <MarkdownRenderer content={userContent} className="prose-sm" />
 * ```
 */

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import type { Components } from 'react-markdown';

export interface MarkdownRendererProps {
  /**
   * The markdown content to render
   */
  content: string;

  /**
   * Additional CSS classes to apply to the container
   */
  className?: string;

  /**
   * Whether to allow HTML tags in the markdown (default: false for security)
   */
  allowHtml?: boolean;

  /**
   * Maximum length to render before truncating (optional)
   */
  maxLength?: number;

  /**
   * Custom components to override default rendering
   */
  components?: Components;
}

/**
 * Sanitize content using DOMPurify to prevent XSS attacks
 */
function sanitizeContent(content: string): string {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [], // Strip all HTML tags, let react-markdown handle rendering
    ALLOWED_ATTR: [],
  });
}

/**
 * Default custom components for rendering markdown elements
 * with proper styling and accessibility
 */
const defaultComponents: Components = {
  // Links open in new tab with security attributes
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary-600 dark:text-primary-400 hover:underline"
      {...props}
    >
      {children}
    </a>
  ),

  // Code blocks with syntax styling
  code: ({ children, className, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },

  // Pre blocks for code blocks
  pre: ({ children, ...props }) => (
    <pre
      className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg overflow-x-auto text-sm font-mono"
      {...props}
    >
      {children}
    </pre>
  ),

  // Blockquotes with left border
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // Unordered lists
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside space-y-1 ml-2" {...props}>
      {children}
    </ul>
  ),

  // Ordered lists
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside space-y-1 ml-2" {...props}>
      {children}
    </ol>
  ),

  // List items
  li: ({ children, ...props }) => (
    <li className="text-gray-800 dark:text-gray-200" {...props}>
      {children}
    </li>
  ),

  // Paragraphs with proper spacing
  p: ({ children, ...props }) => (
    <p className="mb-2 last:mb-0" {...props}>
      {children}
    </p>
  ),

  // Strong (bold) text
  strong: ({ children, ...props }) => (
    <strong className="font-semibold" {...props}>
      {children}
    </strong>
  ),

  // Emphasis (italic) text
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),

  // Horizontal rules
  hr: (props) => <hr className="my-4 border-gray-200 dark:border-gray-700" {...props} />,

  // Headers (discouraged in responses but supported)
  h1: ({ children, ...props }) => (
    <h1 className="text-xl font-bold mb-2 text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-lg font-bold mb-2 text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-base font-bold mb-1 text-gray-900 dark:text-gray-100" {...props}>
      {children}
    </h3>
  ),

  // Tables (GFM)
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-2">
      <table
        className="min-w-full border-collapse border border-gray-200 dark:border-gray-700"
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-50 dark:bg-gray-800" {...props}>
      {children}
    </thead>
  ),
  th: ({ children, ...props }) => (
    <th
      className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-left font-semibold text-gray-900 dark:text-gray-100"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="border border-gray-200 dark:border-gray-700 px-3 py-2 text-gray-800 dark:text-gray-200"
      {...props}
    >
      {children}
    </td>
  ),

  // Strikethrough (GFM)
  del: ({ children, ...props }) => (
    <del className="line-through text-gray-500 dark:text-gray-400" {...props}>
      {children}
    </del>
  ),
};

/**
 * MarkdownRenderer renders user-generated markdown content safely.
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  allowHtml = false,
  maxLength,
  components: customComponents,
}) => {
  // Sanitize and optionally truncate content
  const processedContent = useMemo(() => {
    let processed = allowHtml ? content : sanitizeContent(content);

    if (maxLength && processed.length > maxLength) {
      processed = processed.slice(0, maxLength).trim() + '...';
    }

    return processed;
  }, [content, allowHtml, maxLength]);

  // Merge custom components with defaults
  const mergedComponents = useMemo(
    () => ({
      ...defaultComponents,
      ...customComponents,
    }),
    [customComponents],
  );

  return (
    <div
      className={`markdown-content text-gray-800 dark:text-gray-200 break-words ${className}`}
      data-testid="markdown-renderer"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mergedComponents}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
