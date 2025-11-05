import Link from 'next/link';
import { formatDollar } from '@/lib/money';

export default function ItemCard({ item }) {
  const current = Number(item.current_high_bid ?? item.start_price);
  const nextMin = current === Number(item.start_price)
    ? Number(item.start_price)
    : current + Number(item.min_increment);
  const url = `/i/${item.slug}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin + url : url
  )}`;

  return (
    <div className="card bg-base-100 shadow-md card-hover">
      <figure className="ring-gradient rounded-t-2xl">
        {item.photo_url ? (
          <div className="w-full bg-base-200">
            <div className="aspect-[4/3] w-full p-2">
              <img
                src={item.photo_url}
                alt={item.title}
                className="w-full h-full object-contain rounded-lg"
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
          <Link href={url} className="link link-hover">
            {item.title}
          </Link>
        </h2>
        {item.description && (
          <p className="text-sm text-base-content/70 line-clamp-2">
            {item.description.slice(0, 120)}
            {item.description.length > 120 ? '...' : ''}
          </p>
        )}
        <div className="flex flex-col gap-2 mt-2">
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
        </div>
        <div className="card-actions justify-between items-center mt-3">
          <Link href={url} className="btn btn-primary btn-sm">
            Place Bid
          </Link>
          <div className="tooltip tooltip-top" data-tip="Scan to view item">
            <img alt="QR Code" src={qrUrl} className="w-12 h-12 rounded border-2 border-base-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
