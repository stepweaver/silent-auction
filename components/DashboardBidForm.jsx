'use client';

import { useState } from 'react';
import { formatDollar } from '@/lib/money';

const STORAGE_KEY = 'auction_bidder_info';

export default function DashboardBidForm({ item, userAlias, email, onBidPlaced }) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const currentHigh = Number(item.current_high_bid ?? item.start_price);
  const nextMin = currentHigh + Number(item.min_increment);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    try {
      // Get name from alias object (from database), fallback to localStorage, then alias name
      let bidderName = userAlias?.name;
      if (!bidderName && typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            bidderName = parsed.bidder_name;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      bidderName = bidderName || userAlias?.alias || 'Anonymous';

      const res = await fetch('/api/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: item.id,
          slug: item.slug,
          email: email,
          bidder_name: bidderName,
          amount: Number(amount),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMessage(text || 'Error placing bid');
        return;
      }

      setMessage('Bid placed successfully!');
      setAmount('');
      if (onBidPlaced) {
        onBidPlaced();
      }
    } catch (err) {
      setMessage('Error placing bid');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="form-control">
        <label className="label pb-1">
          <span className="label-text text-xs font-semibold">Bid Amount</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 font-semibold text-sm">$</span>
          <input
            type="number"
            step="0.01"
            min={nextMin}
            className="input input-bordered input-sm w-full pl-7 border-2 focus:border-primary focus:outline-none"
            placeholder={formatDollar(nextMin)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            disabled={isSubmitting}
          />
        </div>
        <label className="label pt-1">
          <span className="label-text-alt text-xs">Min: <span className="font-semibold text-primary">{formatDollar(nextMin)}</span></span>
        </label>
      </div>
      {message && (
        <div className={`text-xs p-2 rounded ${message.includes('Error') || message.includes('Error') ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
          {message}
        </div>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-sm w-full"
        disabled={isSubmitting || !userAlias}
      >
        {isSubmitting ? (
          <>
            <span className="loading loading-spinner loading-xs"></span>
            Placing...
          </>
        ) : (
          'Place Bid'
        )}
      </button>
    </form>
  );
}

