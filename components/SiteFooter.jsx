'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || 'auction@stepweaver.dev';
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    let initialViewportHeight = window.innerHeight;
    let isInputFocused = false;

    // Function to check if keyboard is likely open
    const checkKeyboardState = () => {
      const currentHeight = window.innerHeight;
      // If viewport height decreased significantly (more than 150px), keyboard is likely open
      const heightDiff = initialViewportHeight - currentHeight;
      const likelyKeyboardOpen = heightDiff > 150 || isInputFocused;
      
      setIsKeyboardOpen(likelyKeyboardOpen);
    };

    // Use Visual Viewport API if available (more accurate)
    if (window.visualViewport) {
      const handleViewportChange = () => {
        const viewport = window.visualViewport;
        const heightDiff = window.innerHeight - viewport.height;
        // Keyboard is likely open if visual viewport is significantly smaller
        setIsKeyboardOpen(heightDiff > 150);
      };

      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);

      return () => {
        window.visualViewport?.removeEventListener('resize', handleViewportChange);
        window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      };
    } else {
      // Fallback: use window resize events
      const handleResize = () => {
        checkKeyboardState();
      };

      // Track input focus/blur for additional signal
      const handleFocus = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
          isInputFocused = true;
          // Delay check to allow keyboard animation
          setTimeout(checkKeyboardState, 100);
        }
      };

      const handleBlur = () => {
        isInputFocused = false;
        // Delay check to allow keyboard to close
        setTimeout(() => {
          checkKeyboardState();
          // Reset initial height after keyboard closes
          initialViewportHeight = window.innerHeight;
        }, 300);
      };

      window.addEventListener('resize', handleResize);
      document.addEventListener('focusin', handleFocus);
      document.addEventListener('focusout', handleBlur);

      // Initial check
      checkKeyboardState();

      return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('focusin', handleFocus);
        document.removeEventListener('focusout', handleBlur);
      };
    }
  }, []);

  return (
    <footer 
      className={`no-print mt-auto border-t border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-all duration-300 ease-in-out ${
        isKeyboardOpen ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      }`}
      style={{
        transform: isKeyboardOpen ? 'translateY(100%)' : 'translateY(0)',
        transition: 'transform 0.3s ease-in-out, opacity 0.3s ease-in-out',
        willChange: 'transform, opacity',
      }}
    >
      <div className='max-w-7xl mx-auto px-3 py-2 sm:px-4 sm:py-3'>
        <nav
          className='flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600'
          aria-label='Footer'
        >
          <p className='w-full text-center sm:w-auto sm:text-left'>
            © {currentYear} Mary Frank PTO
          </p>
          <div className='flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1'>
            <Link
              className='font-medium text-gray-600 hover:text-gray-900'
              href='/terms'
            >
              Terms &amp; Privacy
            </Link>
            <a
              className='font-medium text-gray-600 hover:text-gray-900'
              href={`mailto:${contactEmail}`}
            >
              Contact
            </a>
            <a
              href='https://stepweaver.dev'
              className='font-medium text-gray-600 hover:text-gray-900'
              target='_blank'
              rel='noopener noreferrer'
            >
              Crafted by λstepweaver
            </a>
          </div>
        </nav>
      </div>
    </footer>
  );
}
