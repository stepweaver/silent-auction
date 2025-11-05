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
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 bg-base-300">
        <div className="flex items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 bg-base-300">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center py-16">
            <p className="text-base-content/70 mb-4 text-lg">Item not found.</p>
            <Link href="/" className="btn btn-primary">
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
  const nextMin = hasBids ? (current + Number(item.min_increment)) : Number(item.start_price);
  const winner = bids?.[0];

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 bg-base-300">

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card bg-base-100 shadow-lg">
          <figure className="bg-base-200">
            {item.photo_url ? (
              <img src={item.photo_url} alt={item.title} className="w-full object-contain max-h-[28rem] p-4" />
            ) : (
              <div className="w-full h-64 grid place-items-center text-base-content/50">
                <span className="text-lg">No photo</span>
              </div>
            )}
          </figure>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h1 className="card-title text-2xl sm:text-3xl">{item.title}</h1>
              {item.description && <p className="text-base-content/70 leading-7 mt-2">{item.description}</p>}

              {!closed ? (
                <>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="stat bg-base-200 rounded-lg">
                      <div className="stat-title text-xs">Current Bid</div>
                      <div className="stat-value text-2xl text-primary">{formatDollar(current)}</div>
                    </div>
                    <div className="stat bg-primary/10 rounded-lg">
                      <div className="stat-title text-xs">Next Minimum</div>
                      <div className="stat-value text-2xl">{formatDollar(nextMin)}</div>
                    </div>
                  </div>
                  {!hasBids && (
                    <div className="alert alert-info">
                      <span>First bid sets the price.</span>
                    </div>
                  )}
                  <BidForm
                    slug={slug}
                    itemId={item.id}
                    nextMin={nextMin}
                    deadline={settings?.auction_deadline}
                    onSubmit={handleBidSubmit}
                    message={msg}
                  />
                </>
              ) : (
                <div className="alert alert-warning">
                  <div>
                    <h3 className="font-bold">Bidding Closed</h3>
                    {winner ? (
                      <div className="mt-2 space-y-1">
                        <p>Winning bid: <span className="font-bold">{formatDollar(winner.amount)}</span></p>
                        {winner.user_aliases ? (
                          <div className="flex items-center gap-2 mt-2">
                            <AliasAvatar
                              alias={winner.user_aliases.alias}
                              color={winner.user_aliases.color}
                              animal={winner.user_aliases.animal}
                              size="sm"
                            />
                            <span className="font-semibold">{winner.user_aliases.alias}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p>No bids were placed.</p>
                    )}
                    <div className="mt-3 text-sm space-y-1">
                      <p><b>Payment:</b> {settings?.payment_instructions || 'See checkout table.'}</p>
                      <p><b>Pickup:</b> {settings?.pickup_instructions || 'See gym stage.'}</p>
                      {settings?.contact_email && (
                        <p className="mt-1">Questions: {settings?.contact_email}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-xl">Top Bids</h2>
              <div className="divider"></div>
              {bids.length > 0 ? (
                <div className="space-y-2">
                  {bids.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 transition-colors">
                      <div className="flex items-center gap-3">
                        {b.user_aliases ? (
                          <>
                            <AliasAvatar
                              alias={b.user_aliases.alias}
                              color={b.user_aliases.color}
                              animal={b.user_aliases.animal}
                              size="sm"
                            />
                            <span className="font-semibold">{b.user_aliases.alias}</span>
                          </>
                        ) : (
                          <span className="text-base-content/70">
                            {b.bidder_name || 'Anonymous'}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-primary">{formatDollar(b.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-base-content/50">
                  No bids yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
