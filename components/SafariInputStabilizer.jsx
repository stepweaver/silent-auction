'use client';

import { useCallback, useEffect } from 'react';

/**
 * iOS Safari workaround: lock viewport when inputs are focused to prevent
 * the jumping/resizing that occurs when the virtual keyboard opens.
 * Brave/Chrome don't need this - they handle interactive-widget properly.
 */
function isIOSSafari() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIOS && isSafari;
}

export function useSafariInputStabilizer(formRef, isFormVisible = true) {
  const lock = useCallback(() => {
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.dataset.safariScrollY = String(scrollY);
  }, []);

  const unlock = useCallback(() => {
    const scrollY = Number(document.body.dataset.safariScrollY || '0');
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    delete document.body.dataset.safariScrollY;
    window.scrollTo(0, scrollY);
  }, []);

  useEffect(() => {
    if (!isIOSSafari() || !isFormVisible || !formRef?.current) return;

    const form = formRef.current;
    const inputs = form.querySelectorAll('input:not([type="hidden"]):not([tabindex="-1"])');

    const handleFocus = () => lock();
    const handleBlur = () => {
      // Delay so we don't unlock mid-tap when switching between inputs
      setTimeout(unlock, 100);
    };

    inputs.forEach((el) => {
      el.addEventListener('focus', handleFocus);
      el.addEventListener('blur', handleBlur);
    });

    return () => {
      inputs.forEach((el) => {
        el.removeEventListener('focus', handleFocus);
        el.removeEventListener('blur', handleBlur);
      });
      unlock();
    };
  }, [formRef, isFormVisible, lock, unlock]);
}
