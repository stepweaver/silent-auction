import { describe, it, expect } from 'vitest';
import {
  getMinimumBid,
  validateBidAmount,
  getNextMinAfterBid,
  checkBiddingAllowed,
} from '@/features/bidding/bidRules';

describe('bidRules', () => {
  describe('getMinimumBid', () => {
    it('returns start price when no current high bid', () => {
      expect(getMinimumBid(null, 10)).toBe(15);
      expect(getMinimumBid(undefined, 25)).toBe(30);
    });

    it('returns current high + 5 when bids exist', () => {
      expect(getMinimumBid(50, 10)).toBe(55);
      expect(getMinimumBid(100, 10)).toBe(105);
    });
  });

  describe('validateBidAmount', () => {
    it('accepts valid $5 increment bids', () => {
      expect(validateBidAmount(15, 15)).toEqual({ valid: true });
      expect(validateBidAmount(55, 55)).toEqual({ valid: true });
      expect(validateBidAmount(100, 55)).toEqual({ valid: true });
    });

    it('rejects bid below minimum', () => {
      const r = validateBidAmount(50, 55);
      expect(r.valid).toBe(false);
      expect(r.error).toContain('Minimum allowed bid');
    });

    it('rejects non-$5 increments', () => {
      expect(validateBidAmount(17, 15).valid).toBe(false);
      expect(validateBidAmount(17, 15).error).toContain('$5 increments');
      expect(validateBidAmount(52, 50).valid).toBe(false);
    });

    it('rejects invalid amounts', () => {
      expect(validateBidAmount(0, 5).valid).toBe(false);
      expect(validateBidAmount(-5, 5).valid).toBe(false);
      expect(validateBidAmount(NaN, 5).valid).toBe(false);
    });
  });

  describe('getNextMinAfterBid', () => {
    it('returns bid amount + 5', () => {
      expect(getNextMinAfterBid(50)).toBe(55);
      expect(getNextMinAfterBid(100)).toBe(105);
    });
  });

  describe('checkBiddingAllowed', () => {
    it('allows when auction is open', () => {
      const settings = { auction_closed: false, auction_deadline: new Date(Date.now() + 3600000).toISOString() };
      const item = { is_closed: false };
      expect(checkBiddingAllowed(settings, item).allowed).toBe(true);
    });

    it('rejects when auction is manually closed', () => {
      const settings = { auction_closed: true };
      const item = { is_closed: false };
      const r = checkBiddingAllowed(settings, item);
      expect(r.allowed).toBe(false);
      expect(r.error).toContain('manually closed');
    });

    it('rejects when item is closed', () => {
      const settings = { auction_closed: false };
      const item = { is_closed: true };
      const r = checkBiddingAllowed(settings, item);
      expect(r.allowed).toBe(false);
      expect(r.error).toContain('item is closed');
    });

    it('rejects when deadline passed', () => {
      const settings = { auction_closed: false, auction_deadline: new Date(Date.now() - 3600000).toISOString() };
      const item = { is_closed: false };
      const r = checkBiddingAllowed(settings, item);
      expect(r.allowed).toBe(false);
      expect(r.error).toContain('deadline passed');
    });

    it('rejects when auction not yet started', () => {
      const settings = {
        auction_closed: false,
        auction_start: new Date(Date.now() + 3600000).toISOString(),
      };
      const item = { is_closed: false };
      const r = checkBiddingAllowed(settings, item);
      expect(r.allowed).toBe(false);
      expect(r.error).toContain('not yet open');
    });
  });
});
