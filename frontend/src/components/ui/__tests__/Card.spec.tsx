/**
 * Unit tests for Card component and sub-components
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import Card, { CardHeader, CardBody, CardFooter } from '../Card';

describe('Card', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(<Card data-testid="card">Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>();
      render(<Card ref={ref}>Content</Card>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should pass through additional HTML attributes', () => {
      render(
        <Card data-testid="custom-card" aria-label="Card label">
          Content
        </Card>,
      );
      expect(screen.getByTestId('custom-card')).toBeInTheDocument();
      expect(screen.getByLabelText('Card label')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply default variant styles by default', () => {
      render(<Card data-testid="card">Default</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-white', 'border', 'border-gray-200');
    });

    it('should apply outlined variant styles', () => {
      render(
        <Card variant="outlined" data-testid="card">
          Outlined
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('border-2', 'border-gray-300');
    });

    it('should apply elevated variant styles', () => {
      render(
        <Card variant="elevated" data-testid="card">
          Elevated
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('shadow-lg');
    });

    it('should apply ghost variant styles', () => {
      render(
        <Card variant="ghost" data-testid="card">
          Ghost
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('bg-gray-50');
    });
  });

  describe('Padding', () => {
    it('should apply medium padding by default', () => {
      render(<Card data-testid="card">Medium</Card>);
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('p-6');
    });

    it('should apply no padding when padding="none"', () => {
      render(
        <Card padding="none" data-testid="card">
          No padding
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('p-3', 'p-6', 'p-8');
    });

    it('should apply small padding', () => {
      render(
        <Card padding="sm" data-testid="card">
          Small
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('p-3');
    });

    it('should apply large padding', () => {
      render(
        <Card padding="lg" data-testid="card">
          Large
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('p-8');
    });
  });

  describe('Hoverable', () => {
    it('should not have hover styles by default', () => {
      render(<Card data-testid="card">Not hoverable</Card>);
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('hover:shadow-xl');
    });

    it('should apply hover styles when hoverable is true', () => {
      render(
        <Card hoverable data-testid="card">
          Hoverable
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass(
        'hover:shadow-xl',
        'hover:border-primary-200',
        'hover:-translate-y-0.5',
      );
    });
  });

  describe('Clickable', () => {
    it('should not have cursor pointer by default', () => {
      render(<Card data-testid="card">Not clickable</Card>);
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('cursor-pointer');
    });

    it('should apply cursor pointer when clickable is true', () => {
      render(
        <Card clickable data-testid="card">
          Clickable
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('Full Width', () => {
    it('should not be full width by default', () => {
      render(<Card data-testid="card">Not full</Card>);
      const card = screen.getByTestId('card');
      expect(card).not.toHaveClass('w-full');
    });

    it('should apply full width when fullWidth is true', () => {
      render(
        <Card fullWidth data-testid="card">
          Full width
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('w-full');
    });
  });

  describe('Custom className', () => {
    it('should merge custom className with default classes', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Custom
        </Card>,
      );
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-xl'); // Still has base class
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(Card.displayName).toBe('Card');
    });
  });
});

describe('CardHeader', () => {
  describe('Rendering', () => {
    it('should render title when provided', () => {
      render(<CardHeader title="Card Title" />);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should render subtitle when provided', () => {
      render(<CardHeader title="Title" subtitle="Subtitle text" />);
      expect(screen.getByText('Subtitle text')).toBeInTheDocument();
    });

    it('should render action when provided', () => {
      render(<CardHeader title="Title" action={<button>Action</button>} />);
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('should render children', () => {
      render(<CardHeader>Custom children</CardHeader>);
      expect(screen.getByText('Custom children')).toBeInTheDocument();
    });

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>();
      render(<CardHeader ref={ref} title="Title" />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Styling', () => {
    it('should apply title styles', () => {
      render(<CardHeader title="Styled Title" />);
      const title = screen.getByText('Styled Title');
      expect(title).toHaveClass('text-lg', 'font-semibold');
    });

    it('should apply subtitle styles', () => {
      render(<CardHeader title="Title" subtitle="Styled Subtitle" />);
      const subtitle = screen.getByText('Styled Subtitle');
      expect(subtitle).toHaveClass('text-sm', 'text-gray-500');
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(CardHeader.displayName).toBe('CardHeader');
    });
  });
});

describe('CardBody', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(<CardBody>Body content</CardBody>);
      expect(screen.getByText('Body content')).toBeInTheDocument();
    });

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>();
      render(<CardBody ref={ref}>Content</CardBody>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('should pass through additional HTML attributes', () => {
      render(<CardBody data-testid="card-body">Content</CardBody>);
      expect(screen.getByTestId('card-body')).toBeInTheDocument();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<CardBody className="custom-body-class">Content</CardBody>);
      expect(screen.getByText('Content')).toHaveClass('custom-body-class');
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(CardBody.displayName).toBe('CardBody');
    });
  });
});

describe('CardFooter', () => {
  describe('Rendering', () => {
    it('should render children', () => {
      render(<CardFooter>Footer content</CardFooter>);
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });

    it('should forward ref to div element', () => {
      const ref = createRef<HTMLDivElement>();
      render(<CardFooter ref={ref}>Content</CardFooter>);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Border', () => {
    it('should not have border by default', () => {
      render(<CardFooter>No border</CardFooter>);
      const footer = screen.getByText('No border');
      expect(footer).not.toHaveClass('border-t');
    });

    it('should have border when bordered is true', () => {
      render(<CardFooter bordered>With border</CardFooter>);
      const footer = screen.getByText('With border');
      expect(footer).toHaveClass('border-t', 'border-gray-200', 'pt-4');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<CardFooter className="custom-footer-class">Content</CardFooter>);
      expect(screen.getByText('Content')).toHaveClass('custom-footer-class');
    });
  });

  describe('Display Name', () => {
    it('should have correct display name', () => {
      expect(CardFooter.displayName).toBe('CardFooter');
    });
  });
});

describe('Card Composition', () => {
  it('should work with all sub-components together', () => {
    render(
      <Card>
        <CardHeader
          title="Full Card Example"
          subtitle="With all components"
          action={<button>Edit</button>}
        />
        <CardBody>
          <p>Main content goes here</p>
        </CardBody>
        <CardFooter bordered>
          <button>Cancel</button>
          <button>Save</button>
        </CardFooter>
      </Card>,
    );

    expect(screen.getByText('Full Card Example')).toBeInTheDocument();
    expect(screen.getByText('With all components')).toBeInTheDocument();
    expect(screen.getByText('Main content goes here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
