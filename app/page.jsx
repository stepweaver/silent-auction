'use client';

import { supabaseBrowser } from '@/lib/supabaseClient';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ItemCard from '@/components/ItemCard';
import GoalMeter from '@/components/GoalMeter';
import Link from 'next/link';

const ENROLLMENT_KEY = 'auction_enrolled';
const ALL_CATEGORIES = '__all__';
const UNCATEGORIZED = 'Other';

export default function CatalogPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [activeFilter, setActiveFilter] = useState(ALL_CATEGORIES);
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

      const itemList = data || [];
      const itemIds = itemList.map((item) => item.id);

      // Batch fetch top bids for all items (avoid N+1)
      const topBidsMap = {};
      const BATCH_SIZE = 80;
      for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
        const chunk = itemIds.slice(i, i + BATCH_SIZE);
        const { data: bidsChunk, error: bidsErr } = await s
          .from('bids')
          .select('item_id, amount')
          .in('item_id', chunk)
          .order('amount', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(2000);

        if (bidsErr) throw bidsErr;

        // Per item_id keep only the top bid (first by amount)
        const seen = new Set();
        for (const row of bidsChunk || []) {
          if (seen.has(row.item_id)) continue;
          seen.add(row.item_id);
          topBidsMap[row.item_id] = {
            topBidAmount: row.amount,
            hasBids: true,
          };
        }
      }
      // Ensure every item has an entry
      for (const item of itemList) {
        if (!topBidsMap[item.id]) {
          topBidsMap[item.id] = { topBidAmount: null, hasBids: false };
        }
      }

      // Mark items as closed if deadline passed and update current_high_bid from actual bids
      const itemsWithDeadline = itemList.map((item) => {
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

  // Derive sorted category list and grouped items
  const categories = useMemo(() => {
    const catSet = new Set();
    items.forEach((item) => {
      const cat = item.category?.trim();
      if (cat) catSet.add(cat);
    });
    return [...catSet].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const groupedItems = useMemo(() => {
    const filtered =
      activeFilter === ALL_CATEGORIES
        ? items
        : items.filter((item) => {
            if (activeFilter === UNCATEGORIZED) {
              return !item.category?.trim();
            }
            return item.category?.trim() === activeFilter;
          });

    const groups = {};
    filtered.forEach((item) => {
      const cat = item.category?.trim() || UNCATEGORIZED;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    // Sort category keys: named categories alphabetically, UNCATEGORIZED at the end
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === UNCATEGORIZED) return 1;
      if (b === UNCATEGORIZED) return -1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((cat) => ({ category: cat, items: groups[cat] }));
  }, [items, activeFilter]);

  const hasUncategorized = useMemo(
    () => items.some((item) => !item.category?.trim()),
    [items]
  );

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
      {/* Top section: Goal Meter and Filter - balanced layout for desktop */}
      <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-start md:gap-4'>
        {/* Goal Meter - takes available space on desktop */}
        <div className='flex-1'>
          <GoalMeter />
        </div>

        {/* Category filter dropdown - fixed width on desktop */}
        {categories.length > 0 && (
          <div className='relative w-full md:w-64 md:shrink-0'>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className='w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm font-semibold text-gray-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2'
              style={{ focusRingColor: 'var(--primary-500)', '--tw-ring-color': 'var(--primary-500)' }}
            >
              <option value={ALL_CATEGORIES}>All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              {hasUncategorized && (
                <option value={UNCATEGORIZED}>{UNCATEGORIZED}</option>
              )}
            </select>
            <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3'>
              <svg
                className='h-4 w-4 text-gray-500'
                xmlns='http://www.w3.org/2000/svg'
                viewBox='0 0 20 20'
                fill='currentColor'
              >
                <path
                  fillRule='evenodd'
                  d='M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Donate banner - full width, better integrated */}
      <Link
        href='/donate'
        className='mb-4 flex flex-col gap-2 rounded-xl border bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:gap-3'
        style={{ borderColor: 'rgba(4, 120, 87, 0.25)' }}
      >
        <div className='min-w-0 flex-1'>
          <p className='text-sm font-semibold text-gray-900'>
            Want to support without bidding?
          </p>
          <p className='text-xs text-gray-500'>
            Pledge a donation to help our cause directly.
          </p>
        </div>
        <span
          className='shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-105'
          style={{ backgroundColor: 'var(--primary-500)' }}
        >
          Donate
        </span>
      </Link>

      {items.length === 0 ? (
        <div className='bg-white rounded-xl shadow-xl border border-gray-200'>
          <div className='px-4 py-12 text-center'>
            <p className='text-sm text-gray-600'>No items available.</p>
          </div>
        </div>
      ) : groupedItems.length === 0 ? (
        <div className='bg-white rounded-xl shadow-xl border border-gray-200'>
          <div className='px-4 py-12 text-center'>
            <p className='text-sm text-gray-600'>No items in this category.</p>
          </div>
        </div>
      ) : (
        <div className='space-y-6'>
          {groupedItems.map(({ category, items: catItems }) => (
            <section key={category}>
              <h2
                className='text-base font-bold mb-2 px-1'
                style={{ color: 'var(--primary-700, var(--primary-500))' }}
              >
                {category}
                <span className='ml-2 text-xs font-normal text-gray-500'>
                  ({catItems.length} {catItems.length === 1 ? 'item' : 'items'})
                </span>
              </h2>
              <div className='grid gap-3 xl:grid-cols-2 2xl:grid-cols-3'>
                {catItems.map((item, index) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    priority={category === groupedItems[0]?.category && index === 0}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
