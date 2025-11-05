'use client';

import { supabaseBrowser } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import ItemCard from '@/components/ItemCard';

export default function CatalogPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const s = supabaseBrowser();

  async function load() {
    try {
      const { data, error } = await s
        .from('item_leaders')
        .select('*')
        .order('title', { ascending: true });
      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const channel = s
      .channel('rt-bids')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
        load();
      })
      .subscribe();

    return () => {
      s.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="mb-6 sm:mb-8">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-primary">Silent Auction</h1>
                  <p className="text-base-content/70 mt-2">Browse items and place your bids.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 bg-dots">
      <section className="mb-6 sm:mb-8">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-primary">Silent Auction</h1>
                <p className="text-base-content/70 mt-2">Browse items and place your bids.</p>
              </div>
              <a href="/how-to-bid" className="btn btn-primary">
                How to Bid
              </a>
            </div>
          </div>
        </div>
      </section>
      {items.length === 0 ? (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center py-12">
            <p className="text-base-content/70 text-lg">No items available.</p>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
