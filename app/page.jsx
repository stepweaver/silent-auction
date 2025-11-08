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
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: 'var(--primary-500)' }}></div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-4 pb-8">
      <section className="mb-4">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--primary-500)' }}>
              Silent Auction
            </h1>
            <p className="text-sm text-gray-600">Browse items and place your bids.</p>
          </div>
        </div>
      </section>
      {items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-xl border border-gray-200">
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-600">No items available.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {items.map((item, index) => (
            <ItemCard key={item.id} item={item} priority={index === 0} />
          ))}
        </div>
      )}
    </main>
  );
}