'use client';

import { useEffect, useState, use } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import BidForm from '@/components/BidForm';
import { formatDollar } from '@/lib/money';

export default function ItemPage({ params }) {
  const s = supabaseBrowser();
  const { slug } = use(params);
  const [item, setItem] = useState(null);
  const [settings, setSettings] = useState(null);
  const [bids, setBids] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    try {
      const { data: itemData, error: itemError } = await s
        .from('item_leaders')
        .select('*')
        .eq('slug', slug)
        .single();

      if (itemError) throw itemError;
      if (!itemData) return;

      setItem(itemData);

      const { data: bidsData, error: bidsError } = await s
        .from('bids')
        .select('*')
        .eq('item_id', itemData.id)
        .order('amount', { ascending: false });

      if (bidsError) throw bidsError;
      setBids(bidsData || []);

      const { data: settingsData, error: settingsError } = await s
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (settingsError) throw settingsError;
      setSettings(settingsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setMsg('Error loading item data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!slug) return;
    loadAll();

    const channel = s
      .channel('rt-bids-item')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
        loadAll();
      })
      .subscribe();

    return () => {
      s.removeChannel(channel);
    };
  }, [slug]);

  async function handleBidSubmit(data) {
    setMsg('');
    try {
      const res = await fetch('/api/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(text || 'Error placing bid');
        return;
      }

      setMsg('Bid placed!');
      await loadAll();
    } catch (err) {
      setMsg('Error placing bid');
      console.error(err);
    }
  }

  function getInitials(name) {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('.') + '.';
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Loading item...</p>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Item not found.</p>
          <Link href="/" className="underline text-blue-600">
            ← Back to catalog
          </Link>
        </div>
      </main>
    );
  }

  const now = new Date();
  const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;
  const closed = item.is_closed || (deadline && now >= deadline);

  const current = Number(item.current_high_bid ?? item.start_price);
  const hasBids = Array.isArray(bids) && bids.length > 0;
  const nextMin = hasBids ? (current + Number(item.min_increment)) : Number(item.start_price);
  const winner = bids?.[0];

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-6">
      <Link href="/" className="underline text-blue-600 hover:no-underline">
        ← All items
      </Link>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          {item.photo_url && (
            <img src={item.photo_url} alt="" className="w-full rounded-xl" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          {item.description && <p className="mt-2">{item.description}</p>}

          {!closed ? (
            <>
              <p className="mt-3">
                Current: <span className="font-semibold">{formatDollar(current)}</span> • Next
                minimum: <b className="text-blue-600">{formatDollar(nextMin)}</b>
                {!hasBids ? (
                  <span className="text-xs text-gray-500"> (first bid)</span>
                ) : null}
              </p>
              <BidForm
                slug={slug}
                itemId={item.id}
                nextMin={nextMin}
                deadline={settings?.auction_deadline}
                onSubmit={handleBidSubmit}
                message={msg}
              />
            </>
          ) : (
            <div className="mt-4 p-4 border rounded-xl bg-gray-50">
              <h2 className="font-semibold mb-1">Bidding closed</h2>
              {winner ? (
                <>
                  <p>
                    Winning bid: <b>{formatDollar(winner.amount)}</b>
                  </p>
                  <p>
                    Winner: <b>{getInitials(winner.bidder_name)}</b> (initials)
                  </p>
                </>
              ) : (
                <p>No bids were placed.</p>
              )}
              <div className="mt-3 text-sm space-y-1">
                <p>
                  <b>Payment:</b>{' '}
                  {settings?.payment_instructions || 'See checkout table.'}
                </p>
                <p>
                  <b>Pickup:</b>{' '}
                  {settings?.pickup_instructions || 'See gym stage.'}
                </p>
                {settings?.contact_email && (
                  <p className="mt-1">
                    Questions: {settings?.contact_email}
                  </p>
                )}
              </div>
            </div>
          )}

          <h3 className="mt-6 font-semibold">Top bids</h3>
          <ul className="mt-2 space-y-1">
            {bids.length > 0 ? (
              bids.map((b) => (
                <li key={b.id} className="text-sm">
                  {formatDollar(b.amount)} — {getInitials(b.bidder_name)}
                </li>
              ))
            ) : (
              <li className="text-sm opacity-70">No bids yet.</li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
