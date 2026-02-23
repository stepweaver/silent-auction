'use client';

import Link from 'next/link';
import AliasAvatar from '@/components/AliasAvatar';
import { formatDollar } from '@/lib/money';

/**
 * Single row in a "What's happening" panel: item title (link) + avatar, alias, price.
 */
function SummaryItemRow({ item, topBid }) {
  const aliasName = topBid?.user_aliases?.alias ?? 'Anonymous Bidder';
  return (
    <li className="rounded-md border border-gray-200 bg-gray-50/60 px-2 py-1.5 hover:bg-gray-50 flex items-start gap-2 min-w-0">
      <Link
        href={`/i/${item.slug}`}
        className="font-medium hover:underline text-sm sm:text-base flex-1 min-w-0 leading-snug"
        style={{ color: 'var(--primary-600)' }}
      >
        {item.title}
      </Link>
      <span className="flex items-center gap-1.5 flex-shrink-0 text-xs">
        {topBid?.user_aliases ? (
          <AliasAvatar
            alias={topBid.user_aliases.alias}
            color={topBid.user_aliases.color}
            animal={topBid.user_aliases.animal}
            size="sm"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium flex-shrink-0"
            aria-hidden
          >
            A
          </div>
        )}
        <span className="text-gray-700 whitespace-nowrap">{aliasName}</span>
        <span className="text-gray-800 font-semibold">
          {topBid ? formatDollar(topBid.amount) : '—'}
        </span>
      </span>
    </li>
  );
}

/**
 * One column in "What's happening": title (with optional icon) + list of summary rows.
 */
export default function LeaderboardSummaryPanel({
  title,
  icon,
  iconPulse = false,
  titleClassName,
  items,
  topBids,
}) {
  return (
    <div className="min-w-0">
      <h3
        className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${titleClassName || ''}`}
      >
        {icon && <span className={iconPulse ? 'animate-pulse' : ''}>{icon}</span>}
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <SummaryItemRow key={item.id} item={item} topBid={topBids[item.id]} />
        ))}
      </ul>
    </div>
  );
}
