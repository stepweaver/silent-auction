'use client';

import Link from 'next/link';
import { formatDollar } from '@/lib/money';

const CATALOG_SCROLL_KEY = 'catalog_scroll';

function saveCatalogScroll() {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CATALOG_SCROLL_KEY, String(window.scrollY));
}

export default function ItemCard({ item, priority = false }) {
  const current = Number(item.current_high_bid ?? item.start_price);
  // Check if bids exist - use explicit flag if provided, otherwise check if current_high_bid exists and differs from start_price
  // The explicit flag (_hasBids) is more reliable as it's based on actual bid existence in DB
  const hasBids = item._hasBids !== undefined 
    ? item._hasBids 
    : (item.current_high_bid != null && Number(item.current_high_bid) > Number(item.start_price));
  const minIncrement = 5;
  const nextMin = hasBids ? (current + minIncrement) : Number(item.start_price);
  const url = `/i/${item.slug}`;
  
  // Check if item is closed (either manually closed or deadline passed)
  const isClosed = item.is_closed || false;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin + url : url
  )}`;

  return (
    <Link
      href={url}
      onClick={saveCatalogScroll}
      className={`group relative flex flex-col sm:flex-row bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300 ${isClosed ? 'opacity-80' : ''}`}
    >
      {isClosed && (
        <div className="absolute top-2 right-2 z-20">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-sm"
            style={{ backgroundColor: 'var(--accent-warm-500)' }}
          >
            Closed
          </span>
        </div>
      )}
      <div className="relative bg-gray-100 sm:w-44 md:w-48 shrink-0">
        {isClosed && (
          <div className="absolute inset-0 z-10 bg-black/20 backdrop-blur-[1px]" />
        )}
        {item.thumbnail_url || item.photo_url ? (
          <div className="relative aspect-[4/3] sm:aspect-auto sm:h-full w-full min-h-[10rem]">
            <img
              src={item.thumbnail_url || item.photo_url}
              alt={item.title}
              width={300}
              height={300}
              className={`w-full h-full object-contain p-2 ${isClosed ? 'opacity-80' : ''}`}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
            />
          </div>
        ) : (
          <div className="relative aspect-[4/3] sm:aspect-auto sm:h-full w-full min-h-[10rem] bg-white flex items-center justify-center">
            <img
              src="/logo-with-glow.png"
              alt={item.title}
              width={192}
              height={192}
              className={`object-contain p-4 max-w-full max-h-full ${isClosed ? 'opacity-80' : 'opacity-60'}`}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
            />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex-1 space-y-2">
          <h2 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2">
            {item.title}
          </h2>
          {item.description && (
            <p className="text-xs text-gray-600 line-clamp-2">
              {item.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-xs">
          {isClosed ? (
            <>
              <span className="font-semibold text-gray-700 uppercase tracking-wide">Final</span>
              <span
                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--accent-warm-500)' }}
              >
                {formatDollar(current)}
              </span>
            </>
          ) : (
            <>
              {hasBids ? (
                <>
                  <span className="font-semibold text-gray-700 uppercase tracking-wide">Current</span>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--primary-500)', color: 'var(--primary-contrast)' }}
                  >
                    {formatDollar(current)}
                  </span>
                  <span className="h-3 w-px bg-gray-300" aria-hidden />
                  <span className="font-semibold text-gray-500 uppercase tracking-wide">Next min</span>
                  <span className="px-2 py-0.5 rounded border border-gray-300 text-xs font-semibold text-gray-700 bg-white">
                    {formatDollar(nextMin)}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-gray-700 uppercase tracking-wide">Starting</span>
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--primary-500)', color: 'var(--primary-contrast)' }}
                  >
                    {formatDollar(current)}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <span
            className={`text-sm font-semibold ${isClosed ? 'text-gray-600' : 'text-gray-800'} transition-colors group-hover:text-primary-600`}
          >
            {isClosed ? 'View details' : 'Preview & bid →'}
          </span>
          <div className="flex items-center gap-2">
            <img
              alt={`QR code linking to ${item.title}`}
              src={qrUrl}
              width={40}
              height={40}
              className="rounded border border-gray-200"
              loading="lazy"
              decoding="async"
            />
            <span className="text-[10px] text-gray-500">Scan</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
