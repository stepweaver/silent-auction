/**
 * Auction feature - re-exports closeAuction for feature-based imports.
 * Settings and open/close logic live in lib/closeAuction.js.
 */
export { closeAuction, sendClosingEmailsOnly } from '@/lib/closeAuction';
