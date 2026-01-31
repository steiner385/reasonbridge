import { describe, it, expect } from 'vitest';
import { SHARED_CONSTANTS, getVersionInfo } from './index';

describe('Shared Utils', () => {
  describe('SHARED_CONSTANTS', () => {
    it('should define APP_NAME', () => {
      expect(SHARED_CONSTANTS.APP_NAME).toBe('ReasonBridge');
    });

    it('should define VERSION', () => {
      expect(SHARED_CONSTANTS.VERSION).toBe('0.1.0');
    });
  });

  describe('getVersionInfo()', () => {
    it('should return formatted version string', () => {
      const versionInfo = getVersionInfo();
      expect(versionInfo).toBe('ReasonBridge v0.1.0');
    });

    it('should include app name', () => {
      const versionInfo = getVersionInfo();
      expect(versionInfo).toContain(SHARED_CONSTANTS.APP_NAME);
    });

    it('should include version number', () => {
      const versionInfo = getVersionInfo();
      expect(versionInfo).toContain(SHARED_CONSTANTS.VERSION);
    });
  });
});
