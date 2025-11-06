'use client';

import { usePathname } from 'next/navigation';

export default function BackgroundLogo() {
  const pathname = usePathname();

  // Completely hide background logo on landing page to avoid conflicts
  if (!pathname || pathname === '/landing' || pathname.startsWith('/landing')) {
    return null;
  }

  return (
    <div
      aria-hidden='true'
      className='pointer-events-none fixed inset-0 -z-10 flex items-center justify-center'
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <img
        src='/logo-with-glow.png'
        alt=''
        className='opacity-30 object-contain'
        style={{
          width: 'min(98vw, 1800px)',
          height: 'min(95vh, 1400px)',
          minWidth: 'min(85vw, 1200px)',
          minHeight: 'min(75vh, 900px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
