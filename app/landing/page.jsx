'use client';

import { useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AliasSelector from '@/components/AliasSelector';

const STORAGE_KEY = 'auction_bidder_info';
const ENROLLMENT_KEY = 'auction_enrolled';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('intro'); // 'intro', 'verify', 'enroll'
  const [verificationSent, setVerificationSent] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [hasSentRecoveryNotification, setHasSentRecoveryNotification] =
    useState(false);
  const [honeypot, setHoneypot] = useState(''); // Honeypot field - should remain empty
  const nameInputId = useId();
  const emailInputId = useId();
  const honeypotId = useId();

  useEffect(() => {
    // Check if email was just verified
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const verified = searchParams.get('verified');
      const verifiedEmail = searchParams.get('email');

      if (verified === 'true' && verifiedEmail) {
        // Email was verified, proceed to alias creation
        setEmail(verifiedEmail);
        setVerifiedEmail(verifiedEmail);

        // Restore name from localStorage if it was stored during verification
        const storedName = localStorage.getItem('auction_pending_name');
        if (storedName) {
          setName(storedName);
          localStorage.removeItem('auction_pending_name'); // Clean up after use
        }

        setStep('enroll');
        // Clean up URL
        window.history.replaceState({}, '', '/landing');
        return;
      }
    }

    // Fallback: If we're in enroll step but name is empty, try to restore from localStorage
    // This handles cases where the component remounts or the URL params were already cleaned
    if (step === 'enroll' && email && !name) {
      const storedName = localStorage.getItem('auction_pending_name');
      if (storedName) {
        setName(storedName);
        localStorage.removeItem('auction_pending_name');
      }
    }

    // Check if already enrolled
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled === 'true') {
        // Check if there's a redirect URL (from QR code scan)
        const redirect = localStorage.getItem('auction_redirect');
        const target = redirect || '/';
        if (redirect) {
          localStorage.removeItem('auction_redirect');
        }
        // Use full-page navigation to avoid any SPA routing quirks
        window.location.href = target;
      }
    }
  }, [router]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    // Validate email format first
    if (!email || !email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setSubmitting(true);

    // Step 1: Validate email format and domain
    try {
      const response = await fetch('/api/email/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!data.valid) {
        let errorMsg = data.error || 'Please enter a valid email address';
        if (data.suggestion) {
          errorMsg += ` Did you mean ${data.suggestion}?`;
        }
        setError(errorMsg);
        setSubmitting(false);
        return;
      }
    } catch (err) {
      console.error('Email validation error:', err);
      setError(
        'Unable to verify email address. Please check for typos and try again.'
      );
      setSubmitting(false);
      return;
    }

    // Step 2: Check for existing alias - if found, log them in
    const isRecovery =
      typeof window !== 'undefined' &&
      localStorage.getItem(ENROLLMENT_KEY) !== 'true';

    try {
      const response = await fetch('/api/alias/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.alias) {
        // Existing user — log them in (cookie set by api/alias/get) and redirect
        if (typeof window !== 'undefined') {
          localStorage.setItem(ENROLLMENT_KEY, 'true');
          const bidderName =
            data.alias.name || name.trim() || data.alias.alias;
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              email: email.trim(),
              bidder_name: bidderName,
              alias: data.alias,
            })
          );

          if (isRecovery && !hasSentRecoveryNotification) {
            setHasSentRecoveryNotification(true);
            fetch('/api/alias/security-notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim() }),
            }).catch((err) =>
              console.error('Security notification error:', err)
            );
          }

          setSubmitting(false);
          const redirect = localStorage.getItem('auction_redirect');
          const target = redirect || '/';
          if (redirect) {
            localStorage.removeItem('auction_redirect');
          }
          // Use full-page navigation so login works reliably in production
          window.location.href = target;
          return;
        }
      }
    } catch (err) {
      console.error('Error checking existing alias on submit:', err);
    }

    // Step 3: New user — name is required
    if (!name || name.trim().length === 0) {
      setError('Please enter your name to create your bidder profile');
      setSubmitting(false);
      return;
    }

    // Step 4: Send verification email
    try {
      const response = await fetch('/api/email/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          company_website: honeypot,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.hasExistingAlias) {
          setError(data.error || 'This email already has an alias');
          try {
            const aliasResponse = await fetch('/api/alias/get', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: email.trim() }),
            });
            const aliasData = await aliasResponse.json();
            if (aliasData.alias && typeof window !== 'undefined') {
              localStorage.setItem(ENROLLMENT_KEY, 'true');
              const bidderName =
                aliasData.alias.name || name.trim() || aliasData.alias.alias;
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                  email: email.trim(),
                  bidder_name: bidderName,
                  alias: aliasData.alias,
                })
              );
              setSubmitting(false);
              // Full-page navigation after logging in existing alias
              window.location.href = '/';
              return;
            }
          } catch (err) {
            console.error('Error fetching existing alias:', err);
          }
        } else {
          setError(
            data.error || 'Failed to send verification email. Please try again.'
          );
        }
        setSubmitting(false);
        return;
      }

      // Verification email sent — store name for after verification
      if (typeof window !== 'undefined' && name && name.trim()) {
        localStorage.setItem('auction_pending_name', name.trim());
      }

      setVerificationSent(true);
      setVerifiedEmail(email.trim());
      setStep('verify');
      setError('');
    } catch (err) {
      console.error('Error sending verification email:', err);
      setError('Failed to send verification email. Please try again.');
    }

    setSubmitting(false);
  };

  const handleAliasSelected = (alias) => {
    // Only proceed if email is verified
    if (alias && !alias.email_verified) {
      // Don't save enrollment yet - user needs to verify email first
      setError(
        'Please check your email and verify your address before continuing.'
      );
      return;
    }

    // Save enrollment (only after verification)
    if (typeof window !== 'undefined') {
      localStorage.setItem(ENROLLMENT_KEY, 'true');
      // Store name from alias object if available, otherwise from form
      const bidderName = alias?.name || name.trim();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          email,
          bidder_name: bidderName,
          alias: alias,
        })
      );

      // Check if there's a redirect URL (from QR code scan)
      const redirect = localStorage.getItem('auction_redirect');
      if (redirect) {
        localStorage.removeItem('auction_redirect');
        window.location.href = redirect;
      } else {
        // Redirect to Dashboard after creating avatar
        window.location.href = '/avatar';
      }
    }
  };

  // Verification step - show message to check email
  if (step === 'verify') {
    return (
      <div className='w-full px-4 py-4 pb-8'>
        <div className='w-full max-w-lg mx-auto'>
          <div className='bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden'>
            {/* Header */}
            <div
              className='px-4 py-5 text-center'
              style={{
                backgroundColor: '#1e293b',
              }}
            >
              <div className='flex flex-col items-center justify-center mb-3'>
                <div className='w-24 h-24 mb-3 relative'>
                  <Image
                    src='/logo-with-glow.png'
                    alt='Mary Frank Elementary'
                    fill
                    className='object-contain drop-shadow-lg'
                    priority
                    sizes='96px'
                    loading='eager'
                  />
                </div>
              </div>
              <h1 className='text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-1.5'>
                Check Your Email
              </h1>
            </div>

            {/* Content */}
            <div className='px-4 sm:px-5 md:px-6 py-4 sm:py-5'>
              <div className='text-center mb-4'>
                <div className='mb-4'>
                  <svg
                    className='w-16 h-16 mx-auto text-primary'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                    style={{ color: 'var(--primary-500)' }}
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                    />
                  </svg>
                </div>
                <h2 className='text-xl font-bold text-gray-900 mb-2'>
                  Verification Email Sent
                </h2>
                <p className='text-gray-700 mb-4'>
                  We've sent a verification email to:
                </p>
                <p
                  className='text-lg font-semibold text-primary mb-4 break-all'
                  style={{ color: 'var(--primary-500)' }}
                >
                  {verifiedEmail}
                </p>
                <p className='text-gray-600 mb-4'>
                  Please check your inbox and click the verification link to
                  continue creating your alias.
                </p>
                <p className='text-sm text-gray-500 mb-4'>
                  The verification link will expire in 24 hours.
                </p>
                {error && (
                  <div className='mt-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
                    <p className='text-sm text-red-700'>{error}</p>
                  </div>
                )}
                <div className='mt-6 space-y-2'>
                  <button
                    onClick={() => {
                      setStep('intro');
                      setError('');
                      setVerificationSent(false);
                    }}
                    className='w-full px-4 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors'
                  >
                    Change Email
                  </button>
                  <p className='text-xs text-gray-500'>
                    Didn't receive the email? Check your spam folder or try
                    again.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'intro') {
    return (
      <div className='w-full px-4 py-4 pb-8'>
        <div className='w-full max-w-lg mx-auto'>
          {/* Hero Card */}
          <div className='bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden'>
            {/* Header Section */}
            <div
              className='px-4 py-5 text-center'
              style={{
                backgroundColor: '#1e293b',
              }}
            >
              <div className='flex flex-col items-center justify-center mb-3'>
                <div className='w-24 h-24 mb-3 relative'>
                  <Image
                    src='/logo-with-glow.png'
                    alt='Mary Frank Elementary'
                    fill
                    sizes='96px'
                    className='object-contain drop-shadow-lg'
                    priority
                    loading='eager'
                  />
                </div>
              </div>
              <h1 className='text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-1.5'>
                Bidder Check-In
              </h1>
              <p className='text-white/90 text-sm leading-snug max-w-md mx-auto'>
                Enter your name and email to get started or sign back in.
              </p>
            </div>

            {/* Content Section */}
            <div className='px-4 sm:px-5 md:px-6 py-4 sm:py-5'>
              {/* Form */}
              <form onSubmit={handleEmailSubmit} className='space-y-3'>
                <div>
                  <label
                    htmlFor={nameInputId}
                    className='block text-sm font-semibold text-gray-900 mb-1'
                  >
                    Your Name
                  </label>
                  <input
                    id={nameInputId}
                    type='text'
                    className='w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base'
                    placeholder='Jane Doe'
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    aria-describedby={`${nameInputId}-helper`}
                  />
                  <p id={`${nameInputId}-helper`} className='text-xs text-gray-500 mt-1'>
                    Returning users can leave this blank.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor={emailInputId}
                    className='block text-sm font-semibold text-gray-900 mb-1'
                  >
                    Your Email
                  </label>
                  <input
                    id={emailInputId}
                    type='email'
                    className='w-full px-3 py-3 border-2 border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base'
                    placeholder='your@email.com'
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    required
                    aria-required='true'
                    aria-describedby={
                      [
                        `${emailInputId}-helper`,
                        error ? `${emailInputId}-error` : null,
                      ]
                        .filter(Boolean)
                        .join(' ') || undefined
                    }
                    aria-invalid={Boolean(error)}
                  />
                  <p id={`${emailInputId}-helper`} className='sr-only'>
                    Enter the email address that will receive verification and
                    bid updates.
                  </p>
                  {error && (
                    <p
                      id={`${emailInputId}-error`}
                      className='mt-1 text-sm text-red-600 flex items-center gap-1.5'
                      role='alert'
                      aria-live='assertive'
                    >
                      <svg
                        className='w-4 h-4'
                        fill='currentColor'
                        viewBox='0 0 20 20'
                      >
                        <path
                          fillRule='evenodd'
                          d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                          clipRule='evenodd'
                        />
                      </svg>
                      {error}
                    </p>
                  )}
                </div>

                {/* Honeypot field - hidden from users, bots will fill it */}
                <div style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                  <label htmlFor={honeypotId}>Company Website (leave blank)</label>
                  <input
                    id={honeypotId}
                    type="text"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                  />
                </div>

                <button
                  type='submit'
                  disabled={submitting}
                  className='w-full text-white font-semibold py-3.5 px-4 rounded-lg shadow-md active:shadow-lg transition-all duration-200 text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
                  style={{
                    backgroundColor: 'var(--primary-500)',
                    minHeight: '48px',
                  }}
                >
                  {submitting ? (
                    <>
                      <svg
                        className='animate-spin h-4 w-4'
                        xmlns='http://www.w3.org/2000/svg'
                        fill='none'
                        viewBox='0 0 24 24'
                      >
                        <circle
                          className='opacity-25'
                          cx='12'
                          cy='12'
                          r='10'
                          stroke='currentColor'
                          strokeWidth='4'
                        ></circle>
                        <path
                          className='opacity-75'
                          fill='currentColor'
                          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        ></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Check In'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Footer Note */}
          <p className='mt-3 text-center text-xs text-gray-500'>
            Your information is secure and will only be used for bidding
            purposes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AliasSelector
        email={email}
        name={name}
        onAliasSelected={handleAliasSelected}
        isModal={true}
        onClose={() => setStep('intro')}
      />
    </>
  );
}
