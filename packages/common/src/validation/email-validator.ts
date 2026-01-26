/**
 * Email validation utility
 * RFC 5322 compliant email validation
 */

// RFC 5322 compliant email regex (simplified but robust version)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Common disposable email domains to block
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'throwaway.email',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'maildrop.cc',
  'temp-mail.org',
]);

export interface EmailValidationResult {
  isValid: boolean;
  errors: string[];
  normalizedEmail?: string;
}

/**
 * Validates email format according to RFC 5322
 * @param email - The email address to validate
 * @param options - Validation options
 * @returns Validation result with errors and normalized email
 */
export function validateEmail(
  email: string,
  options: {
    allowDisposable?: boolean;
    requireDomain?: string[];
  } = {}
): EmailValidationResult {
  if (!email) {
    return {
      isValid: false,
      errors: ['Email is required'],
    };
  }

  const trimmedEmail = email.trim();
  const lowercaseEmail = trimmedEmail.toLowerCase();
  const errors: string[] = [];

  // Basic format validation
  if (!EMAIL_REGEX.test(lowercaseEmail)) {
    errors.push('Invalid email format');
    return {
      isValid: false,
      errors,
    };
  }

  // Length validation
  if (lowercaseEmail.length > 254) {
    errors.push('Email address is too long (max 254 characters)');
  }

  // Extract domain
  const domain = lowercaseEmail.split('@')[1];

  // Check for disposable email domains
  if (!options.allowDisposable && DISPOSABLE_DOMAINS.has(domain)) {
    errors.push('Disposable email addresses are not allowed');
  }

  // Require specific domain(s)
  if (options.requireDomain && options.requireDomain.length > 0) {
    const domainMatches = options.requireDomain.some((reqDomain) => domain === reqDomain.toLowerCase());
    if (!domainMatches) {
      errors.push(`Email must be from one of these domains: ${options.requireDomain.join(', ')}`);
    }
  }

  // Check for consecutive dots
  if (/\.\./.test(lowercaseEmail)) {
    errors.push('Email address contains consecutive dots');
  }

  // Check for leading/trailing dots in local part
  const localPart = lowercaseEmail.split('@')[0];
  if (localPart.startsWith('.') || localPart.endsWith('.')) {
    errors.push('Email local part cannot start or end with a dot');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    normalizedEmail: isValid ? lowercaseEmail : undefined,
  };
}

/**
 * Quick check if email is valid (for simple validation)
 * @param email - The email address to validate
 * @returns True if email is valid
 */
export function isEmailValid(email: string): boolean {
  return validateEmail(email).isValid;
}

/**
 * Normalizes an email address (lowercase, trimmed)
 * @param email - The email address to normalize
 * @returns Normalized email or null if invalid
 */
export function normalizeEmail(email: string): string | null {
  const result = validateEmail(email);
  return result.normalizedEmail || null;
}

/**
 * Checks if an email domain is disposable
 * @param email - The email address to check
 * @returns True if the domain is known to be disposable
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1];
  return DISPOSABLE_DOMAINS.has(domain);
}

/**
 * Extracts the domain from an email address
 * @param email - The email address
 * @returns The domain part or null if invalid
 */
export function getEmailDomain(email: string): string | null {
  if (!EMAIL_REGEX.test(email)) {
    return null;
  }
  return email.toLowerCase().split('@')[1];
}

/**
 * Masks an email address for display (e.g., j***@example.com)
 * @param email - The email address to mask
 * @returns Masked email address
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;

  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }

  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}
