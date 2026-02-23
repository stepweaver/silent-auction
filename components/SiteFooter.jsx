'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    process.env.AUCTION_CONTACT_EMAIL ||
    'auction@stepweaver.dev';

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isScrollHidden, setIsScrollHidden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const scrollContainer =
      document.getElementById('main-content') || window;

    const SCROLL_DELTA = 28;       // px scroll before toggling (reduces jitter)
    const SCROLL_COOLDOWN_MS = 450; // don't flip again for this long after a toggle

    let lastScrollTop =
      scrollContainer === window
        ? window.scrollY
        : scrollContainer.scrollTop;
    let lastScrollToggleAt = 0;
    let rafId = null;
    let focusedInputCount = 0;
    let keyboardCloseTimeout = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        // Don't react to scroll while an input is focused (keyboard open) to avoid layout feedback
        if (focusedInputCount > 0) {
          lastScrollTop =
            scrollContainer === window
              ? window.scrollY
              : scrollContainer.scrollTop;
          return;
        }
        const currentScrollTop =
          scrollContainer === window
            ? window.scrollY
            : scrollContainer.scrollTop;
        const delta = currentScrollTop - lastScrollTop;
        const now = Date.now();

        if (currentScrollTop <= 20) {
          setIsScrollHidden(false);
          lastScrollToggleAt = now;
        } else if (now - lastScrollToggleAt >= SCROLL_COOLDOWN_MS) {
          if (delta > SCROLL_DELTA) {
            setIsScrollHidden(true);
            lastScrollToggleAt = now;
          } else if (delta < -SCROLL_DELTA) {
            setIsScrollHidden(false);
            lastScrollToggleAt = now;
          }
        }

        lastScrollTop = currentScrollTop;
      });
    };

    const handleFocusIn = (event) => {
      const target = event.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        focusedInputCount += 1;
        setIsKeyboardOpen(true);
      }
    };

    const handleFocusOut = (event) => {
      const target = event.target;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        focusedInputCount = Math.max(0, focusedInputCount - 1);

        if (focusedInputCount === 0) {
          if (keyboardCloseTimeout) clearTimeout(keyboardCloseTimeout);
          keyboardCloseTimeout = setTimeout(() => {
            keyboardCloseTimeout = null;
            if (focusedInputCount === 0) {
              setIsKeyboardOpen(false);
            }
          }, 280);
        }
      }
    };

    // Attach scroll listener to the main content area (your catalog + pages)
    if (scrollContainer === window) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    } else {
      scrollContainer.addEventListener('scroll', handleScroll, {
        passive: true,
      });
    }

    // Focus listeners on the whole document (covers login inputs, etc.)
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (keyboardCloseTimeout) clearTimeout(keyboardCloseTimeout);
      if (scrollContainer === window) {
        window.removeEventListener('scroll', handleScroll);
      } else {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const isHidden = isKeyboardOpen || isScrollHidden;

  // Fixed-height slot so showing/hiding the footer never changes layout (avoids
  // jumpiness when scrolling, especially on filtered catalog with less content).
  const FOOTER_HEIGHT = '6rem';

  return (
    <footer
      className="no-print mt-auto shrink-0 overflow-hidden"
      style={{ height: FOOTER_HEIGHT, minHeight: FOOTER_HEIGHT }}
      aria-hidden={isHidden}
    >
      <div
        className={`border-t border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 transition-[transform,opacity,border-color] duration-300 ease-in-out ${
          isHidden
            ? 'pointer-events-none border-t-transparent'
            : ''
        }`}
        style={{
          height: FOOTER_HEIGHT,
          minHeight: FOOTER_HEIGHT,
          transform: isHidden ? 'translateY(100%)' : 'translateY(0)',
          opacity: isHidden ? 0 : 1,
          transition: 'transform 0.3s ease-in-out, opacity 0.25s ease-in-out',
        }}
      >
        <div className="max-w-7xl mx-auto px-3 py-2 sm:px-4 sm:py-3 min-h-0 h-full flex items-center">
        <nav
          className="flex flex-wrap items-center justify-center sm:justify-between gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600"
          aria-label="Footer"
        >
          <p className="w-full text-center sm:w-auto sm:text-left">
            © {currentYear} Mary Frank PTO
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-3 gap-y-1">
            <Link
              className="font-medium text-gray-600 hover:text-gray-900"
              href="/terms"
            >
              Terms &amp; Privacy
            </Link>
            <a
              className="font-medium text-gray-600 hover:text-gray-900"
              href={`mailto:${contactEmail}`}
            >
              Contact
            </a>
            <a
              href="https://stepweaver.dev"
              className="font-medium text-gray-600 hover:text-gray-900"
              target="_blank"
              rel="noopener noreferrer"
            >
              Crafted by λstepweaver
            </a>
          </div>
        </nav>
        </div>
      </div>
    </footer>
  );
}
