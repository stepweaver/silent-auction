'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDollar } from '@/lib/money';

export default function ItemCard({ item, priority = false }) {
  const current = Number(item.current_high_bid ?? item.start_price);
  const nextMin = current === Number(item.start_price)
    ? Number(item.start_price)
    : current + 1; // Fixed $1 increment
  const url = `/i/${item.slug}`;
  
  // Check if item is closed (either manually closed or deadline passed)
  const isClosed = item.is_closed || false;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin + url : url
  )}`;

  return (
    <Link 
      href={url} 
      className={`relative bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden block transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${isClosed ? 'opacity-75' : ''}`}
    >
      {isClosed && (
        <div className="absolute top-2 right-2 z-10">
          <span 
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white shadow-md"
            style={{ backgroundColor: 'var(--accent-warm-500)' }}
          >
            <span className="text-xs">🔒</span>
            Closed
          </span>
        </div>
      )}
      <figure className="relative">
        {isClosed && (
          <div className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center">
            <span className="text-white font-bold text-sm bg-black/50 px-3 py-1.5 rounded-lg">
              Bidding Closed
            </span>
          </div>
        )}
        {item.photo_url ? (
          <div className="w-full bg-gray-100">
            <div className="relative aspect-[4/3] w-full p-2">
              <Image
                src={item.photo_url}
                alt={item.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className={`object-contain rounded-lg ${isClosed ? 'opacity-60' : ''}`}
                priority={priority}
                loading={priority ? 'eager' : undefined}
              />
            </div>
          </div>
        ) : (
          <div className="w-full bg-gray-100 grid place-items-center aspect-[4/3] text-gray-400">
            <span className="text-sm">No photo</span>
          </div>
        )}
      </figure>
      <div className="p-4">
        <h2 className="font-bold text-base mb-1 text-gray-900 line-clamp-2">
          {item.title}
        </h2>
        {item.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {item.description}
          </p>
        )}
        <div className="flex flex-col gap-1.5 mt-2">
          {isClosed ? (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-gray-700">Final bid:</span>
              <span 
                className="px-2 py-0.5 rounded text-xs font-bold text-white"
                style={{ backgroundColor: 'var(--accent-warm-500)' }}
              >
                {formatDollar(current)}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-gray-700">Current:</span>
                <span 
                  className="px-2 py-0.5 rounded text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--primary-500)', color: 'var(--primary-contrast)' }}
                >
                  {formatDollar(current)}
                </span>
                {current === Number(item.start_price) && (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium text-gray-600 bg-gray-100">
                    first bid
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-semibold text-gray-700">Next min:</span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold text-gray-700 border border-gray-300">
                  {formatDollar(nextMin)}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
          {isClosed ? (
            <span className="text-sm font-medium text-gray-600">View Details</span>
          ) : (
            <span 
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg"
              style={{ backgroundColor: 'var(--primary-500)', minHeight: '44px', display: 'inline-flex', alignItems: 'center' }}
            >
              Place Bid
            </span>
          )}
          <div className='flex flex-col items-center gap-1'>
            <Image
              alt={`QR code linking to ${item.title}`}
              src={qrUrl}
              width={48}
              height={48}
              className='rounded border border-gray-300'
            />
            <span className='text-[11px] text-gray-500'>Scan to view</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
