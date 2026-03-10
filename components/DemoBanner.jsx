'use client';

/**
 * Shown when NEXT_PUBLIC_DEMO_MODE=true (portfolio showcase).
 * Explains that this is a demo with no real items or payments.
 */
export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
    return null;
  }

  return (
    <div
      className="bg-amber-100 border-b border-amber-300 text-amber-900 text-center py-2 px-4 text-sm"
      role="status"
    >
      <strong>Portfolio Demo</strong> - No real items or payments.
    </div>
  );
}
