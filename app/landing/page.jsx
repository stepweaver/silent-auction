'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AliasSelector from '@/components/AliasSelector';

const STORAGE_KEY = 'auction_bidder_info';
const ENROLLMENT_KEY = 'auction_enrolled';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('intro'); // 'intro', 'enroll'

  useEffect(() => {
    // Check if already enrolled
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled === 'true') {
        // Check if there's a redirect URL (from QR code scan)
        const redirect = localStorage.getItem('auction_redirect');
        if (redirect) {
          localStorage.removeItem('auction_redirect');
          router.push(redirect);
        } else {
          router.push('/');
        }
      }
    }
  }, [router]);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!name || name.trim().length === 0) {
      setError('Please enter your name');
      return;
    }
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setStep('enroll');
    setError('');
  };

  const handleAliasSelected = (alias) => {
    // Save enrollment
    if (typeof window !== 'undefined') {
      localStorage.setItem(ENROLLMENT_KEY, 'true');
      // Store name from alias object if available, otherwise from form
      const bidderName = alias?.name || name.trim();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        email,
        bidder_name: bidderName,
        alias: alias,
      }));
      
      // Check if there's a redirect URL (from QR code scan)
      const redirect = localStorage.getItem('auction_redirect');
      if (redirect) {
        localStorage.removeItem('auction_redirect');
        router.push(redirect);
      } else {
        router.push('/');
      }
    }
  };

  if (step === 'intro') {
    return (
      <div className="w-full px-4 py-4 sm:py-6 pb-8 sm:pb-10">
        <div className="w-full max-w-lg mx-auto">
          {/* Hero Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header Section */}
            <div 
              className="px-4 py-5 sm:px-6 sm:py-6 text-center"
              style={{
                backgroundColor: '#1e293b'
              }}
            >
              <div className="flex flex-col items-center justify-center mb-3">
                <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mb-3 relative">
                  <Image
                    src="/logo-with-glow.png"
                    alt="Mary Frank Elementary"
                    fill
                    className="object-contain drop-shadow-lg"
                    priority
                  />
                </div>
              </div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-1.5">
                Welcome to the Silent Auction
              </h1>
              <p className="text-white/90 text-xs leading-snug max-w-md mx-auto">
                Join the fun and bid on amazing items! Create your unique alias to get started.
              </p>
            </div>

            {/* Content Section */}
            <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
              {/* Quick Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-5">
                <div className="flex items-start gap-2 p-2 sm:p-2.5 rounded-lg border" style={{ backgroundColor: 'rgba(0, 177, 64, 0.05)', borderColor: 'rgba(0, 177, 64, 0.2)' }}>
                  <div 
                    className="flex-shrink-0 w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center"
                    style={{ backgroundColor: '#00b140' }}
                  >
                    1
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-0.5">Create Identity</h3>
                    <p className="text-xs text-gray-600 leading-tight">Choose a fun color and emoji</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 sm:p-2.5 rounded-lg border" style={{ backgroundColor: 'rgba(5, 150, 105, 0.05)', borderColor: 'rgba(5, 150, 105, 0.2)' }}>
                  <div 
                    className="flex-shrink-0 w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center"
                    style={{ backgroundColor: '#059669' }}
                  >
                    2
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-0.5">Browse & Bid</h3>
                    <p className="text-xs text-gray-600 leading-tight">Explore and place bids</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2 sm:p-2.5 rounded-lg border" style={{ backgroundColor: 'rgba(74, 222, 128, 0.05)', borderColor: 'rgba(74, 222, 128, 0.2)' }}>
                  <div 
                    className="flex-shrink-0 w-7 h-7 rounded-lg text-white font-bold text-xs flex items-center justify-center"
                    style={{ backgroundColor: '#4ade80' }}
                  >
                    3
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-0.5">Stay Anonymous</h3>
                    <p className="text-xs text-gray-600 leading-tight">Bid with your alias</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleEmailSubmit} className="space-y-3">
                <div>
                  <label htmlFor="name" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                    Your Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm sm:text-base"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError('');
                    }}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                    Your Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm sm:text-base"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    required
                  />
                  {error && (
                    <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-sm sm:text-base"
                  style={{ backgroundColor: '#00b140' }}
                >
                  Get Started →
                </button>
              </form>
            </div>
          </div>

          {/* Footer Note */}
          <p className="mt-3 text-center text-xs text-gray-500">
            Your information is secure and will only be used for bidding purposes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-0 px-4 py-4 sm:py-6 pb-8 sm:pb-10">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => setStep('intro')}
          className="mb-4 sm:mb-6 flex items-center gap-2 text-sm sm:text-base text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <AliasSelector
          email={email}
          name={name}
          onAliasSelected={handleAliasSelected}
        />
      </div>
    </div>
  );
}
