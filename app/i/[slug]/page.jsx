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
        // Select alias fields
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
          
          // Log if any alias_ids weren't found (data integrity issue)
          const foundIds = new Set(aliasesData.map(a => a.id));
          const missingIds = aliasIds.filter(id => !foundIds.has(id));
          if (missingIds.length > 0) {
            console.warn(`[Item Page] Missing aliases for alias_ids: ${missingIds.join(', ')} on item ${itemData.id}`);
          }
        }
      }

      // For bids missing aliases, try email-based fallback lookup
      const bidsMissingAliases = (bidsData || []).filter(
        bid => bid.alias_id && !aliasesMap[bid.alias_id] && bid.email
      );

      // Batch lookup aliases by email for missing ones
      let emailAliasesMap = {};
      if (bidsMissingAliases.length > 0) {
        const missingEmails = [...new Set(bidsMissingAliases.map(bid => bid.email))];
        const { data: emailAliasesData } = await s
          .from('user_aliases')
          .select('id, alias, color, animal, email')
          .in('email', missingEmails);

        if (emailAliasesData) {
          emailAliasesMap = emailAliasesData.reduce((acc, alias) => {
            acc[alias.email] = alias;
            return acc;
          }, {});
          
          // Log recovery for monitoring
          if (emailAliasesData.length > 0) {
            console.warn(`[Item Page] Recovered ${emailAliasesData.length} aliases by email lookup for item ${itemData.id}`);
          }
        }
      }

      // Join aliases with bids
      const bidsWithAliases = (bidsData || []).map(bid => {
        let bidAlias = bid.alias_id ? aliasesMap[bid.alias_id] : null;
        
        // Fallback: If alias_id lookup failed, try email lookup
        if (!bidAlias && bid.email && emailAliasesMap[bid.email]) {
          bidAlias = emailAliasesMap[bid.email];
        }
        
        return {
          ...bid,
          user_aliases: bidAlias,
        };
      });

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

    // Real-time only: subscription handles bid updates; no polling to reduce Supabase egress
    const channel = s
      .channel('rt-bids-item')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => {
        loadAll();
      })
      .subscribe();

    return () => {
      s.removeChannel(channel);
    };
  }, [slug, checkingEnrollment]);

  async function handleBidSubmit(data) {
    setMsg('');
    try {
      const { getJsonHeadersWithCsrf } = await import('@/lib/clientCsrf');
      const headers = await getJsonHeadersWithCsrf();
      const res = await fetch('/api/bid', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        const errMsg = isJson ? (await res.json()).error : await res.text();
        const text = errMsg || 'Error placing bid';
        setMsg(text);
        if (text && (text.includes('create an avatar') || text.includes('avatar must have a name'))) {
          setTimeout(() => router.push('/landing'), 2000);
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
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: 'var(--primary-500)' }}></div>
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
              style={{ backgroundColor: 'var(--primary-500)' }}
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
  const auctionStart = settings?.auction_start ? new Date(settings.auction_start) : null;
  const deadlinePassed = deadline && now >= deadline;
  const notYetOpen = auctionStart && now < auctionStart;
  // auction_closed is the primary control - if auction is open, check item status
  const closed = settings?.auction_closed || deadlinePassed || item.is_closed;

  const hasBids = Array.isArray(bids) && bids.length > 0;
  const topBidAmount = hasBids && bids[0] ? Number(bids[0].amount) : null;
  const current = hasBids && topBidAmount ? topBidAmount : Number(item.start_price);
  const minIncrement = 5;
  const nextMin = hasBids ? (current + minIncrement) : Number(item.start_price);
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
              {(item.thumbnail_url || item.photo_url) ? (
                <div className="relative aspect-[4/3] w-full">
                  <img
                    src={item.thumbnail_url || item.photo_url}
                    alt={item.title}
                    width={800}
                    height={600}
                    className="w-full h-full object-contain p-2 sm:p-4"
                    loading="eager"
                    decoding="async"
                  />
                  {item.photo_url && item.thumbnail_url && (
                    <a
                      href={item.photo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute bottom-2 right-2 px-2 py-1.5 rounded text-xs font-medium bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      View full image
                    </a>
                  )}
                </div>
              ) : (
                <div className="relative aspect-[4/3] w-full bg-white flex items-center justify-center">
                  <img
                    src="/logo-with-glow.png"
                    alt={item.title}
                    width={400}
                    height={400}
                    className="object-contain p-6 sm:p-10 opacity-60 max-w-full max-h-full"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              )}
            </figure>
          </div>

          <div className="flex flex-col gap-4 sm:gap-6">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
                {item.description && <p className="text-sm text-gray-600 leading-relaxed mt-2">{item.description}</p>}

                {notYetOpen ? (
                  <div
                    className='mt-4 rounded-lg p-4 border'
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.05)',
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    <h3 className='font-bold text-sm sm:text-base mb-2' style={{ color: '#2563eb' }}>
                      Bidding Opens Soon
                    </h3>
                    <p className='text-xs sm:text-sm text-gray-700'>
                      All items open and bidding begins{' '}
                      {auctionStart.toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                      .
                    </p>
                  </div>
                ) : !closed ? (
                  <>
                    {hasBids ? (
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-semibold text-gray-600 mb-1">Current Bid</div>
                          <div className="text-2xl font-bold" style={{ color: 'var(--primary-500)' }}>{formatDollar(current)}</div>
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
                    ) : (
                      <div className="mt-4">
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="text-xs font-semibold text-gray-600 mb-1">Starting Bid</div>
                          <div className="text-2xl font-bold" style={{ color: 'var(--primary-500)' }}>{formatDollar(current)}</div>
                        </div>
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
                      <p><b>Payment:</b> {settings?.payment_instructions || 'Pay online using the official payment link provided in your winner email.'}</p>
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
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Top Bids</h2>
                <p className="text-xs text-gray-500 mb-3">Bidders shown by alias only; &quot;Anonymous Bidder&quot; when none.</p>
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
                              Anonymous Bidder
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-sm sm:text-base" style={{ color: 'var(--primary-500)' }}>{formatDollar(b.amount)}</span>
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
