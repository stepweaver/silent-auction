'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const token = searchParams?.get('token');
    const emailParam = searchParams?.get('email');
    
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided. Please check your email for the verification link.');
      return;
    }

    // Verify the email
    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/alias/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.verified) {
          setStatus('success');
          setMessage(data.message || 'Your email has been verified successfully! You can now create your alias and start bidding.');
          
          // Store alias info in localStorage if provided
          if (data.alias && typeof window !== 'undefined') {
            localStorage.setItem('auction_enrolled', 'true');
            localStorage.setItem(
              'auction_bidder_info',
              JSON.stringify({
                email: data.alias.email,
                bidder_name: data.alias.name || data.alias.alias,
                alias: data.alias,
              })
            );
            
            // If alias already exists and is verified, go to main page
            if (data.alias.email_verified) {
              setTimeout(() => {
                router.push('/');
              }, 2000);
              return;
            }
          }

          // If no alias exists yet, redirect to landing page to create one
          // Use email from API response first (URL param can be stripped by some email clients)
          const emailForRedirect = data.email || searchParams?.get('email') || '';
          setTimeout(() => {
            if (emailForRedirect) {
              router.push(`/landing?verified=true&email=${encodeURIComponent(emailForRedirect)}`);
            } else {
              router.push('/landing?verified=true');
            }
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may have expired or is invalid.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('An error occurred while verifying your email. Please try again or contact support.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className='w-full min-h-screen px-4 py-8 flex items-center justify-center'>
      <div className='w-full max-w-md'>
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
                />
              </div>
            </div>
            <h1 className='text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-1.5'>
              Email Verification
            </h1>
          </div>

          {/* Content */}
          <div className='px-4 sm:px-5 md:px-6 py-4 sm:py-5'>
            {status === 'verifying' && (
              <div className='text-center'>
                <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4' style={{ borderColor: 'var(--primary-500)' }}></div>
                <p className='text-gray-700'>{message}</p>
              </div>
            )}

            {status === 'success' && (
              <div className='text-center'>
                <div className='mb-4'>
                  <svg
                    className='w-16 h-16 mx-auto text-green-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <h2 className='text-xl font-bold text-gray-900 mb-2'>Email Verified!</h2>
                <p className='text-gray-700 mb-4'>{message}</p>
                <p className='text-sm text-gray-500'>Redirecting you to the auction...</p>
              </div>
            )}

            {status === 'error' && (
              <div className='text-center'>
                <div className='mb-4'>
                  <svg
                    className='w-16 h-16 mx-auto text-red-500'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <h2 className='text-xl font-bold text-gray-900 mb-2'>Verification Failed</h2>
                <p className='text-gray-700 mb-4'>{message}</p>
                <button
                  onClick={() => router.push('/landing')}
                  className='px-4 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors'
                  style={{ backgroundColor: 'var(--primary-500)' }}
                >
                  Go to Registration
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className='w-full min-h-screen px-4 py-8 flex items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4' style={{ borderColor: 'var(--primary-500)' }}></div>
          <p className='text-gray-700'>Loading...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

