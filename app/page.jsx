'use client';

import { supabaseBrowser } from '@/lib/supabaseClient';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import ItemCard from '@/components/ItemCard';

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
              Find something you love - every dollar supports our kids!
            </p>
          </div>
        </div>
      </section>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <section className='mb-4'>
          <div className='flex flex-wrap gap-2'>
            <button
              onClick={() => setActiveFilter(ALL_CATEGORIES)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                activeFilter === ALL_CATEGORIES
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
              }`}
              style={
                activeFilter === ALL_CATEGORIES
                  ? { backgroundColor: 'var(--primary-500)' }
                  : undefined
              }
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  activeFilter === cat
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
                style={
                  activeFilter === cat
                    ? { backgroundColor: 'var(--primary-500)' }
                    : undefined
                }
              >
                {cat}
              </button>
            ))}
            {hasUncategorized && (
              <button
                onClick={() => setActiveFilter(UNCATEGORIZED)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
                  activeFilter === UNCATEGORIZED
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
                style={
                  activeFilter === UNCATEGORIZED
                    ? { backgroundColor: 'var(--primary-500)' }
                    : undefined
                }
              >
                {UNCATEGORIZED}
              </button>
            )}
          </div>
        </section>
      )}

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
