'use client';

export default function Ticker({ items }) {
  if (!items || items.length === 0) {
    return <div className="h-8 w-full overflow-hidden" aria-hidden />;
  }
  const duplicated = [...items, ...items];
  return (
    <div className="relative h-8 w-full overflow-hidden border-t border-b border-gray-200 bg-gray-50/80">
      <div className="ticker-track flex h-full items-center gap-8 whitespace-nowrap">
        {duplicated.map((x, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-gray-700">
            {x.emoji && <span>{x.emoji}</span>}
            {x.text}
          </span>
        ))}
      </div>
      <style jsx>{`
        .ticker-track {
          animation: ticker 22s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ticker-track {
            animation: none;
          }
        }
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
