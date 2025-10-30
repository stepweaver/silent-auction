'use client';

import { useState } from 'react';
import { formatDollar } from '@/lib/money';

export default function BidForm({ slug, itemId, nextMin, deadline, onSubmit, message }) {
  const [form, setForm] = useState({
    bidder_name: '',
    email: '',
    amount: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({ slug, item_id: itemId, ...form, amount: Number(form.amount) });
      setForm({ bidder_name: '', email: '', amount: '' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-2">
      <input
        className="border rounded px-3 py-2 w-full text-base"
        placeholder="Your name"
        value={form.bidder_name}
        onChange={(e) => setForm((f) => ({ ...f, bidder_name: e.target.value }))}
        required
        disabled={isSubmitting}
      />
      <input
        type="email"
        className="border rounded px-3 py-2 w-full text-base"
        placeholder="Email (required for bid confirmation)"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        required
        disabled={isSubmitting}
      />
      <input
        type="number"
        step="0.01"
        min={nextMin}
        className="border rounded px-3 py-2 w-full text-base"
        placeholder={`Your bid (>= ${formatDollar(nextMin)})`}
        value={form.amount}
        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        required
        disabled={isSubmitting}
      />
      <button
        type="submit"
        className="rounded-xl px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Placing bid...' : 'Place bid'}
      </button>
      {message && (
        <p className={`text-sm mt-2 ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
      {deadline && (
        <p className="text-xs mt-2 opacity-70">
          Bidding closes: {new Date(deadline).toLocaleString()}
        </p>
      )}
    </form>
  );
}
