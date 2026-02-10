import { describe, it, expect } from 'vitest';
import { Prisma } from '@prisma/client';

/**
 * Type definition for DMMF model field (Prisma 7+)
 * Note: Prisma 7 simplified the runtime DMMF - isRequired/hasDefaultValue
 * are no longer exposed at runtime. We can verify field existence and type.
 */
interface DMMFField {
  name: string;
  kind: string;
  type: string;
  dbName: string | null;
}

/**
 * Type definition for DMMF model
 */
interface DMMFModel {
  name: string;
  dbName: string | null;
  fields: DMMFField[];
}

/**
 * Access Prisma DMMF (Data Model Meta Format) at runtime
 * This is a Prisma internal API used for schema introspection
 */
function getPrismaDMMF(): { datamodel: { models: DMMFModel[] } } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (Prisma as any).dmmf;
}

describe('Prisma Schema - OTP Fields', () => {
  const dmmf = getPrismaDMMF();

  it('should have otpCode field with correct type', () => {
    const verificationModel = dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'VerificationRecord',
    );

    const otpCodeField = verificationModel?.fields.find((f: DMMFField) => f.name === 'otpCode');
    expect(otpCodeField, 'otpCode field should exist').toBeDefined();
    expect(otpCodeField?.type).toBe('String');
    expect(otpCodeField?.kind).toBe('scalar');
    expect(otpCodeField?.dbName).toBe('otp_code');
  });

  it('should have otpExpiresAt field with correct type', () => {
    const verificationModel = dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'VerificationRecord',
    );

    const otpExpiresAtField = verificationModel?.fields.find(
      (f: DMMFField) => f.name === 'otpExpiresAt',
    );
    expect(otpExpiresAtField, 'otpExpiresAt field should exist').toBeDefined();
    expect(otpExpiresAtField?.type).toBe('DateTime');
    expect(otpExpiresAtField?.kind).toBe('scalar');
    expect(otpExpiresAtField?.dbName).toBe('otp_expires_at');
  });

  it('should have otpAttempts field with correct type', () => {
    const verificationModel = dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'VerificationRecord',
    );

    const otpAttemptsField = verificationModel?.fields.find(
      (f: DMMFField) => f.name === 'otpAttempts',
    );
    expect(otpAttemptsField, 'otpAttempts field should exist').toBeDefined();
    expect(otpAttemptsField?.type).toBe('Int');
    expect(otpAttemptsField?.kind).toBe('scalar');
    expect(otpAttemptsField?.dbName).toBe('otp_attempts');
  });

  it('should have phoneNumber field with correct type', () => {
    const verificationModel = dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'VerificationRecord',
    );

    const phoneNumberField = verificationModel?.fields.find(
      (f: DMMFField) => f.name === 'phoneNumber',
    );
    expect(phoneNumberField, 'phoneNumber field should exist').toBeDefined();
    expect(phoneNumberField?.type).toBe('String');
    expect(phoneNumberField?.kind).toBe('scalar');
    expect(phoneNumberField?.dbName).toBe('phone_number');
  });

  it('should have phoneNumber field on VerificationRecord model', () => {
    const verificationModel = dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'VerificationRecord',
    );

    // Verify the model exists and has phoneNumber field
    expect(verificationModel, 'VerificationRecord model should exist').toBeDefined();
    expect(verificationModel?.dbName).toBe('verification_records');

    const phoneNumberField = verificationModel?.fields.find(
      (f: DMMFField) => f.name === 'phoneNumber',
    );
    expect(phoneNumberField, 'phoneNumber field should exist in VerificationRecord').toBeDefined();
  });
});
