'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: 'var(--primary-500)' }}></div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-4 sm:py-6 pb-8 sm:pb-10">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1" style={{ color: 'var(--primary-500)' }}>Your Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Manage your avatar and track your bids
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity shadow-sm"
              style={{ backgroundColor: 'var(--primary-500)' }}
            >
              <span>🛍️</span>
              <span>Browse Catalog</span>
            </Link>
            <Link
              href="/how-to-bid"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border-2 hover:opacity-90 transition-opacity"
              style={{ 
                backgroundColor: 'white',
                borderColor: 'var(--primary-500)',
                color: 'var(--primary-500)'
              }}
            >
              <span>📖</span>
              <span>How to Bid</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Avatar Info Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">Your Avatar</h2>
              
              {userAlias ? (
                <div className="space-y-3 sm:space-y-4">
                  <div 
                    className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-lg border"
                    style={{ 
                      backgroundColor: 'rgba(0, 177, 64, 0.05)',
                      borderColor: 'rgba(0, 177, 64, 0.2)'
                    }}
                  >
                    <AliasAvatar
                      alias={userAlias.alias}
                      color={userAlias.color}
                      animal={userAlias.animal}
                      size="md"
                    />
                    <div className="mt-3 text-center">
                      <div className="text-base sm:text-lg font-bold text-gray-900 mb-0.5">
                        {userAlias.alias}
                      </div>
                      <div className="text-xs text-gray-600">
                        This is how others see your bids
                      </div>
                    </div>
                  </div>

                  <div 
                    className="rounded-lg p-3 border"
                    style={{ 
                      backgroundColor: 'rgba(59, 130, 246, 0.05)',
                      borderColor: 'rgba(59, 130, 246, 0.2)'
                    }}
                  >
                    <div className="text-xs text-gray-700">
                      <p className="font-semibold mb-1.5 text-sm">Avatar Details:</p>
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
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-400">?</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">No avatar yet.</p>
                  <Link 
                    href="/landing" 
                    className="inline-block px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-500)' }}
                  >
                    Create Avatar
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bids Section */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">Your Bids</h2>
                <div className="flex items-center gap-2">
                  {lastUpdated && (
                    <span className="text-xs text-gray-500">
                      Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={() => email && loadUserBids(email)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                    disabled={bidsLoading}
                    title="Refresh bids"
                  >
                    {bidsLoading ? (
                      <svg className="animate-spin h-4 w-4" style={{ color: 'var(--primary-500)' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span className="text-base">🔄</span>
                    )}
                  </button>
                </div>
              </div>
              
              {bidsLoading && bids.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-3 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: 'var(--primary-500)' }}></div>
                </div>
              ) : bids.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xl">📦</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">You haven't placed any bids yet.</p>
                  <Link 
                    href="/" 
                    className="inline-block px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white"
                    style={{ backgroundColor: 'var(--primary-500)' }}
                  >
                    Browse Catalog
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
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

                    const allBids = Object.values(bidsByItem);

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
                        className={`border-2 rounded-lg p-3 sm:p-4 ${
                          isOutbid
                            ? 'border-red-200'
                            : isWinning
                            ? 'border-green-200'
                            : 'border-gray-200'
                        }`}
                        style={isOutbid ? {
                          backgroundColor: 'rgba(239, 68, 68, 0.05)'
                        } : isWinning ? {
                          backgroundColor: 'rgba(0, 177, 64, 0.05)'
                        } : {
                          backgroundColor: '#f9fafb'
                        }}
                      >
                        <div className="flex flex-col gap-3 sm:gap-4">
                          {/* Item Info */}
                          <div className="flex-1">
                            <div className="flex items-start gap-2 sm:gap-3">
                              {item.photo_url && (
                                <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0">
                                  <Image
                                    src={item.photo_url}
                                    alt={item.title}
                                    fill
                                    sizes="64px"
                                    className="rounded-lg object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/i/${item.slug}`}
                                  className="font-bold text-sm sm:text-base text-gray-900 hover:underline transition-colors block mb-1"
                                  style={{ color: 'var(--primary-500)' }}
                                >
                                  {item.title}
                                </Link>
                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                  <span 
                                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                                    style={{ backgroundColor: 'var(--primary-500)' }}
                                  >
                                    Your bid: {formatDollar(bid.amount)}
                                  </span>
                                  {isWinner && (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                      style={{ backgroundColor: '#10b981' }}
                                    >
                                      <span className="text-xs">🏆</span>
                                      Winner
                                    </span>
                                  )}
                                  {!isWinner && isOutbid && (
                                    <span 
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                      style={{ backgroundColor: '#ef4444' }}
                                    >
                                      Outbid
                                    </span>
                                  )}
                                  {!isWinner && !isOutbid && isWinning && (
                                    <span 
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                      style={{ backgroundColor: '#10b981' }}
                                    >
                                      Leading
                                    </span>
                                  )}
                                  {!isWinner && !isOutbid && !isWinning && isClosed && (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                      style={{ backgroundColor: 'var(--accent-warm-500)' }}
                                    >
                                      <span className="text-xs">🔒</span>
                                      Closed
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Current high: {formatDollar(bid.current_high_bid)}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Placed {new Date(bid.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Payment Instructions for Winners */}
                          {isWinner && (
                            <div className="sm:w-48 flex-shrink-0">
                              <div 
                                className="rounded-lg p-3 sm:p-4 border"
                                style={{ 
                                  backgroundColor: 'rgba(0, 177, 64, 0.05)',
                                  borderColor: 'rgba(0, 177, 64, 0.2)'
                                }}
                              >
                                <div className="text-center mb-3">
                                  <div className="text-2xl mb-1.5">🏆</div>
                                  <h3 className="font-bold text-sm sm:text-base mb-1" style={{ color: '#10b981' }}>You Won!</h3>
                                  <p className="text-xs text-gray-600 mt-1">
                                    Winning bid: {formatDollar(bid.amount)}
                                  </p>
                                </div>
                                <Link
                                  href="/payment-instructions"
                                  className="block w-full px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white text-center mb-2"
                                  style={{ backgroundColor: '#10b981' }}
                                >
                                  Payment Instructions →
                                </Link>
                              </div>
                              <Link
                                href={`/i/${item.slug}`}
                                className="block w-full px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 text-center border border-gray-300 hover:bg-gray-50 transition-colors"
                              >
                                View Item →
                              </Link>
                            </div>
                          )}

                          {/* Bid Form */}
                          {!isClosed && !isWinner && (
                            <div className="sm:w-48 flex-shrink-0">
                              {isWinning ? (
                                <div className="space-y-2 opacity-50 pointer-events-none">
                                  <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Bid Amount</label>
                                    <div className="relative">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">$</span>
                                      <input
                                        type="text"
                                        className="w-full px-2 pl-6 py-1.5 border-2 border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-xs"
                                        placeholder="You're leading!"
                                        disabled
                                      />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">You have the highest bid</p>
                                  </div>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-white opacity-50 cursor-not-allowed"
                                    style={{ backgroundColor: 'var(--primary-500)' }}
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
                                className="block w-full px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 text-center border border-gray-300 hover:bg-gray-50 transition-colors mt-2"
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
