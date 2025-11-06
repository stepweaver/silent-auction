'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatDollar } from '@/lib/money';
import AliasAvatar from '@/components/AliasAvatar';

const STORAGE_KEY = 'auction_bidder_info';
const ENROLLMENT_KEY = 'auction_enrolled';

export default function BidForm({ slug, itemId, nextMin, deadline, onSubmit, message }) {
  const router = useRouter();
  const [form, setForm] = useState({ amount: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAlias, setUserAlias] = useState(null);
  const [savedEmail, setSavedEmail] = useState('');
  const [msg, setMsg] = useState(message || '');
  const [loading, setLoading] = useState(true);

  // Load alias from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled !== 'true') {
        // Redirect to landing page if not enrolled
        router.push('/landing');
        return;
      }

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.alias && parsed.email) {
            setUserAlias(parsed.alias);
            setSavedEmail(parsed.email);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      setLoading(false);
    }
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!userAlias) {
      setMsg('Error: Alias not found. Please create your alias first.');
      router.push('/landing');
      return;
    }

    // Get email from localStorage (associated with alias)
    let email = '';
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          email = parsed.email || '';
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    if (!email) {
      setMsg('Error: Email not found. Please create your alias again.');
      router.push('/landing');
      return;
    }

    if (!form.amount || Number(form.amount) < nextMin) {
      setMsg(`Minimum bid is ${formatDollar(nextMin)}`);
      return;
    }

    setIsSubmitting(true);
    setMsg('');
    try {
      // Get name from alias object (from database), fallback to localStorage, then alias name
      let bidderName = userAlias?.name;
      if (!bidderName && typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            bidderName = parsed.bidder_name;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      bidderName = bidderName || userAlias?.alias || 'Anonymous';
      
      await onSubmit({ 
        slug, 
        item_id: itemId, 
        email: email, 
        bidder_name: bidderName,
        amount: Number(form.amount) 
      });
      // Clear amount and message but keep email/alias
      setForm({ amount: '' });
      setMsg('');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show loading state while checking alias
  if (loading) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: '#00b140' }}></div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if no alias found
  if (!userAlias) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
          <div 
            className="rounded-lg p-4 border text-sm"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              color: '#dc2626'
            }}
          >
            <p className="font-semibold mb-2">No alias found</p>
            <p className="text-xs mb-3">You need to create your bidding alias before placing bids.</p>
            <button
              type="button"
              onClick={() => router.push('/landing')}
              className="px-4 py-2 text-white font-semibold rounded-lg text-sm transition-all duration-200"
              style={{ backgroundColor: '#00b140' }}
            >
              Create Alias →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bid Form - Only show bid amount input
  return (
    <div>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
          <div className="mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Place Your Bid</h3>
            <p className="text-xs sm:text-sm text-gray-600">Enter your bid amount</p>
          </div>

          {/* Alias Display */}
          {userAlias && (
            <div 
              className="rounded-lg p-3 mb-4 border"
              style={{ 
                backgroundColor: 'rgba(0, 177, 64, 0.05)',
                borderColor: 'rgba(0, 177, 64, 0.2)'
              }}
            >
              <div className="flex items-center gap-3">
                <AliasAvatar 
                  alias={userAlias.alias} 
                  color={userAlias.color} 
                  animal={userAlias.animal}
                  size="sm" 
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm text-gray-900">Bidding as: {userAlias.alias}</div>
                  <div className="text-xs text-gray-600">This is how others see your bids</div>
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-gray-200 my-4"></div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                Your bid amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min={nextMin}
                  className="w-full px-3 pl-8 py-3 border-2 border-gray-200 rounded-lg outline-none transition-all text-base"
                  style={{
                    borderColor: 'rgb(229 231 235)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#00b140';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 177, 64, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder={formatDollar(nextMin)}
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Minimum bid: <span className="font-semibold" style={{ color: '#00b140' }}>{formatDollar(nextMin)}</span>
              </p>
            </div>
            {deadline && (
              <div 
                className="rounded-lg p-3 border text-xs"
                style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  borderColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#1e40af'
                }}
              >
                <strong>Bidding closes:</strong> {new Date(deadline).toLocaleString()}
              </div>
            )}
            {savedEmail && (
              <div className="text-xs text-gray-500 mt-2">
                Confirmation email will be sent to: <span className="font-medium text-gray-700">{savedEmail}</span>
              </div>
            )}
            {(message || msg) && (
              <div 
                className={`rounded-lg p-3 border text-xs sm:text-sm ${
                  (message || msg).includes('Error') 
                    ? 'text-red-700' 
                    : 'text-green-700'
                }`}
                style={(message || msg).includes('Error') ? {
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderColor: 'rgba(239, 68, 68, 0.2)'
                } : {
                  backgroundColor: 'rgba(0, 177, 64, 0.05)',
                  borderColor: 'rgba(0, 177, 64, 0.2)'
                }}
              >
                <span className="font-semibold">{message || msg}</span>
              </div>
            )}
            <div className="pt-4 border-t border-gray-200">
              <button
                type="submit"
                  className="w-full px-4 py-3.5 text-white font-semibold rounded-lg text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#00b140', minHeight: '48px' }}
                  disabled={isSubmitting || !userAlias}
                >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Placing bid...
                  </>
                ) : (
                  'Place Bid'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
