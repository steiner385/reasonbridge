/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Password validation utility
 * Requirements: minimum 8 characters, mixed case, numbers, special characters
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

const VALIDATION_RULES = {
  minLength: {
    test: (password: string) => password.length >= MIN_LENGTH,
    message: `Password must be at least ${MIN_LENGTH} characters long`,
  },
  maxLength: {
    test: (password: string) => password.length <= MAX_LENGTH,
    message: `Password must be at most ${MAX_LENGTH} characters long`,
  },
  hasUpperCase: {
    test: (password: string) => /[A-Z]/.test(password),
    message: 'Password must contain at least one uppercase letter',
  },
  hasLowerCase: {
    test: (password: string) => /[a-z]/.test(password),
    message: 'Password must contain at least one lowercase letter',
  },
  hasNumber: {
    test: (password: string) => /\d/.test(password),
    message: 'Password must contain at least one number',
  },
  hasSpecialChar: {
    test: (password: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    message: 'Password must contain at least one special character',
  },
  noSpaces: {
    test: (password: string) => !/\s/.test(password),
    message: 'Password must not contain spaces',
  },
};

/**
 * Validates password strength according to platform requirements
 * @param password - The password to validate
 * @returns Validation result with errors and strength rating
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
      strength: 'weak',
    };
  }

  const errors: string[] = [];

  // Run all validation rules
  Object.values(VALIDATION_RULES).forEach((rule) => {
    if (!rule.test(password)) {
      errors.push(rule.message);
    }
  });

  const isValid = errors.length === 0;
  const strength = calculatePasswordStrength(password);

  return {
    isValid,
    errors,
    strength,
  };
}

/**
 * Calculates password strength based on multiple factors
 * @param password - The password to evaluate
 * @returns Strength rating: weak, medium, or strong
 */
function calculatePasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
  let score = 0;

  // Length bonus
  if (password.length >= 12) score += 2;
  else if (password.length >= 10) score += 1;

  // Character variety
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Multiple occurrences of character types
  const upperCount = (password.match(/[A-Z]/g) || []).length;
  const lowerCount = (password.match(/[a-z]/g) || []).length;
  const numberCount = (password.match(/\d/g) || []).length;
  const specialCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;

  if (upperCount >= 2) score += 0.5;
  if (lowerCount >= 2) score += 0.5;
  if (numberCount >= 2) score += 0.5;
  if (specialCount >= 2) score += 0.5;

  // Penalize common patterns
  if (/(.)\1{2,}/.test(password)) score -= 1; // Repeated characters (e.g., "aaa")
  if (/^(password|12345|qwerty|abc123)/i.test(password)) score -= 2; // Common passwords

  if (score >= 6) return 'strong';
  if (score >= 4) return 'medium';
  return 'weak';
}

/**
 * Checks if password meets minimum requirements (for quick validation)
 * @param password - The password to check
 * @returns True if password meets all requirements
 */
export function isPasswordValid(password: string): boolean {
  return validatePassword(password).isValid;
}

/**
 * Gets a human-readable message for password requirements
 * @returns String describing password requirements
 */
export function getPasswordRequirements(): string {
  return `Password must be ${MIN_LENGTH}-${MAX_LENGTH} characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character. Spaces are not allowed.`;
}
