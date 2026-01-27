import { describe, it, expect, beforeAll } from 'vitest';
import { getDMMF } from '@prisma/internals';
import { resolve } from 'path';
import { readFileSync } from 'fs';

/**
 * Schema validation tests using Prisma DMMF.
 * In Prisma 7, direct access to Prisma.dmmf was removed.
 * We now use getDMMF from @prisma/internals as the recommended workaround.
 * See: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
 */

interface DMMFField {
  readonly name: string;
  readonly type: string;
  readonly isRequired: boolean;
  readonly hasDefaultValue: boolean;
}

interface DMMFModel {
  readonly name: string;
  readonly dbName: string | null;
  readonly fields: readonly DMMFField[];
}

interface DMMF {
  readonly datamodel: {
    readonly models: readonly DMMFModel[];
  };
}

let dmmf: DMMF;

beforeAll(async () => {
  const schemaPath = resolve(__dirname, '../../prisma/schema.prisma');
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  dmmf = await getDMMF({ datamodel: schemaContent });
});

describe('Prisma Schema - OTP Fields', () => {
  it('should have otpCode field with correct type and nullability', () => {
    const verificationModel = dmmf.datamodel.models.find((m) => m.name === 'VerificationRecord');

    const otpCodeField = verificationModel?.fields.find((f) => f.name === 'otpCode');
    expect(otpCodeField, 'otpCode field should exist').toBeDefined();
    expect(otpCodeField?.type).toBe('String');
    expect(otpCodeField?.isRequired).toBe(false); // nullable
  });

  it('should have otpExpiresAt field with correct type and nullability', () => {
    const verificationModel = dmmf.datamodel.models.find((m) => m.name === 'VerificationRecord');

    const otpExpiresAtField = verificationModel?.fields.find((f) => f.name === 'otpExpiresAt');
    expect(otpExpiresAtField, 'otpExpiresAt field should exist').toBeDefined();
    expect(otpExpiresAtField?.type).toBe('DateTime');
    expect(otpExpiresAtField?.isRequired).toBe(false);
  });

  it('should have otpAttempts field with correct type, required, and default', () => {
    const verificationModel = dmmf.datamodel.models.find((m) => m.name === 'VerificationRecord');

    const otpAttemptsField = verificationModel?.fields.find((f) => f.name === 'otpAttempts');
    expect(otpAttemptsField, 'otpAttempts field should exist').toBeDefined();
    expect(otpAttemptsField?.type).toBe('Int');
    expect(otpAttemptsField?.isRequired).toBe(true);
    expect(otpAttemptsField?.hasDefaultValue).toBe(true);
  });

  it('should have phoneNumber field with correct type and nullability', () => {
    const verificationModel = dmmf.datamodel.models.find((m) => m.name === 'VerificationRecord');

    const phoneNumberField = verificationModel?.fields.find((f) => f.name === 'phoneNumber');
    expect(phoneNumberField, 'phoneNumber field should exist').toBeDefined();
    expect(phoneNumberField?.type).toBe('String');
    expect(phoneNumberField?.isRequired).toBe(false);
  });

  it('should have phoneNumber field on VerificationRecord model', () => {
    const verificationModel = dmmf.datamodel.models.find((m) => m.name === 'VerificationRecord');

    // Verify the model exists and has phoneNumber field
    expect(verificationModel, 'VerificationRecord model should exist').toBeDefined();
    expect(verificationModel?.dbName).toBe('verification_records');

    const phoneNumberField = verificationModel?.fields.find((f) => f.name === 'phoneNumber');
    expect(phoneNumberField, 'phoneNumber field should exist in VerificationRecord').toBeDefined();
  });
});
