'use client';

import Link from 'next/link';
import AliasAvatar from '@/components/AliasAvatar';
import { formatDollar } from '@/lib/money';

function AnonymousAvatar() {
  return (
    <div
      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium flex-shrink-0"
      aria-hidden
    >
      A
    </div>
  );
}

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
          <AnonymousAvatar />
        )}
        <span className="text-gray-700 whitespace-nowrap">{aliasName}</span>
        <span className="text-gray-800 font-semibold">
          {topBid ? formatDollar(topBid.amount) : '—'}
        </span>
      </span>
    </li>
  );
}

/** Leader identity for comparison. */
function bidKey(bid) {
  return bid?.alias_id ?? bid?.bidder_name ?? '';
}

/**
 * Bidder Wars row: two avatars facing off with ⚔️ between them, plus item title and current bid.
 */
function WarItemRow({ item, leader, challenger, reducedMotion }) {
  // Use bidder_name from bid when alias lookup didn't attach user_aliases (e.g. alias_id not in DB)
  const leaderAlias =
    leader?.user_aliases?.alias ?? leader?.bidder_name ?? 'Anonymous';
  const challengerAlias =
    challenger?.user_aliases?.alias ?? challenger?.bidder_name ?? 'Anonymous';
  return (
    <div className="rounded-md border-2 border-amber-200 bg-amber-50/50 px-2 py-2 hover:bg-amber-50 flex flex-col gap-2 min-w-0 h-full">
      <Link
        href={`/i/${item.slug}`}
        className="font-medium hover:underline text-sm sm:text-base leading-snug line-clamp-2"
        style={{ color: 'var(--primary-600)' }}
      >
        {item.title}
      </Link>
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {/* Leader (current high bidder) */}
        <div className="flex flex-col items-center gap-0.5">
          {leader?.user_aliases ? (
            <AliasAvatar
              alias={leader.user_aliases.alias}
              color={leader.user_aliases.color}
              animal={leader.user_aliases.animal}
              size="md"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
              A
            </div>
          )}
          <span className="text-[10px] sm:text-xs font-semibold text-gray-700 truncate max-w-[4rem] sm:max-w-[5rem]" title={leaderAlias}>
            {leaderAlias}
          </span>
        </div>
        {/* VS / swords */}
        <span
          className={`flex-shrink-0 text-lg sm:text-xl ${reducedMotion ? '' : 'animate-pulse'}`}
          aria-hidden
        >
          ⚔️
        </span>
        {/* Challenger (other bidder in the war) */}
        <div className="flex flex-col items-center gap-0.5">
          {challenger?.user_aliases ? (
            <AliasAvatar
              alias={challenger.user_aliases.alias}
              color={challenger.user_aliases.color}
              animal={challenger.user_aliases.animal}
              size="md"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-medium">
              A
            </div>
          )}
          <span className="text-[10px] sm:text-xs font-semibold text-gray-700 truncate max-w-[4rem] sm:max-w-[5rem]" title={challengerAlias}>
            {challengerAlias}
          </span>
        </div>
      </div>
      <p className="text-xs text-center text-amber-800 font-semibold">
        High bid {leader ? formatDollar(leader.amount) : '—'}
      </p>
    </div>
  );
}

/**
 * One column in "What's happening": title (with optional icon) + list of summary rows.
 * When variant="war" and recentBids is passed, renders WarItemRow (leader vs challenger) per item.
 */
export default function LeaderboardSummaryPanel({
  title,
  icon,
  iconPulse = false,
  titleClassName,
  items,
  topBids,
  variant = 'default',
  secondTopBids = {},
  recentBids = {},
  reducedMotion = false,
}) {
  const isWar = variant === 'war';

  return (
    <div className="min-w-0">
      <h3
        className={`text-xs font-semibold mb-1.5 flex items-center gap-1 ${titleClassName || ''}`}
      >
        {icon && <span className={iconPulse ? 'animate-pulse' : ''}>{icon}</span>}
        {title}
      </h3>
      <ul
        className={
          isWar
            ? 'flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory'
            : 'space-y-1.5'
        }
      >
        {items.map((item) => {
          if (isWar) {
            const leader = topBids[item.id] ?? null;
            // Use runner-up (second-highest bidder) when available – alias is always resolved for them
            const challengerFromSecond = secondTopBids[item.id] ?? null;
            const recent = recentBids[item.id] ?? [];
            const leaderKey = bidKey(leader);
            const recentByTime = [...recent].sort(
              (a, b) => new Date(b.created_at) - new Date(a.created_at)
            );
            const otherBidders = recentByTime.filter(
              (b) => bidKey(b) && bidKey(b) !== leaderKey
            );
            const challengerFromRecent =
              otherBidders.find((b) => b.user_aliases) ?? otherBidders[0] ?? null;
            const challenger = challengerFromSecond ?? challengerFromRecent;
            return (
              <li
                key={item.id}
                className="flex-shrink-0 w-[min(100%,280px)] snap-start"
              >
                <WarItemRow
                  item={item}
                  leader={leader}
                  challenger={challenger}
                  reducedMotion={reducedMotion}
                />
              </li>
            );
          }
          return (
            <SummaryItemRow key={item.id} item={item} topBid={topBids[item.id]} />
          );
        })}
      </ul>
    </div>
  );
}
