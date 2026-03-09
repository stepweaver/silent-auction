/**
 * Bid validation rules. Pure functions for testability.
 */

const MIN_INCREMENT = 5;

/**
 * Compute minimum allowed bid for an item.
 * @param {number} currentHigh - Current high bid amount (or null if no bids)
 * @param {number} startPrice - Item start price
 * @returns {number} Minimum allowed bid
 */
export function getMinimumBid(currentHigh, startPrice) {
  const current = currentHigh != null ? Number(currentHigh) : Number(startPrice);
  return current + MIN_INCREMENT;
}

/**
 * Validate bid amount against rules.
 * @param {number} amount - Bid amount
 * @param {number} minimumBid - Minimum allowed bid
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBidAmount(amount, minimumBid) {
  const bidAmount = Number(amount);
  const cents = Math.round(bidAmount * 100);

  if (!Number.isFinite(bidAmount) || cents <= 0) {
    return { valid: false, error: 'Invalid bid amount' };
  }

  if (bidAmount < minimumBid) {
    return { valid: false, error: `Minimum allowed bid: ${minimumBid.toFixed(2)}` };
  }

  if (cents % 500 !== 0) {
    return { valid: false, error: 'Bids must be in $5 increments (e.g., $5, $10, $15).' };
  }

  return { valid: true };
}

/**
 * Get next minimum bid after a successful bid.
 * @param {number} bidAmount - The bid that was placed
 * @returns {number}
 */
export function getNextMinAfterBid(bidAmount) {
  return Number(bidAmount) + MIN_INCREMENT;
}

/**
 * Check if bidding is allowed based on auction state.
 * @param {object} settings - Auction settings
 * @param {object} item - Item
 * @param {Date} now - Current time
 * @returns {{ allowed: boolean, error?: string }}
 */
export function checkBiddingAllowed(settings, item, now = new Date()) {
  if (settings?.auction_closed) {
    return { allowed: false, error: 'Bidding closed - auction is manually closed' };
  }

  const auctionStart = settings?.auction_start ? new Date(settings.auction_start) : null;
  if (auctionStart && now < auctionStart) {
    const formatted = auctionStart.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    return { allowed: false, error: `Bidding not yet open. Auction opens ${formatted}.` };
  }

  const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;
  if (deadline && now >= deadline) {
    return { allowed: false, error: 'Bidding closed - deadline passed' };
  }

  if (item?.is_closed) {
    return { allowed: false, error: 'Bidding closed - item is closed' };
  }

  return { allowed: true };
}
