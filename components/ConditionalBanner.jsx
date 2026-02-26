'use client';

import { usePathname } from 'next/navigation';
import SiteBanner from './SiteBanner';

/**
 * Renders SiteBanner except on the landing page.
 * The countdown updates every second; hiding it on landing reduces
 * re-renders and potential Safari viewport thrashing during login.
 */
export default function ConditionalBanner({ deadlineISO }) {
  const pathname = usePathname();
  if (pathname === '/landing' || pathname?.startsWith('/landing')) {
    return null;
  }
  return <SiteBanner deadlineISO={deadlineISO} />;
}
