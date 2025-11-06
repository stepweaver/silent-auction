'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import BidForm from '@/components/BidForm';
import AliasAvatar from '@/components/AliasAvatar';
import { formatDollar } from '@/lib/money';

const ENROLLMENT_KEY = 'auction_enrolled';

export default function ItemPage({ params }) {
  const router = useRouter();
  const s = supabaseBrowser();
  const { slug } = use(params);
  const [item, setItem] = useState(null);
  const [settings, setSettings] = useState(null);
  const [bids, setBids] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [bidsHash, setBidsHash] = useState(null); // Store hash of bids to detect changes

  async function loadAll() {
    try {
      const { data: itemData, error: itemError } = await s
        .from('item_leaders')
        .select('*')
        .eq('slug', slug)
        .single();

      if (itemError) throw itemError;
      if (!itemData) return;

      setItem(itemData);

      const { data: bidsData, error: bidsError } = await s
        .from('bids')
        .select('*')
        .eq('item_id', itemData.id)
        .order('amount', { ascending: false });

      if (bidsError) throw bidsError;

      // Fetch aliases for bids that have alias_id
      const aliasIds = (bidsData || [])
        .map(bid => bid.alias_id)
        .filter(id => id !== null);

      let aliasesMap = {};
      if (aliasIds.length > 0) {
        const { data: aliasesData, error: aliasesError } = await s
          .from('user_aliases')
          .select('id, alias, color, animal')
          .in('id', aliasIds);

        if (aliasesError) {
          console.error('Error fetching aliases:', aliasesError);
        } else if (aliasesData) {
          // Create a map of alias_id to alias data
          aliasesMap = aliasesData.reduce((acc, alias) => {
            acc[alias.id] = alias;
            return acc;
          }, {});
        }
      }

      // Join aliases with bids
      const bidsWithAliases = (bidsData || []).map(bid => ({
        ...bid,
        user_aliases: bid.alias_id ? aliasesMap[bid.alias_id] : null,
      }));

      // Create hash to detect changes (only update if data actually changed)
      const newHash = bidsWithAliases.map(b => 
        `${b.id}-${b.amount}-${b.alias_id}`
      ).join('|');
      
      // Only update state if data changed (or if this is first load)
      if (!bidsHash || newHash !== bidsHash) {
        setBids(bidsWithAliases);
        setBidsHash(newHash);
      }

      const { data: settingsData, error: settingsError } = await s
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (settingsError) throw settingsError;
      setSettings(settingsData);
    } catch (err) {
      console.error('Error loading data:', err);
      setMsg('Error loading item data');
    } finally {
      setLoading(false);
    }
  }

  // Check enrollment status
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled !== 'true') {
        // Store the intended destination for after enrollment
        localStorage.setItem('auction_redirect', `/i/${slug}`);
        router.push('/landing');
        return;
      }
      setCheckingEnrollment(false);
    }
  }, [router, slug]);

  useEffect(() => {
    if (!slug || checkingEnrollment) return;
    loadAll();

    // Set up real-time subscription
    const channel = s
      .channel('rt-bids-item')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
        loadAll();
      })
      .subscribe();

    // Set up polling as backup (refresh every 10 seconds to reduce mobile data usage)
    // Only poll when page is visible
    let isPageVisible = true;
    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const pollInterval = setInterval(() => {
      if (isPageVisible && !document.hidden) {
        loadAll();
      }
    }, 10000); // 10 seconds instead of 5 to reduce mobile data usage

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      s.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [slug, checkingEnrollment]);

  async function handleBidSubmit(data) {
    setMsg('');
    try {
      const res = await fetch('/api/bid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(text || 'Error placing bid');
        
        // If avatar is missing, redirect to landing page
        if (text && (text.includes('create an avatar') || text.includes('avatar must have a name'))) {
          setTimeout(() => {
            router.push('/landing');
          }, 2000);
        }
        return;
      }

      setMsg('Bid placed!');
      await loadAll();
    } catch (err) {
      setMsg('Error placing bid');
      console.error(err);
    }
  }


  if (checkingEnrollment || loading) {
    return (
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: '#00b140' }}></div>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200">
          <div className="px-4 sm:px-6 py-16 text-center">
            <p className="text-sm sm:text-base text-gray-600 mb-4">Item not found.</p>
            <Link 
              href="/" 
              className="inline-block px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: '#00b140' }}
            >
              ← Back to catalog
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const now = new Date();
  const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;
  const closed = item.is_closed || (deadline && now >= deadline);

  const current = Number(item.current_high_bid ?? item.start_price);
  const hasBids = Array.isArray(bids) && bids.length > 0;
  const nextMin = hasBids ? (current + 1) : Number(item.start_price); // Fixed $1 increment
  const winner = bids?.[0];

  return (
    <main className="w-full px-4 py-4 pb-8">
      <div className="max-w-5xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-gray-600 active:text-gray-900 font-medium mb-4 transition-colors touch-manipulation"
          style={{ minHeight: '44px' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to catalog
        </Link>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <figure className="bg-gray-100">
              {item.photo_url ? (
                <img src={item.photo_url} alt={item.title} className="w-full object-contain max-h-[28rem] p-4" />
              ) : (
                <div className="w-full h-64 grid place-items-center text-gray-400">
                  <span className="text-sm">No photo</span>
                </div>
              )}
            </figure>
          </div>

          <div className="flex flex-col gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
                {item.description && <p className="text-sm text-gray-600 leading-relaxed mt-2">{item.description}</p>}

                {!closed ? (
                  <>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="text-xs font-semibold text-gray-600 mb-1">Current Bid</div>
                        <div className="text-2xl font-bold" style={{ color: '#00b140' }}>{formatDollar(current)}</div>
                      </div>
                      <div 
                        className="rounded-lg p-3 border"
                        style={{ 
                          backgroundColor: 'rgba(0, 177, 64, 0.05)',
                          borderColor: 'rgba(0, 177, 64, 0.2)'
                        }}
                      >
                        <div className="text-xs font-semibold text-gray-600 mb-1">Next Minimum</div>
                        <div className="text-2xl font-bold text-gray-900">{formatDollar(nextMin)}</div>
                      </div>
                    </div>
                    {!hasBids && (
                      <div 
                        className="mt-3 rounded-lg p-3 border text-xs"
                        style={{ 
                          backgroundColor: 'rgba(59, 130, 246, 0.05)',
                          borderColor: 'rgba(59, 130, 246, 0.2)',
                          color: '#1e40af'
                        }}
                      >
                        Starting bid
                      </div>
                    )}
                    <div className="mt-4">
                      <BidForm
                        slug={slug}
                        itemId={item.id}
                        nextMin={nextMin}
                        deadline={settings?.auction_deadline}
                        onSubmit={handleBidSubmit}
                        message={msg}
                      />
                    </div>
                  </>
                ) : (
                  <div 
                    className="mt-4 rounded-lg p-4 border"
                    style={{ 
                      backgroundColor: 'rgba(245, 158, 11, 0.05)',
                      borderColor: 'rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    <h3 className="font-bold text-sm sm:text-base mb-2" style={{ color: '#d97706' }}>Bidding Closed</h3>
                    {winner ? (
                      <div className="space-y-2">
                        <p className="text-xs sm:text-sm text-gray-700">Winning bid: <span className="font-bold">{formatDollar(winner.amount)}</span></p>
                        {winner.user_aliases ? (
                          <div className="flex items-center gap-2 mt-2">
                            <AliasAvatar
                              alias={winner.user_aliases.alias}
                              color={winner.user_aliases.color}
                              animal={winner.user_aliases.animal}
                              size="sm"
                            />
                            <span className="font-semibold text-xs sm:text-sm">{winner.user_aliases.alias}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-gray-700">No bids were placed.</p>
                    )}
                    <div className="mt-3 text-xs space-y-1 text-gray-700">
                      <p><b>Payment:</b> {settings?.payment_instructions || 'See checkout table.'}</p>
                      <p><b>Pickup:</b> {settings?.pickup_instructions || 'See gym stage.'}</p>
                      {settings?.contact_email && (
                        <p className="mt-1">Questions: {settings?.contact_email}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">Top Bids</h2>
                <div className="h-px bg-gray-200 mb-3"></div>
                {bids.length > 0 ? (
                  <div className="space-y-2">
                    {bids.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {b.user_aliases ? (
                            <>
                              <AliasAvatar
                                alias={b.user_aliases.alias}
                                color={b.user_aliases.color}
                                animal={b.user_aliases.animal}
                                size="sm"
                              />
                              <span className="font-semibold text-xs sm:text-sm">{b.user_aliases.alias}</span>
                            </>
                          ) : (
                            <span className="text-xs sm:text-sm text-gray-600">
                              {b.bidder_name || 'Anonymous'}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-sm sm:text-base" style={{ color: '#00b140' }}>{formatDollar(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs sm:text-sm text-gray-500">
                    No bids yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
