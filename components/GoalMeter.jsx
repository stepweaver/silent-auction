'use client';

import { supabaseBrowser } from '@/lib/supabaseClient';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Trophy, PartyPopper } from 'lucide-react';

const GOAL_AMOUNT = 10_000;

function fireConfetti() {
  return import('canvas-confetti').then((mod) => {
    const confetti = mod.default;
    const duration = 4000;
    const end = Date.now() + duration;

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#047857', '#b45309', '#FFD700', '#10b981', '#f59e0b'],
    });

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ['#047857', '#b45309', '#FFD700'],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ['#047857', '#b45309', '#FFD700'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  });
}

export default function GoalMeter() {
  const [bidTotal, setBidTotal] = useState(0);
  const [donationTotal, setDonationTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [goalJustReached, setGoalJustReached] = useState(false);
  const hasAnimatedRef = useRef(false);
  const s = supabaseBrowser();

  const totalRaised = bidTotal + donationTotal;
  const progress = Math.min((totalRaised / GOAL_AMOUNT) * 100, 100);
  const goalReached = totalRaised >= GOAL_AMOUNT;

  const fetchTotals = useCallback(async () => {
    try {
      const { data: items, error: itemsError } = await s
        .from('item_leaders')
        .select('current_high_bid');
      if (itemsError) throw itemsError;

      const bids = (items || []).reduce(
        (sum, item) => sum + Number(item.current_high_bid || 0),
        0
      );

      const { data: donations, error: donationsError } = await s
        .from('donations')
        .select('amount');
      if (donationsError) throw donationsError;

      const dons = (donations || []).reduce(
        (sum, d) => sum + Number(d.amount || 0),
        0
      );

      setBidTotal(bids);
      setDonationTotal(dons);
    } catch (err) {
      console.error('Error fetching goal progress:', err);
    } finally {
      setLoading(false);
    }
  }, [s]);

  // Auto-fire confetti on first load when goal is already reached
  useEffect(() => {
    if (goalReached && !hasAnimatedRef.current && !loading) {
      hasAnimatedRef.current = true;
      setGoalJustReached(true);
      fireConfetti();
    }
  }, [goalReached, loading]);

  // Data fetching & real-time subscriptions
  useEffect(() => {
    fetchTotals();

    const bidsChannel = s
      .channel('goal-bids')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bids' },
        () => fetchTotals()
      )
      .subscribe();

    const donationsChannel = s
      .channel('goal-donations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        () => fetchTotals()
      )
      .subscribe();

    return () => {
      s.removeChannel(bidsChannel);
      s.removeChannel(donationsChannel);
    };
  }, [fetchTotals, s]);

  if (loading) {
    return (
      <div className='mb-3 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm'>
        <div className='h-4 animate-pulse rounded bg-gray-100' />
      </div>
    );
  }

  const fmt = (n) =>
    n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  return (
    <div
      className={`mb-3 rounded-lg border px-3 py-2 shadow-sm transition-all duration-700 ${
        goalReached
          ? 'goal-meter-card-gold border-yellow-300'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className='flex items-center gap-3'>
        {/* Label + amount */}
        <div className='flex items-center gap-1.5 shrink-0'>
          {goalReached ? (
            <Trophy className='w-4 h-4 text-amber-500 goal-trophy-bounce' />
          ) : (
            <span
              className='text-xs font-semibold'
              style={{ color: 'var(--primary-600)' }}
            >
              Goal
            </span>
          )}
          <span
            className={`text-sm font-bold tabular-nums ${
              goalReached ? 'text-amber-700' : ''
            }`}
            style={!goalReached ? { color: 'var(--primary-600)' } : {}}
          >
            ${fmt(totalRaised)}
          </span>
          <span className='text-xs text-gray-400'>/ ${fmt(GOAL_AMOUNT)}</span>
        </div>

        {/* Progress bar */}
        <div className='relative flex-1 h-3 rounded-full bg-gray-100 overflow-hidden'>
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${
              goalReached ? 'goal-bar-rainbow' : 'goal-bar-green'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Celebrate button (only when goal reached) */}
        {goalReached && (
          <button
            type='button'
            onClick={fireConfetti}
            className='inline-flex items-center gap-1 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white active:scale-95 transition-transform goal-celebrate-btn'
          >
            <PartyPopper className='w-3 h-3' />
            Celebrate!
          </button>
        )}
      </div>
    </div>
  );
}
