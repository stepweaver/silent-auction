'use client';

import { useEffect, useState } from 'react';
import AliasAvatar from '@/components/AliasAvatar';
import { formatDollar } from '@/lib/money';

export default function BidNotification({ notification, onClose }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Fade in
    setIsVisible(true);

    // Auto-close after 4 seconds
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onClose();
      }, 300); // Match animation duration
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (!notification) return null;

  const { type, itemTitle, bidderName, bidAmount, alias, color, animal } = notification;

  return (
    <div
      className={`
        w-full max-w-md
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className="bg-white rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden">
        <div className="p-4">
          {type === 'new_bid' && (
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                {alias ? (
                  <AliasAvatar alias={alias} color={color} animal={animal} size="md" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                    {bidderName?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    New Bid!
                  </span>
                  <span className="text-lg font-bold" style={{ color: 'var(--primary-500)' }}>
                    {formatDollar(bidAmount)}
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {bidderName || alias}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  on {itemTitle}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsExiting(true);
                  setTimeout(() => onClose(), 300);
                }}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {type === 'leader_change' && (
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                {alias ? (
                  <AliasAvatar alias={alias} color={color} animal={animal} size="md" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                    {bidderName?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wide animate-pulse">
                    New Leader! 🏆
                  </span>
                </div>
                <div className="text-sm font-semibold text-gray-900 truncate">
                  {bidderName || alias}
                </div>
                <div className="text-xs text-gray-600 truncate">
                  now leading {itemTitle}
                </div>
                <div className="text-lg font-bold mt-1" style={{ color: 'var(--primary-500)' }}>
                  {formatDollar(bidAmount)}
                </div>
              </div>
              <button
                onClick={() => {
                  setIsExiting(true);
                  setTimeout(() => onClose(), 300);
                }}
                className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-primary-500 transition-all duration-[4000ms] ease-linear"
            style={{ 
              width: isExiting ? '0%' : '100%',
              backgroundColor: 'var(--primary-500)'
            }}
          />
        </div>
      </div>
    </div>
  );
}

