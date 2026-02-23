'use client';

import { supabaseBrowser } from '@/lib/supabaseClient';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { formatDollar } from '@/lib/money';
import AliasAvatar from '@/components/AliasAvatar';
import BidNotification from '@/components/BidNotification';

// --- Helpers ---
function clamp(n, min, max) {
  return Math.min(Math.max(n, min), max);
}
function secondsAgo(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return (Date.now() - t) / 1000;
}
function formatAgoShort(sec) {
  if (sec == null || sec < 0) return '';
  if (sec < 5) return 'just now';
  if (sec < 60) return `${Math.round(sec)}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec / 3600)}h`;
}
function useCountdown(targetIso) {
  const [msLeft, setMsLeft] = useState(null);
  useEffect(() => {
    if (!targetIso) {
      setMsLeft(null);
      return;
    }
    const target = new Date(targetIso).getTime();
    const tick = () => {
      const now = Date.now();
      setMsLeft(target > now ? target - now : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);
  return msLeft;
}
function HeatBar({ heat, label, reducedMotion }) {
  const pct = Math.round((heat ?? 0) * 100);
  return (
    <div className="w-full">
      {label && <span className="text-xs text-gray-500">{label}</span>}
      <motion.div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
        initial={false}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #22c55e, #eab308, #ef4444)',
            width: `${pct}%`
          }}
          transition={{ duration: reducedMotion ? 0 : 0.3 }}
          initial={false}
          animate={{ width: `${pct}%` }}
        />
      </motion.div>
    </div>
  );
}
function Ticker({ items }) {
  if (!items || items.length === 0) return <div className="h-8 w-full overflow-hidden" aria-hidden />;
  const duplicated = [...items, ...items];
  return (
    <div className="relative h-8 w-full overflow-hidden border-t border-b border-gray-200 bg-gray-50/80">
      <div className="ticker-track flex h-full items-center gap-8 whitespace-nowrap">
        {duplicated.map((x, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-gray-700">
            {x.emoji && <span>{x.emoji}</span>}
            {x.text}
          </span>
        ))}
      </div>
      <style jsx>{`
        .ticker-track {
          animation: ticker 22s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
function Badge({ children, tone }) {
  const classes = {
    hot: 'bg-red-100 text-red-800',
    war: 'bg-amber-100 text-amber-800',
    move: 'bg-sky-100 text-sky-800',
    new: 'bg-emerald-100 text-emerald-800'
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${classes[tone] || classes.new}`}>
      {children}
    </span>
  );
}
function CardGlow({ active }) {
  if (!active) return null;
  return (
    <AnimatePresence>
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl opacity-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(239,68,68,0.3), transparent 70%), radial-gradient(ellipse at 30% 30%, rgba(234,179,8,0.2), transparent 50%)'
        }}
      />
    </AnimatePresence>
  );
}

const ENROLLMENT_KEY = 'auction_enrolled';
const ALL_CATEGORIES = '__all__';
const UNCATEGORIZED = 'Other';

export default function LeaderboardPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [sortedItems, setSortedItems] = useState([]); // Items sorted by bid count
  const [topBids, setTopBids] = useState({}); // item_id -> top bid data
  const [bidCounts, setBidCounts] = useState({}); // item_id -> total bid count
  const [recentBids, setRecentBids] = useState({}); // item_id -> array of recent bids
  const [loading, setLoading] = useState(true);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState(ALL_CATEGORIES);
  const [deadlineIso, setDeadlineIso] = useState(null);
  const prevItemsStateRef = useRef({}); // Track previous state for change detection
  const prevPositionsRef = useRef({}); // Track previous positions for animation
  const prevBidCountsRef = useRef({}); // Track previous bid counts
  const reducedMotion = useReducedMotion();
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

  // Retry a promise on 503/network errors (e.g. Supabase overload)
  async function withRetry(fn, maxAttempts = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const isRetryable = err?.message?.includes('503') || err?.message?.includes('timeout') || err?.message?.includes('fetch');
        if (attempt < maxAttempts && isRetryable) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        } else {
          throw err;
        }
      }
    }
    throw lastErr;
  }

  async function loadLeaderboard() {
    try {
      await withRetry(async () => {
      // Get settings to check deadline
      const { data: settings } = await s
        .from('settings')
        .select('auction_deadline')
        .eq('id', 1)
        .maybeSingle();

      setDeadlineIso(settings?.auction_deadline ?? null);

      const deadline = settings?.auction_deadline
        ? new Date(settings.auction_deadline)
        : null;
      const now = new Date();
      const deadlinePassed = deadline && now >= deadline;

      // Fetch all open items
      const { data: itemsData, error: itemsError } = await s
        .from('item_leaders')
        .select('*')
        .eq('is_closed', false)
        .order('title', { ascending: true });

      if (itemsError) throw itemsError;

      // Filter out items if deadline passed (though they should all close together)
      const openItems = (itemsData || []).filter(item => !deadlinePassed);
      const itemIds = openItems.map(i => i.id);

      setItems(openItems);

      if (itemIds.length === 0) {
        setItems([]);
        setSortedItems([]);
        setTopBids({});
        setRecentBids({});
        setBidCounts({});
        return;
      }

      // Batch 1: Fetch all bids for all items in one or two queries (no per-item HEAD/GET)
      const BATCH_SIZE = 80;
      let allBids = [];
      for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
        const chunk = itemIds.slice(i, i + BATCH_SIZE);
        const { data: bidsChunk, error: bidsError } = await s
          .from('bids')
          .select('*')
          .in('item_id', chunk)
          .order('amount', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1500);

        if (bidsError) throw bidsError;
        if (bidsChunk?.length) allBids = allBids.concat(bidsChunk);
      }

      // Group bids by item_id; derive top bid, count, and recent per item
      const bidsByItem = {};
      for (const bid of allBids) {
        if (!bidsByItem[bid.item_id]) bidsByItem[bid.item_id] = [];
        bidsByItem[bid.item_id].push(bid);
      }

      const topBidByItem = {};
      const recentBidsByItem = {};
      const bidCountByItem = {};
      const allAliasIds = new Set();
      const emailsForFallback = new Set();

      for (const item of openItems) {
        const list = bidsByItem[item.id] || [];
        bidCountByItem[item.id] = list.length;
        const topBid = list[0] || null;
        if (topBid) {
          topBidByItem[item.id] = topBid;
          if (topBid.alias_id) allAliasIds.add(topBid.alias_id);
        }
        const recent = list.filter(bid => (now - new Date(bid.created_at)) < 60000);
        recentBidsByItem[item.id] = recent;
        recent.forEach(bid => {
          if (bid.alias_id) allAliasIds.add(bid.alias_id);
        });
      }

      // Batch 2: Fetch all aliases by id in one or few queries
      const aliasIdsArr = [...allAliasIds];
      const aliasesMap = {};
      const ALIAS_BATCH = 100;
      for (let i = 0; i < aliasIdsArr.length; i += ALIAS_BATCH) {
        const chunk = aliasIdsArr.slice(i, i + ALIAS_BATCH);
        const { data: aliasesData, error: aliasesError } = await s
          .from('user_aliases')
          .select('id, alias, color, animal')
          .in('id', chunk);

        if (aliasesError) throw aliasesError;
        if (aliasesData) {
          aliasesData.forEach(a => { aliasesMap[a.id] = a; });
        }
      }

      // Emails for fallback: bids with alias_id not found
      for (const item of openItems) {
        const topBid = topBidByItem[item.id];
        if (topBid?.alias_id && !aliasesMap[topBid.alias_id] && topBid.email) emailsForFallback.add(topBid.email);
        (recentBidsByItem[item.id] || []).forEach(bid => {
          if (bid.alias_id && !aliasesMap[bid.alias_id] && bid.email) emailsForFallback.add(bid.email);
        });
      }

      // Batch 3: Fallback alias lookup by email (one query)
      const emailAliasesMap = {};
      if (emailsForFallback.size > 0) {
        const emails = [...emailsForFallback];
        const { data: emailAliasesData } = await s
          .from('user_aliases')
          .select('id, alias, color, animal, email')
          .in('email', emails);

        if (emailAliasesData) {
          emailAliasesData.forEach(a => { emailAliasesMap[a.email] = a; });
        }
      }

      // Build topBids and recentBids with aliases attached
      const newTopBids = {};
      const newRecentBids = {};
      const newBidCounts = {};

      for (const item of openItems) {
        const topBid = topBidByItem[item.id];
        let topBidAlias = topBid?.alias_id ? aliasesMap[topBid.alias_id] : null;
        if (!topBidAlias && topBid?.email) topBidAlias = emailAliasesMap[topBid.email] || null;

        newTopBids[item.id] = topBid ? { ...topBid, user_aliases: topBidAlias } : null;
        if (!topBid) delete newTopBids[item.id];

        const recentList = (recentBidsByItem[item.id] || []).map(bid => {
          let bidAlias = bid.alias_id ? aliasesMap[bid.alias_id] : null;
          if (!bidAlias && bid.email) bidAlias = emailAliasesMap[bid.email] || null;
          return { ...bid, user_aliases: bidAlias };
        });
        if (recentList.length > 0) newRecentBids[item.id] = recentList;

        newBidCounts[item.id] = bidCountByItem[item.id] ?? 0;
      }

      // Stable sort: category then title (no reordering when bid counts change — reduces flashing)
      // Also update current_high_bid from actual top bids
      const itemsWithBidCounts = openItems.map(item => {
        const topBid = newTopBids[item.id];
        const actualCurrentBid = topBid?.amount || null;
        return {
          ...item,
          bidCount: newBidCounts[item.id] || 0,
          // Override current_high_bid with actual top bid from bids table
          current_high_bid: actualCurrentBid !== null ? actualCurrentBid : item.current_high_bid,
        };
      }).sort((a, b) => {
        const catA = (a.category || '').trim() || UNCATEGORIZED;
        const catB = (b.category || '').trim() || UNCATEGORIZED;
        if (catA !== catB) {
          if (catA === UNCATEGORIZED) return 1;
          if (catB === UNCATEGORIZED) return -1;
          return catA.localeCompare(catB);
        }
        return (a.title || '').localeCompare(b.title || '');
      });

      // Detect position changes and new bids for notifications
      const prevPositions = prevPositionsRef.current;
      const prevBidCounts = prevBidCountsRef.current;
      const newNotifications = [];

      itemsWithBidCounts.forEach((item, newIndex) => {
        const prevIndex = prevPositions[item.id];
        const prevCount = prevBidCounts[item.id] || 0;
        const currentCount = newBidCounts[item.id] || 0;

        // Check for new bid
        if (currentCount > prevCount && prevCount > 0) {
          const topBid = newTopBids[item.id];
          if (topBid) {
            newNotifications.push({
              id: `${item.id}-${Date.now()}`,
              type: 'new_bid',
              itemTitle: item.title,
              bidderName: topBid.bidder_name,
              bidAmount: topBid.amount,
              alias: topBid.user_aliases?.alias,
              color: topBid.user_aliases?.color,
              animal: topBid.user_aliases?.animal
            });
          }
        }

        // Check for leader change
        const currentLeaderId = newTopBids[item.id]?.alias_id || newTopBids[item.id]?.bidder_name;
        const prevLeaderId = prevItemsStateRef.current[item.id]?.alias_id || prevItemsStateRef.current[item.id]?.bidder_name;
        if (currentLeaderId && currentLeaderId !== prevLeaderId && prevLeaderId !== null && prevLeaderId !== undefined) {
          const topBid = newTopBids[item.id];
          if (topBid) {
            newNotifications.push({
              id: `${item.id}-leader-${Date.now()}`,
              type: 'leader_change',
              itemTitle: item.title,
              bidderName: topBid.bidder_name,
              bidAmount: topBid.amount,
              alias: topBid.user_aliases?.alias,
              color: topBid.user_aliases?.color,
              animal: topBid.user_aliases?.animal
            });
          }
        }
      });

      // Add new notifications
      if (newNotifications.length > 0) {
        setNotifications(prev => [...prev, ...newNotifications]);
      }

      // Update positions
      const newPositions = {};
      itemsWithBidCounts.forEach((item, index) => {
        newPositions[item.id] = index;
      });
      prevPositionsRef.current = newPositions;
      prevBidCountsRef.current = { ...newBidCounts };

      setItems(openItems);
      setSortedItems(itemsWithBidCounts);
      setTopBids(newTopBids);
      setRecentBids(newRecentBids);
      setBidCounts(newBidCounts);
      }); // end withRetry
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checkingEnrollment) return;

    loadLeaderboard();

    // Set up real-time subscription (debounced so rapid bids don't trigger many reloads)
    let reloadTimer = null;
    const channel = s
      .channel('rt-leaderboard-bids')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bids' },
        () => {
          if (reloadTimer) clearTimeout(reloadTimer);
          reloadTimer = setTimeout(() => {
            loadLeaderboard();
            reloadTimer = null;
          }, 1500);
        }
      )
      .subscribe();

    // Polling backup every 8 seconds (reduced from 2s to avoid hammering Supabase)
    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadLeaderboard();
      }
    }, 8000);

    return () => {
      s.removeChannel(channel);
      clearInterval(pollInterval);
      if (reloadTimer) clearTimeout(reloadTimer);
    };
  }, [checkingEnrollment]);

  // Update ref when topBids changes (for leader change detection)
  useEffect(() => {
    prevItemsStateRef.current = { ...topBids };
  }, [topBids]);

  // Calculate hot items, bidding wars, position changes, heat, lastBidSec
  const itemStates = useMemo(() => {
    const now = Date.now();
    const states = {};
    const prevPositions = prevPositionsRef.current;

    sortedItems.forEach((item, index) => {
      const itemRecentBids = recentBids[item.id] || [];
      
      // Hot: bids within last 30 seconds
      const hotBids = itemRecentBids.filter(bid => {
        const bidTime = new Date(bid.created_at).getTime();
        return now - bidTime < 30000; // 30 seconds
      });
      const isHot = hotBids.length > 0;

      // Bidding war: 2+ different bidders in last 60 seconds
      const uniqueBidders = new Set(
        itemRecentBids.map(bid => bid.alias_id || bid.bidder_name)
      );
      const hasBiddingWar = uniqueBidders.size >= 2;

      // Leader changed: compare with previous state (from ref)
      const currentLeaderId = topBids[item.id]?.alias_id || topBids[item.id]?.bidder_name;
      const prevLeaderId = prevItemsStateRef.current[item.id]?.alias_id || prevItemsStateRef.current[item.id]?.bidder_name;
      const leaderChanged = currentLeaderId && currentLeaderId !== prevLeaderId && prevLeaderId !== null && prevLeaderId !== undefined;

      // Position change detection
      const prevIndex = prevPositions[item.id];
      const positionChanged = prevIndex !== undefined && prevIndex !== index;
      const movedUp = positionChanged && prevIndex > index;

      // lastBidSec: seconds since most recent bid
      const lastBidAt = itemRecentBids.length > 0
        ? itemRecentBids.reduce((latest, b) => {
            const t = new Date(b.created_at).getTime();
            return t > latest ? t : latest;
          }, 0)
        : null;
      const lastBidSec = lastBidAt != null ? (now - lastBidAt) / 1000 : null;

      // heat: bid velocity + recency (0..1)
      const bidVelocity = clamp(itemRecentBids.length / 6, 0, 1);
      const recencyBoost = lastBidSec != null ? clamp(1 - lastBidSec / 60, 0, 1) : 0;
      const heat = bidVelocity * 0.65 + recencyBoost * 0.35;

      states[item.id] = {
        isHot,
        hasBiddingWar,
        leaderChanged,
        positionChanged,
        movedUp,
        currentPosition: index,
        previousPosition: prevIndex,
        lastBidSec,
        heat
      };
    });

    return states;
  }, [sortedItems, topBids, recentBids]);

  // Derive unique category list from loaded items
  const categories = useMemo(() => {
    const catSet = new Set();
    items.forEach((item) => {
      const cat = item.category?.trim();
      if (cat) catSet.add(cat);
    });
    return [...catSet].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const hasUncategorized = useMemo(
    () => items.some((item) => !item.category?.trim()),
    [items]
  );

  // Filter sorted items by active category
  const filteredItems = useMemo(() => {
    if (activeFilter === ALL_CATEGORIES) return sortedItems;
    return sortedItems.filter((item) => {
      if (activeFilter === UNCATEGORIZED) {
        return !item.category?.trim();
      }
      return item.category?.trim() === activeFilter;
    });
  }, [sortedItems, activeFilter]);

  // Ranked summary for "All" view: hot, wars, movers, most bids, tickerItems
  const rankedSummary = useMemo(() => {
    if (activeFilter !== ALL_CATEGORIES || filteredItems.length === 0) return null;
    const hotItems = filteredItems.filter((item) => itemStates[item.id]?.isHot);
    const warItems = filteredItems.filter((item) => itemStates[item.id]?.hasBiddingWar);
    const movers = filteredItems.filter((item) => itemStates[item.id]?.movedUp).slice(0, 6);
    const topByBids = [...filteredItems]
      .sort((a, b) => (bidCounts[b.id] || 0) - (bidCounts[a.id] || 0))
      .filter((item) => (bidCounts[item.id] || 0) > 0)
      .slice(0, 8);
    const tickerItems = [];
    hotItems.slice(0, 5).forEach((item) => {
      const topBid = topBids[item.id];
      tickerItems.push({ emoji: '🔥', text: `Hot: ${item.title} ${topBid ? formatDollar(topBid.amount) : ''}` });
    });
    warItems.slice(0, 5).forEach((item) => {
      const topBid = topBids[item.id];
      tickerItems.push({ emoji: '⚔️', text: `War: ${item.title} ${topBid ? formatDollar(topBid.amount) : ''}` });
    });
    movers.forEach((item) => {
      tickerItems.push({ emoji: '📈', text: `${item.title} moved up` });
    });
    if (tickerItems.length === 0 && topByBids.length > 0) {
      topByBids.slice(0, 5).forEach((item) => {
        const count = bidCounts[item.id] || 0;
        tickerItems.push({ emoji: '📊', text: `Most bids: ${item.title} (${count})` });
      });
    }
    if (hotItems.length === 0 && warItems.length === 0 && topByBids.length === 0 && movers.length === 0) return null;
    return { hotItems, warItems, movers, topByBids, tickerItems };
  }, [activeFilter, filteredItems, itemStates, bidCounts, topBids]);

  if (checkingEnrollment || loading) {
    return (
      <main className='w-full min-h-screen px-4 py-4 sm:py-6 bg-gray-50'>
        <div className='flex items-center justify-center py-12'>
          <div
            className='w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin'
            style={{ borderTopColor: 'var(--primary-500)' }}
          ></div>
        </div>
      </main>
    );
  }

  // Notification handler
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <>
      {/* Notifications - stack from top */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            style={{
              transform: `translateY(${index * 0}px)`,
              zIndex: 50 + notifications.length - index
            }}
          >
            <BidNotification
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          </div>
        ))}
      </div>

      {/* Single broadcast-style layout: projector-first, responsive */}
      <main className='w-full min-h-screen px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-4 bg-gray-50'>
        {/* Header: title, subtitle, privacy, category, countdown, ticker */}
        <section className='mb-2 sm:mb-3'>
          <div className='bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden'>
            <div className='px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6 lg:py-4 text-center'>
              <h1 className='text-lg sm:text-2xl lg:text-3xl font-bold mb-0.5' style={{ color: 'var(--primary-500)' }}>
                🏆 Live Leaderboard
              </h1>
              <p className='text-xs sm:text-sm lg:text-base text-gray-600'>
                {activeFilter === ALL_CATEGORIES ? 'Current leaders for all auction items' : `Showing ${activeFilter} items`}
              </p>
              <div className='mt-1.5 sm:mt-2 flex flex-wrap items-center justify-center gap-2'>
                {categories.length > 0 && (
                  <div className='relative inline-block w-48 sm:w-64'>
                    <select
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value)}
                      className='w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 sm:px-4 sm:py-2 pr-10 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2'
                      style={{ '--tw-ring-color': 'var(--primary-500)' }}
                    >
                      <option value={ALL_CATEGORIES}>All Categories</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      {hasUncategorized && <option value={UNCATEGORIZED}>{UNCATEGORIZED}</option>}
                    </select>
                    <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3'>
                      <svg className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='currentColor'>
                        <path fillRule='evenodd' d='M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z' clipRule='evenodd' />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Ticker items={rankedSummary?.tickerItems ?? []} />
          </div>
        </section>

        {items.length === 0 ? (
          <div className='bg-white rounded-lg shadow-md border border-gray-200'>
            <div className='px-4 py-8 text-center'><p className='text-sm sm:text-base text-gray-600'>No open items available.</p></div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className='bg-white rounded-lg shadow-md border border-gray-200'>
            <div className='px-4 py-8 text-center'><p className='text-sm sm:text-base text-gray-600'>No items in this category.</p></div>
          </div>
        ) : (
          <div className='space-y-3 sm:space-y-4'>
            {/* 3-panel summary when All Categories and rankedSummary */}
            {activeFilter === ALL_CATEGORIES && rankedSummary && (
              <motion.div
                layout={!reducedMotion}
                transition={{ duration: reducedMotion ? 0 : 0.2 }}
                className='bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden'
              >
                <h2 className='px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-bold border-b border-gray-200' style={{ color: 'var(--primary-500)' }}>
                  What&apos;s happening
                </h2>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 p-3 sm:p-4'>
                  <div className='min-w-0'>
                    <h3 className='text-xs font-semibold text-red-600 mb-1.5 flex items-center gap-1'><span className={reducedMotion ? '' : 'animate-pulse'}>🔥</span> Hot right now</h3>
                    <ul className='space-y-1.5'>
                      {(rankedSummary.hotItems.length > 0 ? rankedSummary.hotItems : rankedSummary.topByBids.slice(0, 4)).map((item) => {
                        const topBid = topBids[item.id];
                        const aliasName = topBid?.user_aliases?.alias ?? 'Anonymous Bidder';
                        return (
                          <li key={item.id} className='rounded-md border border-gray-200 bg-gray-50/60 px-2 py-1.5 hover:bg-gray-50 flex items-start gap-2 min-w-0'>
                            <Link href={`/i/${item.slug}`} className='font-medium hover:underline text-sm sm:text-base flex-1 min-w-0 leading-snug' style={{ color: 'var(--primary-600)' }}>{item.title}</Link>
                            <span className='flex items-center gap-1.5 flex-shrink-0 text-xs'>
                              {topBid?.user_aliases ? <AliasAvatar alias={topBid.user_aliases.alias} color={topBid.user_aliases.color} animal={topBid.user_aliases.animal} size="sm" /> : <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium flex-shrink-0'>A</div>}
                              <span className='text-gray-700 whitespace-nowrap'>{aliasName}</span>
                              <span className='text-gray-800 font-semibold'>{topBid ? formatDollar(topBid.amount) : '—'}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className='min-w-0'>
                    <h3 className='text-xs font-semibold text-amber-700 mb-1.5'>⚔️ Bidder wars</h3>
                    <ul className='space-y-1.5'>
                      {(rankedSummary.warItems.length > 0 ? rankedSummary.warItems : rankedSummary.topByBids.slice(0, 4)).map((item) => {
                        const topBid = topBids[item.id];
                        const aliasName = topBid?.user_aliases?.alias ?? 'Anonymous Bidder';
                        return (
                          <li key={item.id} className='rounded-md border border-gray-200 bg-gray-50/60 px-2 py-1.5 hover:bg-gray-50 flex items-start gap-2 min-w-0'>
                            <Link href={`/i/${item.slug}`} className='font-medium hover:underline text-sm sm:text-base flex-1 min-w-0 leading-snug' style={{ color: 'var(--primary-600)' }}>{item.title}</Link>
                            <span className='flex items-center gap-1.5 flex-shrink-0 text-xs'>
                              {topBid?.user_aliases ? <AliasAvatar alias={topBid.user_aliases.alias} color={topBid.user_aliases.color} animal={topBid.user_aliases.animal} size="sm" /> : <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium flex-shrink-0'>A</div>}
                              <span className='text-gray-700 whitespace-nowrap'>{aliasName}</span>
                              <span className='text-gray-800 font-semibold'>{topBid ? formatDollar(topBid.amount) : '—'}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className='min-w-0'>
                    <h3 className='text-xs font-semibold text-sky-700 mb-1.5'>📈 Movers</h3>
                    <ul className='space-y-1.5'>
                      {(rankedSummary.movers?.length > 0 ? rankedSummary.movers : rankedSummary.topByBids.slice(0, 4)).map((item) => {
                        const topBid = topBids[item.id];
                        const aliasName = topBid?.user_aliases?.alias ?? 'Anonymous Bidder';
                        return (
                          <li key={item.id} className='rounded-md border border-gray-200 bg-gray-50/60 px-2 py-1.5 hover:bg-gray-50 flex items-start gap-2 min-w-0'>
                            <Link href={`/i/${item.slug}`} className='font-medium hover:underline text-sm sm:text-base flex-1 min-w-0 leading-snug' style={{ color: 'var(--primary-600)' }}>{item.title}</Link>
                            <span className='flex items-center gap-1.5 flex-shrink-0 text-xs'>
                              {topBid?.user_aliases ? <AliasAvatar alias={topBid.user_aliases.alias} color={topBid.user_aliases.color} animal={topBid.user_aliases.animal} size="sm" /> : <div className='w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium flex-shrink-0'>A</div>}
                              <span className='text-gray-700 whitespace-nowrap'>{aliasName}</span>
                              <span className='text-gray-800 font-semibold'>{topBid ? formatDollar(topBid.amount) : '—'}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

            {/* When a category is selected, prompt to view highlights (no full item list) */}
            {activeFilter !== ALL_CATEGORIES && filteredItems.length > 0 && (
              <p className='text-center text-xs sm:text-sm text-gray-500 py-4'>Select All Categories to see activity highlights.</p>
            )}
          </div>
        )}
      </main>
    </>
  );
}

