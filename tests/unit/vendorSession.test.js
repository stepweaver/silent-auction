import { describe, it, expect, vi } from 'vitest';

// Mock jwt before importing session
vi.mock('@/lib/jwt', () => ({
  verifyVendorSessionToken: (token) => {
    if (token === 'valid-token') {
      return { vendorAdminId: 'vendor-123', email: 'vendor@test.com' };
    }
    return null;
  },
}));

import {
  getVendorSessionFromCookieHeader,
  getVendorAdminIdFromSession,
} from '@/lib/auth/session';

describe('vendor session', () => {
  describe('getVendorSessionFromCookieHeader', () => {
    it('extracts token from cookie header', () => {
      expect(getVendorSessionFromCookieHeader('vendor_session=abc123')).toBe('abc123');
      expect(getVendorSessionFromCookieHeader('foo=bar; vendor_session=xyz; baz=qux')).toBe('xyz');
    });

    it('returns null when no cookie', () => {
      expect(getVendorSessionFromCookieHeader(null)).toBe(null);
      expect(getVendorSessionFromCookieHeader('')).toBe(null);
      expect(getVendorSessionFromCookieHeader('other=value')).toBe(null);
    });
  });

  describe('getVendorAdminIdFromSession', () => {
    it('returns vendorAdminId when token is valid', () => {
      expect(getVendorAdminIdFromSession('vendor_session=valid-token')).toBe('vendor-123');
    });

    it('returns null when token is invalid', () => {
      expect(getVendorAdminIdFromSession('vendor_session=invalid-token')).toBe(null);
    });

    it('returns null when no session cookie', () => {
      expect(getVendorAdminIdFromSession(null)).toBe(null);
      expect(getVendorAdminIdFromSession('other=value')).toBe(null);
    });
  });
});
