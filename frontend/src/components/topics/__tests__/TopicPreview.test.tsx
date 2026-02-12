/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unit tests for TopicPreview component
 * Feature 016: Topic Management - T232
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopicPreview } from '../TopicPreview';

const defaultProps = {
  title: 'Climate Change Policy',
  description: 'A discussion about effective climate change policies and their implementation.',
  tags: ['climate', 'policy', 'environment'],
  visibility: 'PUBLIC' as const,
  evidenceStandards: 'STANDARD' as const,
};

describe('TopicPreview', () => {
  describe('Rendering', () => {
    it('should render the component', () => {
      render(<TopicPreview {...defaultProps} />);
      expect(screen.getByTestId('topic-preview')).toBeInTheDocument();
    });

    it('should render title', () => {
      render(<TopicPreview {...defaultProps} />);
      expect(screen.getByTestId('topic-preview-title')).toHaveTextContent('Climate Change Policy');
    });

    it('should render description', () => {
      render(<TopicPreview {...defaultProps} />);
      expect(screen.getByTestId('topic-preview-description')).toHaveTextContent(
        'A discussion about effective climate change policies',
      );
    });

    it('should render tags', () => {
      render(<TopicPreview {...defaultProps} />);
      const tagsContainer = screen.getByTestId('topic-preview-tags');
      expect(tagsContainer).toHaveTextContent('#climate');
      expect(tagsContainer).toHaveTextContent('#policy');
      expect(tagsContainer).toHaveTextContent('#environment');
    });

    it('should render settings', () => {
      render(<TopicPreview {...defaultProps} />);
      const settings = screen.getByTestId('topic-preview-settings');
      expect(settings).toHaveTextContent('Public');
      expect(settings).toHaveTextContent('Standard evidence');
    });
  });

  describe('Empty State', () => {
    it('should render placeholder when title is empty', () => {
      render(<TopicPreview {...defaultProps} title="" />);
      expect(screen.getByTestId('topic-preview-title')).toHaveTextContent('No title');
    });

    it('should render placeholder when description is empty', () => {
      render(<TopicPreview {...defaultProps} description="" />);
      expect(screen.getByTestId('topic-preview-description')).toHaveTextContent('No description');
    });

    it('should render custom placeholders', () => {
      render(
        <TopicPreview
          {...defaultProps}
          title=""
          description=""
          titlePlaceholder="Enter a title"
          descriptionPlaceholder="Enter a description"
        />,
      );
      expect(screen.getByTestId('topic-preview-title')).toHaveTextContent('Enter a title');
      expect(screen.getByTestId('topic-preview-description')).toHaveTextContent(
        'Enter a description',
      );
    });

    it('should not render tags section when tags array is empty', () => {
      render(<TopicPreview {...defaultProps} tags={[]} />);
      expect(screen.queryByTestId('topic-preview-tags')).not.toBeInTheDocument();
    });
  });

  describe('Visibility Settings', () => {
    it('should display PUBLIC visibility', () => {
      render(<TopicPreview {...defaultProps} visibility="PUBLIC" />);
      expect(screen.getByTestId('topic-preview-settings')).toHaveTextContent('Public');
    });

    it('should display PRIVATE visibility', () => {
      render(<TopicPreview {...defaultProps} visibility="PRIVATE" />);
      expect(screen.getByTestId('topic-preview-settings')).toHaveTextContent('Private');
    });

    it('should display UNLISTED visibility', () => {
      render(<TopicPreview {...defaultProps} visibility="UNLISTED" />);
      expect(screen.getByTestId('topic-preview-settings')).toHaveTextContent('Unlisted');
    });
  });

  describe('Evidence Standards', () => {
    it('should display MINIMAL evidence', () => {
      render(<TopicPreview {...defaultProps} evidenceStandards="MINIMAL" />);
      expect(screen.getByTestId('topic-preview-settings')).toHaveTextContent('Minimal evidence');
    });

    it('should display STANDARD evidence', () => {
      render(<TopicPreview {...defaultProps} evidenceStandards="STANDARD" />);
      expect(screen.getByTestId('topic-preview-settings')).toHaveTextContent('Standard evidence');
    });

    it('should display RIGOROUS evidence', () => {
      render(<TopicPreview {...defaultProps} evidenceStandards="RIGOROUS" />);
      expect(screen.getByTestId('topic-preview-settings')).toHaveTextContent('Rigorous evidence');
    });
  });

  describe('Mature Content', () => {
    it('should not show mature content indicator by default', () => {
      render(<TopicPreview {...defaultProps} />);
      expect(screen.queryByText('Mature content')).not.toBeInTheDocument();
    });

    it('should show mature content indicator when true', () => {
      render(<TopicPreview {...defaultProps} isMatureContent={true} />);
      expect(screen.getByText('Mature content')).toBeInTheDocument();
    });

    it('should not show mature content indicator when false', () => {
      render(<TopicPreview {...defaultProps} isMatureContent={false} />);
      expect(screen.queryByText('Mature content')).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render card variant by default', () => {
      render(<TopicPreview {...defaultProps} />);
      const container = screen.getByTestId('topic-preview');
      expect(container.className).toContain('bg-white');
      expect(container.className).toContain('border');
      expect(container.className).toContain('rounded-lg');
    });

    it('should render flat variant without card styling', () => {
      render(<TopicPreview {...defaultProps} variant="flat" />);
      const container = screen.getByTestId('topic-preview');
      expect(container.className).not.toContain('bg-white');
      expect(container.className).not.toContain('border-gray-200');
    });
  });

  describe('Character Counts', () => {
    it('should not show character counts by default', () => {
      render(<TopicPreview {...defaultProps} />);
      expect(screen.queryByText('/200 characters')).not.toBeInTheDocument();
      expect(screen.queryByText('/5000 characters')).not.toBeInTheDocument();
    });

    it('should show character counts when enabled', () => {
      render(
        <TopicPreview
          {...defaultProps}
          title="Test Title"
          description="Test description"
          showCharacterCounts={true}
        />,
      );
      expect(screen.getByText('10/200 characters')).toBeInTheDocument();
      expect(screen.getByText('16/5000 characters')).toBeInTheDocument();
    });
  });

  describe('Custom ClassName', () => {
    it('should apply custom className', () => {
      render(<TopicPreview {...defaultProps} className="custom-class" />);
      expect(screen.getByTestId('topic-preview').className).toContain('custom-class');
    });
  });

  describe('Multiple Tags', () => {
    it('should render all tags', () => {
      const manyTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'];
      render(<TopicPreview {...defaultProps} tags={manyTags} />);

      manyTags.forEach((tag) => {
        expect(screen.getByText(`#${tag}`)).toBeInTheDocument();
      });
    });
  });

  describe('Long Content', () => {
    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(200);
      render(<TopicPreview {...defaultProps} title={longTitle} />);
      expect(screen.getByTestId('topic-preview-title')).toHaveTextContent(longTitle);
    });

    it('should handle very long description', () => {
      const longDescription = 'B'.repeat(5000);
      render(<TopicPreview {...defaultProps} description={longDescription} />);
      expect(screen.getByTestId('topic-preview-description')).toHaveTextContent(
        longDescription.slice(0, 100),
      );
    });

    it('should preserve whitespace in description', () => {
      const descriptionWithNewlines = 'First paragraph.\n\nSecond paragraph.';
      render(<TopicPreview {...defaultProps} description={descriptionWithNewlines} />);
      const descEl = screen.getByTestId('topic-preview-description');
      expect(descEl.className).toContain('whitespace-pre-wrap');
    });
  });
});
