import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Visual variant of the card
   */
  variant?: 'default' | 'outlined' | 'elevated' | 'ghost';

  /**
   * Padding size variant
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /**
   * Whether the card should be hoverable (adds hover effects)
   */
  hoverable?: boolean;

  /**
   * Whether the card should be clickable (adds cursor pointer)
   */
  clickable?: boolean;

  /**
   * Whether the card should take full width
   */
  fullWidth?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      hoverable = false,
      clickable = false,
      fullWidth = false,
      className = '',
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = 'rounded-xl transition-all';

    // Variant styles
    const variantStyles = {
      default: 'bg-white border border-gray-200',
      outlined: 'bg-white border-2 border-gray-300',
      elevated: 'bg-white shadow-lg',
      ghost: 'bg-gray-50 border border-transparent',
    };

    // Padding styles
    const paddingStyles = {
      none: '',
      sm: 'p-3',
      md: 'p-6',
      lg: 'p-8',
    };

    // Hover styles
    const hoverStyles = hoverable
      ? 'hover:shadow-xl hover:border-primary-200 hover:-translate-y-0.5'
      : '';

    // Clickable styles
    const clickableStyles = clickable ? 'cursor-pointer' : '';

    // Width styles
    const widthStyles = fullWidth ? 'w-full' : '';

    // Combined classes
    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${hoverStyles} ${clickableStyles} ${widthStyles} ${className}`;

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Sub-components for structured card layouts
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Title for the card header
   */
  title?: string;

  /**
   * Subtitle or description for the card header
   */
  subtitle?: string;

  /**
   * Action element to display in the header (e.g., button, menu)
   */
  action?: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ title, subtitle, action, children, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-start justify-between mb-4 ${className}`}
        {...props}
      >
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {children}
        </div>
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardBody = React.forwardRef<HTMLDivElement, CardBodyProps>(
  ({ children, className = '', ...props }, ref) => {
    return (
      <div ref={ref} className={`${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether to add a top border to the footer
   */
  bordered?: boolean;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, bordered = false, className = '', ...props }, ref) => {
    const borderStyles = bordered ? 'border-t border-gray-200 pt-4' : '';

    return (
      <div
        ref={ref}
        className={`mt-4 ${borderStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;
