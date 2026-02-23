'use client';

import Link from 'next/link';
import { Flame, Sword } from 'lucide-react';
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
 * Single leaderboard row: title, lead bidder (and optional challenger for wars), price.
 * Hot = pulse + warm accent when reducedMotion is false. War = amber border + two avatars.
 */
export default function LeaderboardItemRow({
  item,
  topBid,
  secondBid = null,
  isHot = false,
  hasWar = false,
  reducedMotion = false,
  badge = null,
  compact = false,
  placeholder = false,
}) {
  const leaderAlias = topBid?.user_aliases?.alias ?? topBid?.bidder_name ?? 'Anonymous';
  const challengerAlias = secondBid?.user_aliases?.alias ?? secondBid?.bidder_name ?? 'Anonymous';

  const pad = compact ? 'px-2 py-1' : 'px-3 py-2';
  const gap = compact ? 'gap-1' : 'gap-2';
  const titleSize = compact ? 'text-xs' : 'text-sm sm:text-base';
  const aliasSize = compact ? 'text-xs' : 'text-xs sm:text-sm';
  const priceSize = compact ? 'text-xs font-semibold text-gray-800' : 'text-gray-800 font-semibold text-sm sm:text-base';

  const baseClasses = `rounded border ${pad} flex flex-col ${gap} min-w-0`;
  const hotClasses = isHot ? 'border-red-300 bg-red-50/50' : '';
  const warClasses = hasWar ? 'border-2 border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-gray-50/60';
  const hoverClasses = hasWar ? 'hover:bg-amber-50' : 'hover:bg-gray-50';

  const iconSize = compact ? 14 : 16;

  const titleEl = placeholder ? (
    <span className={`font-medium ${titleSize} flex-1 min-w-0 leading-tight line-clamp-2 text-gray-600`}>{item.title}</span>
  ) : (
    <Link
      href={`/i/${item.slug}`}
      className={`font-medium hover:underline ${titleSize} flex-1 min-w-0 leading-tight line-clamp-2`}
      style={{ color: 'var(--primary-600)' }}
    >
      {item.title}
    </Link>
  );

  return (
    <li className={`${baseClasses} ${warClasses} ${hotClasses} ${hoverClasses}`}>
      <div className="flex items-start justify-between gap-1 min-w-0">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          {isHot && (
            <span className="flex items-center flex-shrink-0 gap-0.5" aria-label="Hot item">
              {reducedMotion ? (
                <Flame size={iconSize} className="text-orange-500" strokeWidth={2.5} />
              ) : (
                <>
                  <Flame size={iconSize} className="text-orange-500 animate-flame-flicker" strokeWidth={2.5} />
                  <Flame size={iconSize} className="text-amber-500 animate-flame-flicker" strokeWidth={2} style={{ animationDelay: '0.15s' }} />
                </>
              )}
            </span>
          )}
          {titleEl}
        </div>
        {badge && (
          <span className="text-[10px] text-gray-500 flex-shrink-0">{badge}</span>
        )}
      </div>
      <div className={`flex items-center flex-wrap min-w-0 ${compact ? 'gap-1' : 'gap-2'}`}>
        <span className="flex items-center gap-1 flex-shrink-0 min-w-0">
          {topBid?.user_aliases ? (
            <AliasAvatar
              alias={topBid.user_aliases.alias}
              color={topBid.user_aliases.color}
              animal={topBid.user_aliases.animal}
              size={compact ? 'sm' : 'sm'}
            />
          ) : (
            <AnonymousAvatar />
          )}
          <span className={`text-gray-700 ${aliasSize} break-words min-w-0`} title={leaderAlias}>
            {leaderAlias}
          </span>
        </span>
        {hasWar && secondBid && (
          <>
            <span className="flex items-center flex-shrink-0 gap-0.5" aria-label="Bidder war">
              {reducedMotion ? (
                <>
                  <Sword size={iconSize} className="text-amber-600" strokeWidth={2} />
                  <Sword size={iconSize} className="text-amber-600 scale-x-[-1]" strokeWidth={2} />
                </>
              ) : (
                <>
                  <Sword size={iconSize} className="text-amber-600 animate-sword-clash-left" strokeWidth={2} />
                  <Sword size={iconSize} className="text-amber-600 animate-sword-clash-right" strokeWidth={2} />
                </>
              )}
            </span>
            <span className="flex items-center gap-1 flex-shrink-0 min-w-0">
              {secondBid?.user_aliases ? (
                <AliasAvatar
                  alias={secondBid.user_aliases.alias}
                  color={secondBid.user_aliases.color}
                  animal={secondBid.user_aliases.animal}
                  size="sm"
                />
              ) : (
                <AnonymousAvatar />
              )}
              <span className={`text-gray-700 ${aliasSize} break-words min-w-0`} title={challengerAlias}>
                {challengerAlias}
              </span>
            </span>
          </>
        )}
        <span className={`${priceSize} ml-auto flex-shrink-0`}>
          {topBid ? formatDollar(topBid.amount) : '—'}
        </span>
      </div>
    </li>
  );
}
