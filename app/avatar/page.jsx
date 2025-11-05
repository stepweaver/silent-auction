'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AliasAvatar from '@/components/AliasAvatar';
import DashboardBidForm from '@/components/DashboardBidForm';
import { formatDollar } from '@/lib/money';

const STORAGE_KEY = 'auction_bidder_info';
const ENROLLMENT_KEY = 'auction_enrolled';

export default function DashboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [userAlias, setUserAlias] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [bidsHash, setBidsHash] = useState(null); // Store hash of bids to detect changes

  useEffect(() => {
    // Check enrollment
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled !== 'true') {
        router.push('/landing');
        return;
      }

      // Load existing alias
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setEmail(parsed.email || '');
          
          // Check if alias exists in database
          if (parsed.email) {
            checkExistingAlias(parsed.email);
            loadUserBids(parsed.email);
          } else {
            setLoading(false);
          }
        } catch (e) {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
  }, [router]);

  const checkExistingAlias = async (emailToCheck) => {
    try {
      const response = await fetch('/api/alias/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToCheck }),
      });

      const data = await response.json();
      if (data.alias) {
        setUserAlias(data.alias);
      }
    } catch (err) {
      console.error('Error checking alias:', err);
    } finally {
      setLoading(false);
    }
  };

  // Simple hash function to detect changes
  const hashBids = (bidsArray) => {
    if (!bidsArray || bidsArray.length === 0) return '';
    // Create hash from bid IDs, amounts, and current_high_bid values
    return bidsArray.map(b => 
      `${b.id}-${b.amount}-${b.current_high_bid}-${b.is_outbid}-${b.items?.is_closed}`
    ).join('|');
  };

  const loadUserBids = async (emailToLoad, skipIfUnchanged = false, silent = false) => {
    if (!emailToLoad) return;
    
    // Only show loading spinner if not silent (manual refresh)
    if (!silent) {
      setBidsLoading(true);
    }
    
    try {
      const response = await fetch('/api/bid/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToLoad }),
      });

      const data = await response.json();
      if (data.bids) {
        const newHash = hashBids(data.bids);
        
        // Only update if data actually changed (or if not checking)
        if (!skipIfUnchanged || newHash !== bidsHash) {
          setBids(data.bids);
          setBidsHash(newHash);
          setLastUpdated(new Date());
        }
      }
    } catch (err) {
      console.error('Error loading bids:', err);
    } finally {
      if (!silent) {
        setBidsLoading(false);
      }
    }
  };

  const handleBidPlaced = () => {
    // Reload bids after placing a bid
    if (email) {
      loadUserBids(email);
    }
  };

  // Set up automatic polling to refresh bids (optimized for mobile)
  useEffect(() => {
    if (!email) return;

    let pollInterval;
    let isPageVisible = true;

    // Handle page visibility to pause polling when tab is hidden
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial load
    loadUserBids(email);

    // Set up polling (refresh every 10 seconds to reduce mobile data usage and server load)
    // Only poll when page is visible, and only update if data changed
    // Silent = true means no loading spinner, just quietly update data
    const startPolling = () => {
      pollInterval = setInterval(() => {
        if (isPageVisible && !document.hidden) {
          loadUserBids(email, true, true); // skipIfUnchanged=true, silent=true
        }
      }, 10000); // 10 seconds instead of 5 to reduce mobile data usage
    };

    startPolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [email]);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <div className="text-sm breadcrumbs mb-4">
          <ul>
            <li><Link href="/">Catalog</Link></li>
            <li>Dashboard</li>
          </ul>
        </div>
        <h1 className="text-4xl font-bold text-primary mb-2">Your Dashboard</h1>
        <p className="text-base-content/70 text-lg">
          Manage your avatar and track your bids
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Avatar Info Section */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-xl mb-4">Your Avatar</h2>
              
              {userAlias ? (
                <div className="space-y-4">
                  <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl">
                    <AliasAvatar
                      alias={userAlias.alias}
                      color={userAlias.color}
                      animal={userAlias.animal}
                      size="lg"
                    />
                    <div className="mt-4 text-center">
                      <div className="text-xl font-bold text-base-content mb-1">
                        {userAlias.alias}
                      </div>
                      <div className="text-xs text-base-content/70">
                        This is how others see your bids
                      </div>
                    </div>
                  </div>

                  <div className="bg-info/10 border border-info/30 rounded-xl p-3">
                    <div className="text-xs text-base-content/70">
                      <p className="font-semibold mb-2 text-sm">Avatar Details:</p>
                      <ul className="space-y-1">
                        <li>Email: <span className="font-semibold">{userAlias.email || email || 'N/A'}</span></li>
                        <li>Color: <span className="font-semibold">{userAlias.color || 'N/A'}</span></li>
                        <li>Emoji: <span className="font-semibold">{userAlias.animal || 'N/A'}</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-base-300 flex items-center justify-center">
                    <span className="text-2xl font-bold text-base-content/50">?</span>
                  </div>
                  <p className="text-sm text-base-content/70 mb-4">No avatar yet.</p>
                  <Link href="/landing" className="btn btn-primary btn-sm">
                    Create Avatar
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bids Section */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title text-xl">Your Bids</h2>
                <div className="flex items-center gap-2">
                  {lastUpdated && (
                    <span className="text-xs text-base-content/50">
                      Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={() => email && loadUserBids(email)}
                    className="btn btn-sm btn-ghost"
                    disabled={bidsLoading}
                    title="Refresh bids"
                  >
                    {bidsLoading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      '🔄'
                    )}
                  </button>
                </div>
              </div>
              
              {bidsLoading && bids.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : bids.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-base-300 flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                  <p className="text-base-content/70 mb-4">You haven't placed any bids yet.</p>
                  <Link href="/" className="btn btn-primary">
                    Browse Catalog
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    // Group bids by item_id and show only the highest bid per item
                    const bidsByItem = bids.reduce((acc, bid) => {
                      if (!bid.items) return acc;
                      const itemId = bid.items.id;
                      if (!acc[itemId]) {
                        acc[itemId] = bid;
                      } else {
                        // Keep the highest bid amount for this item
                        if (Number(bid.amount) > Number(acc[itemId].amount)) {
                          acc[itemId] = bid;
                        }
                      }
                      return acc;
                    }, {});

                    // Add test won item for testing
                    const testWonBid = {
                      id: 'test-won-bid',
                      amount: 50,
                      current_high_bid: 50,
                      is_outbid: false,
                      created_at: new Date().toISOString(),
                      items: {
                        id: 'test-item',
                        slug: 'test-item',
                        title: 'Test Won Item',
                        photo_url: null,
                        start_price: 25,
                        min_increment: 5,
                        is_closed: true,
                      },
                    };

                    const allBids = [...Object.values(bidsByItem), testWonBid];

                    return allBids.map((bid) => {
                    const item = bid.items;
                    if (!item) return null;

                    const isClosed = item.is_closed || false;
                    const bidAmount = Number(bid.amount);
                    // Use current_high_bid from API, fallback to item's current_high_bid or start_price
                    const currentHigh = Number(bid.current_high_bid || item.start_price || 0);
                    
                    // Calculate status: outbid if bid is less than current high, winning if equal or greater
                    // Use API's is_outbid if available, otherwise calculate it
                    const apiIsOutbid = bid.is_outbid !== undefined ? bid.is_outbid : (bidAmount < currentHigh);
                    
                    // Winner: closed AND not outbid AND bid matches current high (user has winning bid)
                    const isWinner = isClosed && !apiIsOutbid && bidAmount >= currentHigh;
                    // Outbid: not closed AND outbid
                    const isOutbid = !isClosed && apiIsOutbid;
                    // Leading: not closed AND not outbid AND bid matches/beats current high
                    const isWinning = !isClosed && !apiIsOutbid && bidAmount >= currentHigh;

                    return (
                      <div
                        key={bid.id}
                        className={`border-2 rounded-xl p-4 ${
                          isOutbid
                            ? 'border-error/30 bg-error/5'
                            : isWinning
                            ? 'border-success/30 bg-success/5'
                            : 'border-base-300 bg-base-50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row gap-4">
                          {/* Item Info */}
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              {item.photo_url && (
                                <img
                                  src={item.photo_url}
                                  alt={item.title}
                                  className="w-16 h-16 object-cover rounded-lg"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/i/${item.slug}`}
                                  className="font-bold text-lg hover:text-primary transition-colors"
                                >
                                  {item.title}
                                </Link>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="badge badge-primary badge-sm">
                                    Your bid: {formatDollar(bid.amount)}
                                  </span>
                                  {isWinner && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md bg-green-500 border border-green-400/50">
                                      <span className="text-sm">🏆</span>
                                      Winner
                                    </span>
                                  )}
                                  {!isWinner && isOutbid && (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md bg-red-500 border border-red-400/50">
                                      Outbid
                                    </span>
                                  )}
                                  {!isWinner && !isOutbid && isWinning && (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md bg-green-500 border border-green-400/50">
                                      Leading
                                    </span>
                                  )}
                                  {!isWinner && !isOutbid && !isWinning && isClosed && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-md bg-amber-500 border border-amber-400/50">
                                      <span className="text-sm">🔒</span>
                                      Closed
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-base-content/70 mt-1">
                                  Current high: {formatDollar(bid.current_high_bid)}
                                </div>
                                <div className="text-xs text-base-content/50 mt-1">
                                  Placed {new Date(bid.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Payment Instructions for Winners */}
                          {isWinner && (
                            <div className="sm:w-48 flex-shrink-0">
                              <div className="bg-success/10 border-2 border-success/30 rounded-xl p-4">
                                <div className="text-center mb-3">
                                  <div className="text-3xl mb-2">🏆</div>
                                  <h3 className="font-bold text-success">You Won!</h3>
                                  <p className="text-xs text-base-content/70 mt-1">
                                    Winning bid: {formatDollar(bid.amount)}
                                  </p>
                                </div>
                                <Link
                                  href="/payment-instructions"
                                  className="btn btn-success btn-sm w-full"
                                >
                                  Payment Instructions →
                                </Link>
                              </div>
                              <Link
                                href={`/i/${item.slug}`}
                                className="btn btn-ghost btn-sm w-full mt-2"
                              >
                                View Item →
                              </Link>
                            </div>
                          )}

                          {/* Bid Form */}
                          {!isClosed && !isWinner && (
                            <div className="sm:w-48 flex-shrink-0">
                              {isWinning ? (
                                <div className="space-y-3 opacity-50 pointer-events-none">
                                  <div className="form-control">
                                    <label className="label pb-1">
                                      <span className="label-text text-xs font-semibold">Bid Amount</span>
                                    </label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/30 font-semibold text-sm">$</span>
                                      <input
                                        type="text"
                                        className="input input-bordered input-sm w-full pl-7 border-2 bg-base-200 cursor-not-allowed"
                                        placeholder="You're leading!"
                                        disabled
                                      />
                                    </div>
                                    <label className="label pt-1">
                                      <span className="label-text-alt text-xs text-base-content/50">You have the highest bid</span>
                                    </label>
                                  </div>
                                  <button
                                    type="button"
                                    className="btn btn-primary btn-sm w-full opacity-50 cursor-not-allowed"
                                    disabled
                                  >
                                    Place Bid
                                  </button>
                                </div>
                              ) : (
                                <DashboardBidForm
                                  item={{
                                    ...item,
                                    current_high_bid: bid.current_high_bid,
                                  }}
                                  userAlias={userAlias}
                                  email={email}
                                  onBidPlaced={handleBidPlaced}
                                />
                              )}
                              <Link
                                href={`/i/${item.slug}`}
                                className="btn btn-ghost btn-sm w-full mt-2"
                              >
                                View Item →
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                    });
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
