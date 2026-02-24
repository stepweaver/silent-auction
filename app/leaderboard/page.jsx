'use client';

import { supabaseBrowser } from '@/lib/supabaseClient';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useReducedMotion } from 'framer-motion';
import { withRetry } from '@/lib/utils';
import GoalMeter from '@/components/GoalMeter';
import LeaderboardItemRow from '@/components/LeaderboardSummaryPanel';

const ENROLLMENT_KEY = 'auction_enrolled';
const UNCATEGORIZED = 'Other'; // sort key for items with no category

export default function LeaderboardPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [sortedItems, setSortedItems] = useState([]);
  const [topBids, setTopBids] = useState({});
  const [secondTopBids, setSecondTopBids] = useState({});
  const [bidCounts, setBidCounts] = useState({});
  const [recentBids, setRecentBids] = useState({});
  const [loading, setLoading] = useState(true);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [deadlineIso, setDeadlineIso] = useState(null);
  const reducedMotion = useReducedMotion();

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

  const loadLeaderboard = useCallback(async () => {
    const s = supabaseBrowser();
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
          setSecondTopBids({});
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
          const secondBid = list[1] || null; // runner-up / challenger in a war – always resolve their alias
          if (topBid) {
            topBidByItem[item.id] = topBid;
            if (topBid.alias_id) allAliasIds.add(topBid.alias_id);
          }
          if (secondBid?.alias_id) allAliasIds.add(secondBid.alias_id);
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

        // Emails for fallback: top bid, second bid (challenger), and recent bids that don't have alias resolved
        for (const item of openItems) {
          const list = bidsByItem[item.id] || [];
          const topBid = topBidByItem[item.id];
          const secondBid = list[1] || null;
          if (topBid?.email) {
            const hasAlias = topBid.alias_id && aliasesMap[topBid.alias_id];
            if (!hasAlias) emailsForFallback.add(topBid.email);
          }
          if (secondBid?.email) {
            const hasAlias = secondBid.alias_id && aliasesMap[secondBid.alias_id];
            if (!hasAlias) emailsForFallback.add(secondBid.email);
          }
          (recentBidsByItem[item.id] || []).forEach(bid => {
            if (!bid.email) return;
            const hasAlias = bid.alias_id && aliasesMap[bid.alias_id];
            if (!hasAlias) emailsForFallback.add(bid.email);
          });
        }

        // Batch 3: Fallback alias lookup by email (same as item page – resolves aliases we missed by id)
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

        // Build topBids, secondTopBids (runner-up for war display), and recentBids with aliases attached
        const newTopBids = {};
        const newSecondTopBids = {};
        const newRecentBids = {};
        const newBidCounts = {};

        for (const item of openItems) {
          const list = bidsByItem[item.id] || [];
          const topBid = topBidByItem[item.id];
          const secondBid = list[1] || null;

          let topBidAlias = topBid?.alias_id ? aliasesMap[topBid.alias_id] : null;
          if (!topBidAlias && topBid?.email) topBidAlias = emailAliasesMap[topBid.email] || null;

          newTopBids[item.id] = topBid ? { ...topBid, user_aliases: topBidAlias } : null;
          if (!topBid) delete newTopBids[item.id];

          let secondBidAlias = secondBid?.alias_id ? aliasesMap[secondBid.alias_id] : null;
          if (!secondBidAlias && secondBid?.email) secondBidAlias = emailAliasesMap[secondBid.email] || null;
          const leaderKey = topBid?.alias_id ?? topBid?.bidder_name ?? '';
          const secondKey = secondBid?.alias_id ?? secondBid?.bidder_name ?? '';
          if (secondBid && leaderKey !== secondKey) {
            newSecondTopBids[item.id] = { ...secondBid, user_aliases: secondBidAlias };
          }

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

        setItems(openItems);
        setSortedItems(itemsWithBidCounts);
        setTopBids(newTopBids);
        setSecondTopBids(newSecondTopBids);
        setRecentBids(newRecentBids);
        setBidCounts(newBidCounts);
      }); // end withRetry
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (checkingEnrollment) return;

    loadLeaderboard();

    const s = supabaseBrowser();
    // Real-time only: subscription handles bid updates; no polling to reduce Supabase egress
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

    return () => {
      s.removeChannel(channel);
      if (reloadTimer) clearTimeout(reloadTimer);
    };
  }, [checkingEnrollment, loadLeaderboard]);

  // Compact "What's happening" buckets: hot, wars, most bids, top $. No long list.
  const rankedSummary = useMemo(() => {
    const now = Date.now();
    const HOT_MS = 30000;
    const WAR_MS = 60000;
    const CAP = 4;

    const withBids = sortedItems.filter((item) => topBids[item.id]);
    if (withBids.length === 0) return { hotItems: [], warItems: [], topByBidCount: [], topByDollar: [] };

    const withFlags = withBids.map((item) => {
      const itemRecentBids = (recentBids[item.id] || []).filter(
        (b) => now - new Date(b.created_at).getTime() < WAR_MS
      );
      const hotBids = itemRecentBids.filter(
        (b) => now - new Date(b.created_at).getTime() < HOT_MS
      );
      const uniqueBidders = new Set(
        itemRecentBids.map((b) => b.alias_id ?? b.bidder_name)
      );
      return {
        item,
        topBid: topBids[item.id],
        secondBid: secondTopBids[item.id] ?? null,
        isHot: hotBids.length > 0,
        hasBiddingWar: uniqueBidders.size >= 2,
        bidCount: bidCounts[item.id] || 0
      };
    });

    const hotItems = withFlags.filter((x) => x.isHot).slice(0, CAP);
    const warItems = withFlags.filter((x) => x.hasBiddingWar).slice(0, CAP);
    const topByBidCount = [...withFlags]
      .sort((a, b) => b.bidCount - a.bidCount || (a.item.title || '').localeCompare(b.item.title || ''))
      .slice(0, 3);
    const topByDollar = [...withFlags]
      .sort((a, b) => (b.topBid?.amount ?? 0) - (a.topBid?.amount ?? 0) || (a.item.title || '').localeCompare(b.item.title || ''))
      .slice(0, 3);

    return { hotItems, warItems, topByBidCount, topByDollar };
  }, [sortedItems, topBids, secondTopBids, recentBids, bidCounts]);

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

  return (
    <main className='w-full min-h-screen px-2 py-1.5 sm:px-4 sm:py-2 lg:px-6 lg:py-3 bg-gray-50'>
      <section className='mb-1.5'>
        <div className='bg-white rounded-lg shadow border border-gray-200 overflow-hidden'>
          <div className='px-2 py-1.5 sm:px-3 sm:py-2 text-center'>
            <h1 className='text-base sm:text-xl font-bold' style={{ color: 'var(--primary-500)' }}>
              🏆 Live Leaderboard
            </h1>
          </div>
        </div>
      </section>

      <GoalMeter />

      {items.length === 0 ? (
        <div className='bg-white rounded-lg shadow-md border border-gray-200'>
          <div className='px-4 py-8 text-center'>
            <p className='text-sm sm:text-base text-gray-600'>No open items available.</p>
          </div>
        </div>
      ) : (
        <section className='bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden'>
          <div className='px-2 py-1.5 space-y-3'>
            {rankedSummary.hotItems.length > 0 && (
              <div>
                <h3 className='text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1'>Hot right now</h3>
                <ul className='space-y-1'>
                  {rankedSummary.hotItems.map(({ item, topBid, secondBid, hasBiddingWar }) => (
                    <LeaderboardItemRow
                      key={item.id}
                      item={item}
                      topBid={topBid}
                      secondBid={secondBid}
                      isHot={true}
                      hasWar={hasBiddingWar}
                      reducedMotion={!!reducedMotion}
                      compact
                    />
                  ))}
                </ul>
              </div>
            )}
            {rankedSummary.warItems.length > 0 && (
              <div>
                <h3 className='text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1'>Bidder wars</h3>
                <ul className='space-y-1'>
                  {rankedSummary.warItems.map(({ item, topBid, secondBid }) => (
                    <LeaderboardItemRow
                      key={item.id}
                      item={item}
                      topBid={topBid}
                      secondBid={secondBid}
                      isHot={false}
                      hasWar={true}
                      reducedMotion={!!reducedMotion}
                      compact
                    />
                  ))}
                </ul>
              </div>
            )}
            {rankedSummary.topByBidCount.length > 0 && (
              <div>
                <h3 className='text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1'>Most Popular</h3>
                <ul className='space-y-1'>
                  {rankedSummary.topByBidCount.map(({ item, topBid, secondBid, bidCount }) => (
                    <LeaderboardItemRow
                      key={item.id}
                      item={item}
                      topBid={topBid}
                      secondBid={secondBid}
                      isHot={false}
                      hasWar={false}
                      reducedMotion={!!reducedMotion}
                      badge={bidCount > 0 ? `${bidCount} bid${bidCount !== 1 ? 's' : ''}` : null}
                      compact
                    />
                  ))}
                </ul>
              </div>
            )}
            {rankedSummary.topByDollar.length > 0 && (
              <div>
                <h3 className='text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1'>Top earners</h3>
                <ul className='space-y-1'>
                  {rankedSummary.topByDollar.map(({ item, topBid, secondBid }) => (
                    <LeaderboardItemRow
                      key={item.id}
                      item={item}
                      topBid={topBid}
                      secondBid={secondBid}
                      isHot={false}
                      hasWar={false}
                      reducedMotion={!!reducedMotion}
                      compact
                    />
                  ))}
                </ul>
              </div>
            )}
            {rankedSummary.hotItems.length === 0 &&
             rankedSummary.warItems.length === 0 &&
             rankedSummary.topByBidCount.length === 0 &&
             rankedSummary.topByDollar.length === 0 && (
              <div className='py-2 text-center'>
                <p className='text-xs text-gray-600'>No bids yet.</p>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

