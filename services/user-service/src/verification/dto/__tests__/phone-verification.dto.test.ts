import { describe, it, expect } from 'vitest';
import { validate } from 'class-validator';
import { PhoneVerificationRequestDto, PhoneVerificationVerifyDto } from '../phone-verification.dto';

describe('PhoneVerificationRequestDto', () => {
  it('should pass validation for valid phone number', async () => {
    const dto = new PhoneVerificationRequestDto();
    dto.phoneNumber = '+14155552671';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should fail validation for empty phone number', async () => {
    const dto = new PhoneVerificationRequestDto();
    dto.phoneNumber = '';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('phoneNumber');
  });

  it('should fail validation for invalid phone format', async () => {
    const dto = new PhoneVerificationRequestDto();
    dto.phoneNumber = '123invalid';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('PhoneVerificationVerifyDto', () => {
  it('should pass validation for valid verification data', async () => {
    const dto = new PhoneVerificationVerifyDto();
    dto.verificationId = '550e8400-e29b-41d4-a716-446655440000';
    dto.code = '123456';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should fail validation for missing verificationId', async () => {
    const dto = new PhoneVerificationVerifyDto();
    dto.code = '123456';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('verificationId');
  });

  it('should fail validation for invalid code format', async () => {
    const dto = new PhoneVerificationVerifyDto();
    dto.verificationId = '550e8400-e29b-41d4-a716-446655440000';
    dto.code = '12'; // Too short

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('code');
  });

  it('should fail validation for non-numeric code', async () => {
    const dto = new PhoneVerificationVerifyDto();
    dto.verificationId = '550e8400-e29b-41d4-a716-446655440000';
    dto.code = 'abc123';

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
  });
});
