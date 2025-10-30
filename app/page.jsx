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
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-semibold mb-4">Silent Auction</h1>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600">Loading items...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-semibold mb-4 sm:mb-6">Silent Auction</h1>
      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No items available.</p>
        </div>
      ) : (
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </main>
  );
}
