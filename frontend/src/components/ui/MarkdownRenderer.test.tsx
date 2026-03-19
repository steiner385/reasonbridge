/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for MarkdownRenderer component
 *
 * Tests the markdown rendering functionality including:
 * - Basic markdown syntax (bold, italic, links)
 * - Code blocks and inline code
 * - Lists (ordered and unordered)
 * - Blockquotes
 * - XSS prevention and sanitization
 * - GFM features (tables, strikethrough)
 * - Truncation
 * - Custom components
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import MarkdownRenderer from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  describe('basic rendering', () => {
    it('should render plain text content', () => {
      render(<MarkdownRenderer content="Hello, world!" />);

      expect(screen.getByText('Hello, world!')).toBeInTheDocument();
    });

    it('should have the correct test id', () => {
      render(<MarkdownRenderer content="Test content" />);

      expect(screen.getByTestId('markdown-renderer')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(<MarkdownRenderer content="Test" className="my-custom-class" />);

      const container = screen.getByTestId('markdown-renderer');
      expect(container.className).toContain('my-custom-class');
    });
  });

  describe('text formatting', () => {
    it('should render bold text with **', () => {
      render(<MarkdownRenderer content="This is **bold** text" />);

      const strong = screen.getByText('bold');
      expect(strong.tagName).toBe('STRONG');
    });

    it('should render bold text with __', () => {
      render(<MarkdownRenderer content="This is __bold__ text" />);

      const strong = screen.getByText('bold');
      expect(strong.tagName).toBe('STRONG');
    });

    it('should render italic text with *', () => {
      render(<MarkdownRenderer content="This is *italic* text" />);

      const em = screen.getByText('italic');
      expect(em.tagName).toBe('EM');
    });

    it('should render italic text with _', () => {
      render(<MarkdownRenderer content="This is _italic_ text" />);

      const em = screen.getByText('italic');
      expect(em.tagName).toBe('EM');
    });

    it('should render strikethrough text (GFM)', () => {
      render(<MarkdownRenderer content="This is ~~deleted~~ text" />);

      const del = screen.getByText('deleted');
      expect(del.tagName).toBe('DEL');
      expect(del.className).toContain('line-through');
    });
  });

  describe('links', () => {
    it('should render links with correct href', () => {
      render(<MarkdownRenderer content="Visit [Example](https://example.com)" />);

      const link = screen.getByRole('link', { name: 'Example' });
      expect(link).toHaveAttribute('href', 'https://example.com');
    });

    it('should open links in new tab', () => {
      render(<MarkdownRenderer content="[Link](https://example.com)" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('target', '_blank');
    });

    it('should have security attributes on links', () => {
      render(<MarkdownRenderer content="[Link](https://example.com)" />);

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render autolinks', () => {
      render(<MarkdownRenderer content="Visit https://example.com" />);

      const link = screen.getByRole('link', { name: 'https://example.com' });
      expect(link).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('code', () => {
    it('should render inline code', () => {
      render(<MarkdownRenderer content="Use `const x = 1` in your code" />);

      const code = screen.getByText('const x = 1');
      expect(code.tagName).toBe('CODE');
      expect(code.className).toContain('font-mono');
    });

    it('should render code blocks', () => {
      const codeBlock = '```\nconst x = 1;\nconst y = 2;\n```';
      render(<MarkdownRenderer content={codeBlock} />);

      const pre = screen.getByText(/const x = 1/);
      expect(pre.closest('pre')).toBeInTheDocument();
    });

    it('should apply styling to inline code', () => {
      render(<MarkdownRenderer content="Use `code` here" />);

      const code = screen.getByText('code');
      expect(code.className).toContain('bg-gray-100');
      expect(code.className).toContain('rounded');
    });
  });

  describe('lists', () => {
    it('should render unordered lists', () => {
      const markdown = '- Item 1\n- Item 2\n- Item 3';
      render(<MarkdownRenderer content={markdown} />);

      const list = screen.getByRole('list');
      expect(list.tagName).toBe('UL');
      expect(list.className).toContain('list-disc');

      const items = within(list).getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });

    it('should render ordered lists', () => {
      const markdown = '1. First\n2. Second\n3. Third';
      render(<MarkdownRenderer content={markdown} />);

      const list = screen.getByRole('list');
      expect(list.tagName).toBe('OL');
      expect(list.className).toContain('list-decimal');
    });

    it('should render nested lists', () => {
      const markdown = '- Item 1\n  - Nested item\n- Item 2';
      render(<MarkdownRenderer content={markdown} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Nested item')).toBeInTheDocument();
    });
  });

  describe('blockquotes', () => {
    it('should render blockquotes', () => {
      render(<MarkdownRenderer content="> This is a quote" />);

      const blockquote = screen.getByText('This is a quote');
      expect(blockquote.closest('blockquote')).toBeInTheDocument();
    });

    it('should style blockquotes with left border', () => {
      render(<MarkdownRenderer content="> Quote text" />);

      const blockquote = screen.getByText('Quote text').closest('blockquote');
      expect(blockquote?.className).toContain('border-l-4');
      expect(blockquote?.className).toContain('italic');
    });
  });

  describe('headings', () => {
    it('should render h1', () => {
      render(<MarkdownRenderer content="# Heading 1" />);

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Heading 1');
    });

    it('should render h2', () => {
      render(<MarkdownRenderer content="## Heading 2" />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Heading 2');
    });

    it('should render h3', () => {
      render(<MarkdownRenderer content="### Heading 3" />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Heading 3');
    });
  });

  describe('tables (GFM)', () => {
    it('should render tables', () => {
      const markdown = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
`;
      render(<MarkdownRenderer content={markdown} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should render table headers', () => {
      const markdown = `
| Name | Age |
|------|-----|
| John | 25  |
`;
      render(<MarkdownRenderer content={markdown} />);

      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: 'Age' })).toBeInTheDocument();
    });

    it('should render table cells', () => {
      const markdown = `
| Name | Age |
|------|-----|
| John | 25  |
`;
      render(<MarkdownRenderer content={markdown} />);

      expect(screen.getByRole('cell', { name: 'John' })).toBeInTheDocument();
      expect(screen.getByRole('cell', { name: '25' })).toBeInTheDocument();
    });
  });

  describe('horizontal rules', () => {
    it('should render horizontal rules', () => {
      const markdown = `Above

---

Below`;
      render(<MarkdownRenderer content={markdown} />);

      const hr = screen.getByRole('separator');
      expect(hr).toBeInTheDocument();
    });
  });

  describe('XSS prevention', () => {
    it('should sanitize script tags', () => {
      render(<MarkdownRenderer content="<script>alert('xss')</script>" />);

      expect(screen.queryByText("alert('xss')")).not.toBeInTheDocument();
      const container = screen.getByTestId('markdown-renderer');
      expect(container.innerHTML).not.toContain('<script>');
    });

    it('should sanitize onclick attributes', () => {
      render(<MarkdownRenderer content='<div onclick="alert(1)">Click me</div>' />);

      const container = screen.getByTestId('markdown-renderer');
      expect(container.innerHTML).not.toContain('onclick');
    });

    it('should sanitize javascript: URLs', () => {
      render(<MarkdownRenderer content="[Evil](javascript:alert(1))" />);

      // The link should not have javascript: protocol
      const link = screen.queryByRole('link', { name: 'Evil' });
      if (link) {
        expect(link.getAttribute('href')).not.toContain('javascript:');
      }
    });

    it('should sanitize img onerror', () => {
      render(<MarkdownRenderer content='<img src="x" onerror="alert(1)">' />);

      const container = screen.getByTestId('markdown-renderer');
      expect(container.innerHTML).not.toContain('onerror');
    });

    it('should strip all HTML tags when allowHtml is false', () => {
      render(<MarkdownRenderer content="<div><b>Bold</b> text</div>" allowHtml={false} />);

      const container = screen.getByTestId('markdown-renderer');
      expect(container.innerHTML).not.toContain('<div>');
      expect(container.innerHTML).not.toContain('<b>');
    });
  });

  describe('truncation', () => {
    it('should truncate content when maxLength is provided', () => {
      const longContent = 'A'.repeat(200);
      render(<MarkdownRenderer content={longContent} maxLength={50} />);

      const container = screen.getByTestId('markdown-renderer');
      // Should show 50 chars + ellipsis
      expect(container.textContent?.length).toBeLessThan(200);
      expect(container.textContent).toContain('...');
    });

    it('should not truncate content shorter than maxLength', () => {
      const shortContent = 'Short text';
      render(<MarkdownRenderer content={shortContent} maxLength={100} />);

      expect(screen.getByText('Short text')).toBeInTheDocument();
      const container = screen.getByTestId('markdown-renderer');
      expect(container.textContent).not.toContain('...');
    });

    it('should not add ellipsis when content equals maxLength', () => {
      const content = 'A'.repeat(50);
      render(<MarkdownRenderer content={content} maxLength={50} />);

      const container = screen.getByTestId('markdown-renderer');
      expect(container.textContent).not.toContain('...');
    });
  });

  describe('custom components', () => {
    it('should allow custom link component', () => {
      const customComponents = {
        a: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
          <a data-custom="true" {...props}>
            {children}
          </a>
        ),
      };

      render(
        <MarkdownRenderer
          content="[Custom Link](https://example.com)"
          components={customComponents}
        />,
      );

      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('data-custom', 'true');
    });

    it('should merge custom components with defaults', () => {
      const customComponents = {
        strong: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
          <strong data-custom="bold" {...props}>
            {children}
          </strong>
        ),
      };

      render(<MarkdownRenderer content="**Bold** and *italic*" components={customComponents} />);

      // Custom strong should be used
      const strong = screen.getByText('Bold');
      expect(strong).toHaveAttribute('data-custom', 'bold');

      // Default em should still work
      const em = screen.getByText('italic');
      expect(em.tagName).toBe('EM');
    });
  });

  describe('dark mode compatibility', () => {
    it('should have dark mode classes on container', () => {
      render(<MarkdownRenderer content="Test" />);

      const container = screen.getByTestId('markdown-renderer');
      expect(container.className).toContain('dark:text-gray-200');
    });

    it('should have dark mode classes on code', () => {
      render(<MarkdownRenderer content="`code`" />);

      const code = screen.getByText('code');
      expect(code.className).toContain('dark:bg-gray-800');
    });

    it('should have dark mode classes on blockquotes', () => {
      render(<MarkdownRenderer content="> Quote" />);

      const blockquote = screen.getByText('Quote').closest('blockquote');
      expect(blockquote?.className).toContain('dark:border-gray-600');
    });
  });

  describe('complex content', () => {
    it('should render mixed markdown content', () => {
      const complexContent = `
# Title

This is a **bold** and *italic* paragraph with a [link](https://example.com).

- List item 1
- List item 2

> A blockquote

\`\`\`
code block
\`\`\`
`;
      render(<MarkdownRenderer content={complexContent} />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title');
      expect(screen.getByText('bold')).toBeInTheDocument();
      expect(screen.getByText('italic')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'link' })).toBeInTheDocument();
      expect(screen.getByText('List item 1')).toBeInTheDocument();
      expect(screen.getByText('A blockquote')).toBeInTheDocument();
      expect(screen.getByText('code block')).toBeInTheDocument();
    });

    it('should handle multiline content', () => {
      const content = 'Line 1\n\nLine 2\n\nLine 3';
      render(<MarkdownRenderer content={content} />);

      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });

    it('should handle empty content', () => {
      render(<MarkdownRenderer content="" />);

      const container = screen.getByTestId('markdown-renderer');
      expect(container).toBeInTheDocument();
    });
  });
});
