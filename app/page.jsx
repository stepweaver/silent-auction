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

      const deadline = settings?.auction_deadline
        ? new Date(settings.auction_deadline)
        : null;
      const now = new Date();
      const deadlinePassed = deadline && now >= deadline;

      const { data, error } = await s
        .from('item_leaders')
        .select('*')
        .order('title', { ascending: true });
      if (error) throw error;

      // Fetch top bid for each item to get accurate current_high_bid and bid existence
      const topBidsPromises = (data || []).map(async (item) => {
        const { data: topBidData } = await s
          .from('bids')
          .select('amount')
          .eq('item_id', item.id)
          .order('amount', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        return {
          itemId: item.id,
          topBidAmount: topBidData?.amount || null,
          hasBids: topBidData !== null && topBidData !== undefined
        };
      });

      const topBidsResults = await Promise.all(topBidsPromises);
      const topBidsMap = topBidsResults.reduce((acc, { itemId, topBidAmount, hasBids }) => {
        acc[itemId] = { topBidAmount, hasBids };
        return acc;
      }, {});

      // Mark items as closed if deadline passed and update current_high_bid from actual bids
      const itemsWithDeadline = (data || []).map((item) => {
        const bidInfo = topBidsMap[item.id];
        const actualCurrentBid = bidInfo?.topBidAmount ?? null;
        return {
          ...item,
          is_closed: item.is_closed || deadlinePassed,
          // Override current_high_bid with actual top bid from bids table
          current_high_bid: actualCurrentBid !== null ? actualCurrentBid : item.current_high_bid,
          // Track whether bids exist (separate from amount comparison)
          _hasBids: bidInfo?.hasBids || false,
        };
      });

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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bids' },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      s.removeChannel(channel);
    };
  }, [checkingEnrollment]);

  if (checkingEnrollment || loading) {
    return (
      <main className='w-full px-4 py-4 sm:py-6'>
        <div className='flex items-center justify-center py-12'>
          <div
            className='w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin'
            style={{ borderTopColor: 'var(--primary-500)' }}
          ></div>
        </div>
      </main>
    );
  }

  return (
    <main className='w-full px-4 py-4 pb-8'>
      <section className='mb-4'>
        <div className='bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden'>
          <div className='px-4 py-4'>
            <h1
              className='text-2xl font-bold mb-1'
              style={{ color: 'var(--primary-500)' }}
            >
              Silent Auction Catalog
            </h1>
            <p className='text-sm text-gray-600'>
              Find something you love—every dollar supports our kids!
            </p>
          </div>
        </div>
      </section>
      {items.length === 0 ? (
        <div className='bg-white rounded-xl shadow-xl border border-gray-200'>
          <div className='px-4 py-12 text-center'>
            <p className='text-sm text-gray-600'>No items available.</p>
          </div>
        </div>
      ) : (
        <div className='grid gap-3 xl:grid-cols-2 2xl:grid-cols-3'>
          {items.map((item, index) => (
            <ItemCard key={item.id} item={item} priority={index === 0} />
          ))}
        </div>
      )}
    </main>
  );
}
