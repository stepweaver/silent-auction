'use client';

import { supabaseBrowser } from '@/lib/supabaseClient';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LeaderboardItem from '@/components/LeaderboardItem';
import BidNotification from '@/components/BidNotification';

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
  const prevItemsStateRef = useRef({}); // Track previous state for change detection
  const prevPositionsRef = useRef({}); // Track previous positions for animation
  const prevBidCountsRef = useRef({}); // Track previous bid counts
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

  async function loadLeaderboard() {
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

      // Fetch all open items
      const { data: itemsData, error: itemsError } = await s
        .from('item_leaders')
        .select('*')
        .eq('is_closed', false)
        .order('title', { ascending: true });

      if (itemsError) throw itemsError;

      // Filter out items if deadline passed (though they should all close together)
      const openItems = (itemsData || []).filter(item => !deadlinePassed);

      setItems(openItems);

      // Fetch bid counts and top bids for each item
      const bidsPromises = openItems.map(async (item) => {
        // Get total bid count
        const { count: totalBidCount, error: countError } = await s
          .from('bids')
          .select('*', { count: 'exact', head: true })
          .eq('item_id', item.id);

        // Get all bids for top bid and recent activity
        const { data: bidsData, error: bidsError } = await s
          .from('bids')
          .select('*')
          .eq('item_id', item.id)
          .order('amount', { ascending: false })
          .order('created_at', { ascending: false });

        if (bidsError) {
          console.error(`Error fetching bids for item ${item.id}:`, bidsError);
          return { 
            itemId: item.id, 
            topBid: null, 
            recentBids: [], 
            bidCount: countError ? 0 : (totalBidCount || 0)
          };
        }

        const topBid = bidsData && bidsData.length > 0 ? bidsData[0] : null;

        // Fetch aliases for bids that have alias_id
        const aliasIds = (bidsData || [])
          .map(bid => bid.alias_id)
          .filter(id => id !== null);

        let aliasesMap = {};
        if (aliasIds.length > 0) {
          // Select alias fields
          const { data: aliasesData, error: aliasesError } = await s
            .from('user_aliases')
            .select('id, alias, color, animal')
            .in('id', aliasIds);

          if (aliasesError) {
            console.error(`Error fetching aliases for item ${item.id}:`, aliasesError);
          } else if (aliasesData) {
            aliasesMap = aliasesData.reduce((acc, alias) => {
              acc[alias.id] = alias;
              return acc;
            }, {});
            
            // Log if any alias_ids weren't found (data integrity issue)
            const foundIds = new Set(aliasesData.map(a => a.id));
            const missingIds = aliasIds.filter(id => !foundIds.has(id));
            if (missingIds.length > 0) {
              console.warn(`[Leaderboard] Missing aliases for alias_ids: ${missingIds.join(', ')} on item ${item.id}`);
            }
          }
        }

        // Join aliases with top bid
        // If alias_id lookup failed, try to find alias by email as fallback
        let topBidAlias = null;
        if (topBid) {
          if (topBid.alias_id) {
            topBidAlias = aliasesMap[topBid.alias_id];
            
            // Fallback: If alias_id lookup failed but we have an email, try to find alias by email
            if (!topBidAlias && topBid.email) {
              const { data: emailAliasData } = await s
                .from('user_aliases')
                .select('id, alias, color, animal')
                .eq('email', topBid.email)
                .maybeSingle();
              
              if (emailAliasData) {
                topBidAlias = emailAliasData;
                // Log this recovery for monitoring
                console.warn(`[Leaderboard] Recovered alias for bid ${topBid.id} by email lookup. alias_id was ${topBid.alias_id} but not found, recovered alias: ${emailAliasData.alias}`);
              }
            }
          }
        }

        const topBidWithAlias = topBid ? {
          ...topBid,
          user_aliases: topBidAlias
        } : null;

        // Get recent bids (last 60 seconds for bidding war detection) with aliases
        const recentBidsFiltered = (bidsData || []).filter(bid => {
          const bidTime = new Date(bid.created_at);
          return now - bidTime < 60000; // 60 seconds
        });

        // For recent bids missing aliases, try email-based fallback lookup
        const recentBidsMissingAliases = recentBidsFiltered.filter(
          bid => bid.alias_id && !aliasesMap[bid.alias_id] && bid.email
        );

        // Batch lookup aliases by email for missing ones
        let emailAliasesMap = {};
        if (recentBidsMissingAliases.length > 0) {
          const missingEmails = [...new Set(recentBidsMissingAliases.map(bid => bid.email))];
          const { data: emailAliasesData } = await s
            .from('user_aliases')
            .select('id, alias, color, animal, email')
            .in('email', missingEmails);

          if (emailAliasesData) {
            emailAliasesMap = emailAliasesData.reduce((acc, alias) => {
              acc[alias.email] = alias;
              return acc;
            }, {});
          }
        }

        const recentBidsList = recentBidsFiltered.map(bid => {
          let bidAlias = bid.alias_id ? aliasesMap[bid.alias_id] : null;
          
          // Fallback: If alias_id lookup failed, try email lookup
          if (!bidAlias && bid.email && emailAliasesMap[bid.email]) {
            bidAlias = emailAliasesMap[bid.email];
          }
          
          return {
            ...bid,
            user_aliases: bidAlias
          };
        });

        return {
          itemId: item.id,
          topBid: topBidWithAlias,
          recentBids: recentBidsList,
          bidCount: totalBidCount || 0
        };
      });

      const bidsResults = await Promise.all(bidsPromises);

      // Build maps
      const newTopBids = {};
      const newRecentBids = {};
      const newBidCounts = {};

      bidsResults.forEach(({ itemId, topBid, recentBids: recent, bidCount }) => {
        if (topBid) {
          newTopBids[itemId] = topBid;
        }
        if (recent.length > 0) {
          newRecentBids[itemId] = recent;
        }
        newBidCounts[itemId] = bidCount;
      });

      // Sort items by bid count (descending), then by title
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
        if (b.bidCount !== a.bidCount) {
          return b.bidCount - a.bidCount; // Most bids first
        }
        return a.title.localeCompare(b.title); // Then alphabetically
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
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (checkingEnrollment) return;

    loadLeaderboard();

    // Set up real-time subscription
    const channel = s
      .channel('rt-leaderboard-bids')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bids' },
        () => {
          loadLeaderboard();
        }
      )
      .subscribe();

    // Polling backup every 2 seconds
    const pollInterval = setInterval(() => {
      loadLeaderboard();
    }, 2000);

    return () => {
      s.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [checkingEnrollment]);

  // Update ref when topBids changes (for leader change detection)
  useEffect(() => {
    prevItemsStateRef.current = { ...topBids };
  }, [topBids]);

  // Calculate hot items, bidding wars, and position changes
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

      states[item.id] = {
        isHot,
        hasBiddingWar,
        leaderChanged,
        positionChanged,
        movedUp,
        currentPosition: index,
        previousPosition: prevIndex
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

      {/* Desktop/Tablet View - Optimized for projector */}
      <main className='hidden md:block w-full min-h-screen px-4 py-4 lg:px-6 lg:py-6 bg-gray-50'>
        {/* Header - desktop */}
        <section className='mb-4 lg:mb-6'>
          <div className='bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden'>
            <div className='px-4 py-4 lg:px-6 lg:py-6 text-center'>
              <h1
                className='text-3xl lg:text-4xl font-bold mb-1'
                style={{ color: 'var(--primary-500)' }}
              >
                🏆 Live Leaderboard
              </h1>
              <p className='text-base lg:text-lg text-gray-600'>
                {activeFilter === ALL_CATEGORIES
                  ? 'Current leaders for all auction items'
                  : `Showing ${activeFilter} items`}
              </p>
              {categories.length > 0 && (
                <div className='mt-3 flex justify-center'>
                  <div className='relative inline-block w-64'>
                    <select
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value)}
                      className='w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 pr-10 text-sm font-semibold text-gray-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2'
                      style={{ '--tw-ring-color': 'var(--primary-500)' }}
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
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Leaderboard grid - desktop optimized for many items */}
        {items.length === 0 ? (
          <div className='bg-white rounded-xl shadow-xl border border-gray-200'>
            <div className='px-6 py-12 text-center'>
              <p className='text-lg text-gray-600'>No open items available.</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className='bg-white rounded-xl shadow-xl border border-gray-200'>
            <div className='px-6 py-12 text-center'>
              <p className='text-lg text-gray-600'>No items in this category.</p>
            </div>
          </div>
        ) : (
          <div className='grid gap-3 lg:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'>
            {filteredItems.map((item, index) => {
              const state = itemStates[item.id] || {};
              return (
                <LeaderboardItem
                  key={item.id}
                  item={item}
                  topBid={topBids[item.id] || null}
                  bidCount={bidCounts[item.id] || 0}
                  isHot={state.isHot}
                  hasBiddingWar={state.hasBiddingWar}
                  leaderChanged={state.leaderChanged}
                  positionChanged={state.positionChanged}
                  movedUp={state.movedUp}
                  currentPosition={state.currentPosition}
                  previousPosition={state.previousPosition}
                  priority={index < 12}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Mobile View */}
      <main className='md:hidden w-full min-h-screen px-2 py-2 bg-gray-50'>
        {/* Header - mobile */}
        <section className='mb-3'>
          <div className='bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden'>
            <div className='px-3 py-3 text-center'>
              <h1
                className='text-xl font-bold mb-1'
                style={{ color: 'var(--primary-500)' }}
              >
                🏆 Live Leaderboard
              </h1>
              <p className='text-xs text-gray-600'>
                {activeFilter === ALL_CATEGORIES
                  ? 'Current leaders for all auction items'
                  : `Showing ${activeFilter} items`}
              </p>
              {categories.length > 0 && (
                <div className='mt-2 flex justify-center'>
                  <div className='relative inline-block w-full'>
                    <select
                      value={activeFilter}
                      onChange={(e) => setActiveFilter(e.target.value)}
                      className='w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-xs font-semibold text-gray-700 shadow-sm focus:border-transparent focus:outline-none focus:ring-2'
                      style={{ '--tw-ring-color': 'var(--primary-500)' }}
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
                    <div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
                      <svg
                        className='h-3.5 w-3.5 text-gray-500'
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
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Leaderboard grid - mobile compact */}
        {items.length === 0 ? (
          <div className='bg-white rounded-lg shadow-md border border-gray-200'>
            <div className='px-4 py-8 text-center'>
              <p className='text-sm text-gray-600'>No open items available.</p>
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className='bg-white rounded-lg shadow-md border border-gray-200'>
            <div className='px-4 py-8 text-center'>
              <p className='text-sm text-gray-600'>No items in this category.</p>
            </div>
          </div>
        ) : (
          <div className='grid gap-2 grid-cols-1'>
            {filteredItems.map((item, index) => {
              const state = itemStates[item.id] || {};
              return (
                <LeaderboardItem
                  key={item.id}
                  item={item}
                  topBid={topBids[item.id] || null}
                  bidCount={bidCounts[item.id] || 0}
                  isHot={state.isHot}
                  hasBiddingWar={state.hasBiddingWar}
                  leaderChanged={state.leaderChanged}
                  positionChanged={state.positionChanged}
                  movedUp={state.movedUp}
                  currentPosition={state.currentPosition}
                  previousPosition={state.previousPosition}
                  priority={index < 4}
                />
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}

