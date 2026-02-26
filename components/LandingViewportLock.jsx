'use client';

import { useEffect } from 'react';

const LANDING_CLASS = 'landing-viewport-lock';

/**
 * Prevents Safari's viewport jump when the keyboard opens.
 * Uses a fixed viewport (no document scroll) - content scrolls within main-content.
 */
export default function LandingViewportLock({ children }) {
  useEffect(() => {
    document.body.classList.add(LANDING_CLASS);
    return () => document.body.classList.remove(LANDING_CLASS);
  }, []);

  return children;
}
