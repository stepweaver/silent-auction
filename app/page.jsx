'use client';

import { supabaseBrowser } from '@/lib/supabaseClient';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ItemCard from '@/components/ItemCard';

const ENROLLMENT_KEY = 'auction_enrolled';

export default function CatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const s = supabaseBrowser();

  // Check enrollment status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled !== 'true') {
        router.push('/landing');
        return;
      }
      setCheckingEnrollment(false);
    }
  }, [router]);

  async function load() {
    try {
      // Get settings to check deadline
      const { data: settings } = await s
        .from('settings')
        .select('auction_deadline')
        .eq('id', 1)
        .maybeSingle();
      
      const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;
      const now = new Date();
      const deadlinePassed = deadline && now >= deadline;

      const { data, error } = await s
        .from('item_leaders')
        .select('*')
        .order('title', { ascending: true });
      if (error) throw error;
      
      // Mark items as closed if deadline passed
      const itemsWithDeadline = (data || []).map(item => ({
        ...item,
        is_closed: item.is_closed || deadlinePassed,
      }));
      
      setItems(itemsWithDeadline);
    } catch (err) {
      console.error('Error loading items:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checkingEnrollment) return;
    
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
  }, [checkingEnrollment]);

  if (checkingEnrollment || loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 bg-base-300">
      <section className="mb-6 sm:mb-8">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body">
            <h1 className="text-3xl sm:text-4xl font-bold text-primary">Silent Auction</h1>
            <p className="text-base-content/70 mt-2">Browse items and place your bids.</p>
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
