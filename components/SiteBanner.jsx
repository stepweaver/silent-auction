'use client';

import { useEffect, useMemo, useState } from 'react';

export default function SiteBanner({ deadlineISO = null }) {
  const [now, setNow] = useState(null);

  const deadline = useMemo(() => {
    if (!deadlineISO) {
      return null;
    }

    const parsed = new Date(deadlineISO);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [deadlineISO]);

  useEffect(() => {
    if (!deadline) {
      return undefined;
    }

    const updateNow = () => setNow(new Date());

    updateNow();

    if (deadline <= new Date()) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      const current = new Date();
      setNow(current);
      if (current >= deadline) {
        window.clearInterval(intervalId);
      }
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [deadline]);

  if (!deadline) {
    return null;
  }

  const hasHydrated = now !== null;
  const isClosed = hasHydrated && now >= deadline;

  const message = (() => {
    if (!hasHydrated) {
      return 'Countdown updating...';
    }

    if (isClosed) {
      const timeFormatter = new Intl.DateTimeFormat(undefined, {
        timeStyle: 'short',
      });
      const dateFormatter = new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
      });

      return `Closed ${dateFormatter.format(deadline)} ${timeFormatter.format(
        deadline
      )}`;
    }

    const msRemaining = Math.max(0, deadline.getTime() - now.getTime());
    const totalSeconds = Math.floor(msRemaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];

    if (days > 0) {
      parts.push(`${days}d`);
    }

    parts.push(
      `${hours.toString().padStart(2, '0')}h`,
      `${minutes.toString().padStart(2, '0')}m`,
      `${seconds.toString().padStart(2, '0')}s`
    );

    return `Closes in ${parts.join(' ')}`;
  })();

  return (
    <section className='no-print px-3 sm:px-4 mt-3 sm:mt-4' aria-live='polite'>
      <div className='max-w-5xl mx-auto'>
        <div
          className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-medium shadow-sm ${
            isClosed
              ? 'border-amber-200/70 bg-amber-50 text-amber-900'
              : 'border-emerald-200/70 bg-emerald-50 text-emerald-900'
          }`}
          role='status'
        >
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] sm:text-xs font-semibold tracking-wide ${
              isClosed
                ? 'bg-amber-100 text-amber-900'
                : 'bg-emerald-100 text-emerald-900'
            }`}
          >
            {isClosed ? 'Auction Closed' : 'Auction Countdown'}
          </span>
          <span className='flex-1 min-w-0 whitespace-nowrap'>{message}</span>
        </div>
      </div>
    </section>
  );
}
