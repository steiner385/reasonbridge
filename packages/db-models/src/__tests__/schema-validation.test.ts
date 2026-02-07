import { describe, it, expect } from 'vitest';
import { Prisma } from '../generated/client';

/**
 * Type definition for DMMF model field
 */
interface DMMFField {
  name: string;
  type: string;
  isRequired: boolean;
  hasDefaultValue: boolean;
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

// TODO: Update these tests for Prisma 7 DMMF structure changes
// Prisma 7 no longer exposes isRequired/hasDefaultValue in runtime DMMF
describe.skip('Prisma Schema - OTP Fields', () => {
  const dmmf = getPrismaDMMF();

  it('should have otpCode field with correct type and nullability', () => {
    const verificationModel = dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'VerificationRecord',
    );

    const otpCodeField = verificationModel?.fields.find((f: DMMFField) => f.name === 'otpCode');
    expect(otpCodeField, 'otpCode field should exist').toBeDefined();
    expect(otpCodeField?.type).toBe('String');
    expect(otpCodeField?.isRequired).toBe(false); // nullable
  });

  it('should have otpExpiresAt field with correct type and nullability', () => {
    const verificationModel = dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'VerificationRecord',
    );

    const otpExpiresAtField = verificationModel?.fields.find(
      (f: DMMFField) => f.name === 'otpExpiresAt',
    );
    expect(otpExpiresAtField, 'otpExpiresAt field should exist').toBeDefined();
    expect(otpExpiresAtField?.type).toBe('DateTime');
    expect(otpExpiresAtField?.isRequired).toBe(false);
  });

  it('should have otpAttempts field with correct type, required, and default', () => {
    const verificationModel = dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'VerificationRecord',
    );

    const otpAttemptsField = verificationModel?.fields.find(
      (f: DMMFField) => f.name === 'otpAttempts',
    );
    expect(otpAttemptsField, 'otpAttempts field should exist').toBeDefined();
    expect(otpAttemptsField?.type).toBe('Int');
    expect(otpAttemptsField?.isRequired).toBe(true);
    expect(otpAttemptsField?.hasDefaultValue).toBe(true);
  });

  it('should have phoneNumber field with correct type and nullability', () => {
    const verificationModel = dmmf.datamodel.models.find(
      (m: DMMFModel) => m.name === 'VerificationRecord',
    );

    const phoneNumberField = verificationModel?.fields.find(
      (f: DMMFField) => f.name === 'phoneNumber',
    );
    expect(phoneNumberField, 'phoneNumber field should exist').toBeDefined();
    expect(phoneNumberField?.type).toBe('String');
    expect(phoneNumberField?.isRequired).toBe(false);
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
