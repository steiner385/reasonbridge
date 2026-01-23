import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Prisma Schema - OTP Fields', () => {
  const schemaPath = join(process.cwd(), 'packages/db-models/prisma/schema.prisma');

  it('should have otpCode field in VerificationRecord', () => {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    expect(schemaContent).toContain('otpCode');
  });

  it('should have otpExpiresAt field in VerificationRecord', () => {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    expect(schemaContent).toContain('otpExpiresAt');
  });

  it('should have otpAttempts field in VerificationRecord', () => {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    expect(schemaContent).toContain('otpAttempts');
  });

  it('should have phoneNumber field in VerificationRecord', () => {
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    expect(schemaContent).toContain('phoneNumber');
  });
});
