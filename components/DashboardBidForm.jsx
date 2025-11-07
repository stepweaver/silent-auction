'use client';

import { useState, useId } from 'react';
import { formatDollar } from '@/lib/money';

const STORAGE_KEY = 'auction_bidder_info';

export default function DashboardBidForm({ item, userAlias, email, onBidPlaced }) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const amountInputId = useId();
  const helperTextId = `${amountInputId}-helper`;
  const statusMessageId = `${amountInputId}-status`;
  const hasStatusMessage = Boolean(message);
  const isErrorMessage = hasStatusMessage && message.toLowerCase().includes('error');

  const currentHigh = Number(item.current_high_bid ?? item.start_price);
  const nextMin = currentHigh === Number(item.start_price)
    ? Number(item.start_price)
    : currentHigh + 1; // Fixed $1 increment

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
          } catch (error) {
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
          email,
          bidder_name: bidderName,
          amount: Number(amount),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMessage(text || 'Error placing bid');

        // If avatar is missing, redirect to landing page
        if (text && (text.includes('create an avatar') || text.includes('avatar must have a name'))) {
          setTimeout(() => {
            window.location.href = '/landing';
          }, 2000);
        }
        return;
      }

      setMessage('Bid placed successfully!');
      setAmount('');
      if (onBidPlaced) {
        onBidPlaced();
      }
    } catch (error) {
      setMessage('Error placing bid');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="form-control">
        <label className="label pb-1" htmlFor={amountInputId}>
          <span className="label-text text-xs font-semibold">Bid Amount</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50 font-semibold text-sm">$</span>
          <input
            id={amountInputId}
            type="number"
            step="0.01"
            min={nextMin}
            className="input input-bordered input-sm w-full pl-7 border-2 focus:border-primary focus:outline-none"
            placeholder={formatDollar(nextMin)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            disabled={isSubmitting}
            aria-describedby={[helperTextId, hasStatusMessage ? statusMessageId : null].filter(Boolean).join(' ') || undefined}
            aria-invalid={isErrorMessage}
          />
        </div>
        <label htmlFor={amountInputId} className="label pt-1">
          <span id={helperTextId} className="label-text-alt text-xs">
            Min: <span className="font-semibold text-primary">{formatDollar(nextMin)}</span>
          </span>
        </label>
      </div>

      {hasStatusMessage && (
        <div
          id={statusMessageId}
          role="status"
          aria-live="polite"
          className={`text-xs p-2 rounded border ${
            isErrorMessage
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-green-200 bg-green-50 text-green-700'
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-sm w-full text-white"
        disabled={isSubmitting || !userAlias}
        style={{ backgroundColor: 'var(--primary-500)', color: 'var(--primary-contrast)' }}
      >
        {isSubmitting ? (
          <>
            <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
            <span className="sr-only">Placing bid...</span>
            Placing...
          </>
        ) : (
          'Place Bid'
        )}
      </button>
    </form>
  );
}
