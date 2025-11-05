import Link from 'next/link';
import { formatDollar } from '@/lib/money';

export default function ItemCard({ item }) {
  const current = Number(item.current_high_bid ?? item.start_price);
  const nextMin = current === Number(item.start_price)
    ? Number(item.start_price)
    : current + Number(item.min_increment);
  const url = `/i/${item.slug}`;
  
  // Check if item is closed (either manually closed or deadline passed)
  const isClosed = item.is_closed || false;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin + url : url
  )}`;

  return (
    <Link href={url} className={`card shadow-md card-hover ${isClosed ? 'bg-base-200 opacity-75' : 'bg-base-100'} block`}>
      {isClosed && (
        <div className="absolute top-2 right-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-lg bg-amber-500 border border-amber-400/50">
            <span className="text-sm">🔒</span>
            Closed
          </span>
        </div>
      )}
      <figure className="ring-gradient rounded-t-2xl relative">
        {isClosed && (
          <div className="absolute inset-0 bg-black/30 z-10 flex items-center justify-center">
            <span className="text-white font-bold text-lg bg-black/50 px-4 py-2 rounded-lg">
              Bidding Closed
            </span>
          </div>
        )}
        {item.photo_url ? (
          <div className="w-full bg-base-200">
            <div className="aspect-[4/3] w-full p-2">
              <img
                src={item.photo_url}
                alt={item.title}
                className={`w-full h-full object-contain rounded-lg ${isClosed ? 'opacity-60' : ''}`}
              />
            </div>
          </div>
        ) : (
          <div className="w-full bg-base-200 grid place-items-center aspect-[4/3] text-base-content/50">
            <span className="text-lg">No photo</span>
          </div>
        )}
      </figure>
      <div className="card-body p-4">
        <h2 className="card-title text-lg">
          <span className={isClosed ? 'opacity-70' : ''}>
            {item.title}
          </span>
        </h2>
        {item.description && (
          <p className="text-sm text-base-content/70 line-clamp-2">
            {item.description.slice(0, 120)}
            {item.description.length > 120 ? '...' : ''}
          </p>
        )}
        <div className="flex flex-col gap-2 mt-2">
          {isClosed ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">Final bid:</span>
              <span className="badge badge-warning badge-lg">{formatDollar(current)}</span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">Current:</span>
                <span className="badge badge-primary badge-lg">{formatDollar(current)}</span>
                {current === Number(item.start_price) && (
                  <span className="badge badge-ghost badge-sm">first bid</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">Next min:</span>
                <span className="badge badge-outline badge-lg">{formatDollar(nextMin)}</span>
              </div>
            </>
          )}
        </div>
        <div className="card-actions justify-between items-center mt-3">
          {isClosed ? (
            <span className="btn btn-ghost btn-sm pointer-events-none">
              View Details
            </span>
          ) : (
            <span className="btn btn-primary btn-sm pointer-events-none">
              Place Bid
            </span>
          )}
          <div className="tooltip tooltip-top" data-tip="Scan to view item">
            <img alt="QR Code" src={qrUrl} className="w-12 h-12 rounded border-2 border-base-300" />
          </div>
        </div>
      </div>
    </Link>
  );
}
