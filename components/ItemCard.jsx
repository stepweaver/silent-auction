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
    <li className="border rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      {item.photo_url && (
        <img
          src={item.photo_url}
          alt=""
          className="h-36 w-full object-cover rounded-lg mb-2"
        />
      )}
      <Link href={url} className="text-lg font-medium underline hover:no-underline">
        {item.title}
      </Link>
      {item.description && (
        <p className="mt-1 text-sm opacity-80 line-clamp-2">
          {item.description.slice(0, 120)}
          {item.description.length > 120 ? '...' : ''}
        </p>
      )}
      <p className="mt-2 text-sm">
        Current: <span className="font-semibold">{formatDollar(current)}</span> • Next min:{' '}
        <span className="font-semibold text-blue-600">{formatDollar(nextMin)}</span>
        {current === Number(item.start_price) ? (
          <span className="text-xs text-gray-500"> (first bid)</span>
        ) : null}
      </p>
      <div className="flex items-center gap-2 mt-3">
        <Link
          href={url}
          className="text-blue-600 underline hover:no-underline font-medium px-2 py-1 -ml-2"
        >
          Bid
        </Link>
        <img alt="QR Code" src={qrUrl} className="w-12 h-12 border rounded flex-shrink-0" />
      </div>
    </li>
  );
}
