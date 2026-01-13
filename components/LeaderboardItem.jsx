'use client';

import { memo, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDollar } from '@/lib/money';
import AliasAvatar from '@/components/AliasAvatar';
import HotItemIndicator from '@/components/HotItemIndicator';

const LeaderboardItem = memo(function LeaderboardItem({ 
  item, 
  topBid, 
  bidCount = 0,
  isHot, 
  hasBiddingWar,
  leaderChanged,
  positionChanged = false,
  movedUp = false,
  currentPosition,
  previousPosition,
  priority = false 
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPositionAnimating, setIsPositionAnimating] = useState(false);
  const [prevLeaderId, setPrevLeaderId] = useState(null);

  const currentBid = Number(item.current_high_bid ?? item.start_price);
  const leaderId = topBid?.alias_id || topBid?.id || null;
  // PRIVACY: Never show bidder_name on public leaderboard - only show alias
  // If no alias exists, show "Anonymous Bidder" to protect privacy
  const leaderName = topBid?.user_aliases?.alias || 'Anonymous Bidder';
  // Check if bids exist based on topBid existence, not amount comparison
  // This handles cases where someone bids exactly the starting price
  const hasLeader = topBid !== null && topBid !== undefined;

  // Detect leader change (use prop or internal detection)
  useEffect(() => {
    if (leaderChanged || (leaderId && leaderId !== prevLeaderId && prevLeaderId !== null)) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
    setPrevLeaderId(leaderId);
  }, [leaderId, prevLeaderId, leaderChanged]);

  // Detect position change
  useEffect(() => {
    if (positionChanged && movedUp) {
      setIsPositionAnimating(true);
      const timer = setTimeout(() => setIsPositionAnimating(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [positionChanged, movedUp]);

  return (
    <>
      {/* Desktop/Tablet View - Optimized for projector */}
      <Link
        href={`/i/${item.slug}`}
        className={`
          hidden md:block relative bg-white rounded-xl shadow-lg border-2 overflow-hidden
          transition-all duration-500 ease-out cursor-pointer
          hover:shadow-xl hover:scale-[1.02]
          ${isHot ? 'border-orange-400 shadow-orange-200' : 'border-gray-200'}
          ${isAnimating ? 'ring-4 ring-yellow-400 ring-opacity-50 scale-105' : ''}
          ${hasBiddingWar ? 'animate-pulse' : ''}
          ${isPositionAnimating ? 'ring-4 ring-green-400 ring-opacity-50 shadow-green-200 scale-[1.02]' : ''}
        `}
      >
        {/* Content - desktop layout - compact but readable */}
        <div className={`p-4 space-y-3 ${(isHot || hasBiddingWar || (isPositionAnimating && movedUp)) ? 'pt-10' : ''}`}>
          {/* Badges row */}
          {(isHot || hasBiddingWar || (isPositionAnimating && movedUp)) && (
            <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {isPositionAnimating && movedUp && (
                  <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs font-bold shadow-lg animate-bounce">
                    ↑ Moving Up!
                  </span>
                )}
                {hasBiddingWar && (
                  <span className="px-2 py-1 bg-red-500 text-white rounded-full text-xs font-bold shadow-md animate-pulse">
                    ⚔️ WAR
                  </span>
                )}
              </div>
              {isHot && (
                <div className="flex items-center gap-0.5 px-2 py-1 bg-orange-500 text-white rounded-full text-xs font-bold shadow-md">
                  <HotItemIndicator size="sm" />
                  <span>HOT</span>
                </div>
              )}
            </div>
          )}
          {/* Title with bid count */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-base lg:text-lg text-gray-900 line-clamp-2 leading-tight flex-1">
              {item.title}
            </h3>
            {bidCount > 0 && (
              <div className="shrink-0 px-2 py-0.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
                {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
              </div>
            )}
          </div>

          {/* Current bid amount */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Current Bid
            </span>
            <span
              className={`
                text-2xl lg:text-3xl font-bold transition-colors duration-300
                ${isAnimating ? 'text-yellow-600' : ''}
              `}
              style={{ color: isAnimating ? '#d97706' : 'var(--primary-500)' }}
            >
              {formatDollar(currentBid)}
            </span>
          </div>

          {/* Leader info */}
          <div className="pt-2 border-t border-gray-200">
            {hasLeader ? (
              <div className="flex items-center gap-3">
                <div className={`
                  shrink-0 transition-transform duration-300
                  ${isAnimating ? 'scale-110' : ''}
                `}>
                  {topBid?.user_aliases ? (
                    <AliasAvatar
                      alias={topBid.user_aliases.alias}
                      color={topBid.user_aliases.color}
                      animal={topBid.user_aliases.animal}
                      size="md"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-sm">
                      {leaderName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-0.5">
                    Leading
                  </div>
                  <div className={`
                    font-bold text-sm lg:text-base truncate transition-all duration-300
                    ${isAnimating ? 'text-yellow-600' : 'text-gray-900'}
                  `}>
                    {leaderName}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-1.5">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
                  Starting Bid
                </div>
                <div className="text-sm text-gray-600">
                  Be the first to bid!
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Animated glow effect for leader changes */}
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-yellow-400 opacity-20 animate-ping rounded-xl"></div>
          </div>
        )}
      </Link>

      {/* Mobile View - Compact */}
      <Link
        href={`/i/${item.slug}`}
        className={`
          md:hidden relative bg-white rounded-lg shadow-md border overflow-hidden
          transition-all duration-500 ease-out cursor-pointer
          hover:shadow-lg active:scale-[0.98]
          ${isHot ? 'border-orange-400 shadow-orange-200' : 'border-gray-200'}
          ${isAnimating ? 'ring-2 ring-yellow-400 ring-opacity-50' : ''}
          ${hasBiddingWar ? 'animate-pulse' : ''}
          ${isPositionAnimating ? 'ring-2 ring-green-400 ring-opacity-50 scale-[1.02]' : ''}
        `}
      >
        {/* Content - mobile layout */}
        <div className={`p-2.5 space-y-1.5 ${(isHot || hasBiddingWar || (isPositionAnimating && movedUp)) ? 'pt-7' : ''}`}>
          {/* Badges row - positioned within content flow */}
          {(isHot || hasBiddingWar || (isPositionAnimating && movedUp)) && (
            <div className="absolute top-1 left-1 right-1 z-20 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {isPositionAnimating && movedUp && (
                  <span className="px-1.5 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-bold shadow-md">
                    ↑
                  </span>
                )}
                {hasBiddingWar && (
                  <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-[10px] font-bold shadow-md animate-pulse">
                    ⚔️ WAR
                  </span>
                )}
              </div>
              {isHot && (
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500 text-white rounded-full text-[10px] font-bold shadow-md">
                  <HotItemIndicator />
                  <span>HOT</span>
                </div>
              )}
            </div>
          )}
          {/* Title */}
          <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">
            {item.title}
          </h3>

          {/* Current bid amount and leader in one row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              {hasLeader ? (
                <div className="flex items-center gap-1.5">
                  <div className={`
                    shrink-0 transition-transform duration-300
                    ${isAnimating ? 'scale-110' : ''}
                  `}>
                    {topBid?.user_aliases ? (
                      <AliasAvatar
                        alias={topBid.user_aliases.alias}
                        color={topBid.user_aliases.color}
                        animal={topBid.user_aliases.animal}
                        size="sm"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-[10px]">
                        {leaderName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`
                      font-semibold text-xs truncate transition-all duration-300
                      ${isAnimating ? 'text-yellow-600' : 'text-gray-900'}
                    `}>
                      {leaderName}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-gray-500 font-medium">
                  No bids yet
                </div>
              )}
            </div>
            <span
              className={`
                text-lg font-bold transition-colors duration-300 shrink-0
                ${isAnimating ? 'text-yellow-600' : ''}
              `}
              style={{ color: isAnimating ? '#d97706' : 'var(--primary-500)' }}
            >
              {formatDollar(currentBid)}
            </span>
          </div>
        </div>

        {/* Animated glow effect for leader changes */}
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-yellow-400 opacity-15 animate-ping rounded-lg"></div>
          </div>
        )}
      </Link>
    </>
  );
});

export default LeaderboardItem;

