'use client';

import { useState, useEffect } from 'react';
import { formatDollar } from '@/lib/money';
import AliasSelector from '@/components/AliasSelector';
import AliasAvatar from '@/components/AliasAvatar';

const STORAGE_KEY = 'auction_bidder_info';

export default function BidForm({ slug, itemId, nextMin, deadline, onSubmit, message }) {
  // Load from localStorage on mount
  const [form, setForm] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            email: parsed.email || '',
            amount: '',
          };
        } catch (e) {
          return { email: '', amount: '' };
        }
      }
    }
    return { email: '', amount: '' };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAlias, setUserAlias] = useState(null);
  const [checkingAlias, setCheckingAlias] = useState(false);
  const [step, setStep] = useState('alias'); // 'alias' or 'bid'
  const [msg, setMsg] = useState(message || '');
  const [savedEmail, setSavedEmail] = useState('');

  // Load alias from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.alias && parsed.email) {
            setUserAlias(parsed.alias);
            setSavedEmail(parsed.email);
            setForm(prev => ({ ...prev, email: parsed.email }));
            setStep('bid'); // Skip to bid form if we have alias
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, []);

  // Save to localStorage when form changes (except amount)
  useEffect(() => {
    if (typeof window !== 'undefined' && form.email) {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      const toStore = {
        email: form.email,
        bidder_name: parsed.bidder_name || '',
        alias: userAlias,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
  }, [form.email, userAlias]);

  // Check for existing alias when component mounts or email is entered
  useEffect(() => {
    const checkAlias = async () => {
      if (!form.email || !form.email.includes('@')) {
        return;
      }

      setCheckingAlias(true);
      try {
        const response = await fetch('/api/alias/get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email }),
        });

        const data = await response.json();
        if (data.alias) {
          setUserAlias(data.alias);
          setSavedEmail(form.email);
          setStep('bid'); // Move to bid form if alias exists
          
          // Save to localStorage
          if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(STORAGE_KEY);
          const parsed = stored ? JSON.parse(stored) : {};
          const toStore = {
            email: form.email,
            bidder_name: parsed.bidder_name || '',
            alias: data.alias,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
          }
        }
      } catch (err) {
        console.error('Error checking alias:', err);
      } finally {
        setCheckingAlias(false);
      }
    };

    // Only check if we're on alias step and email is valid
    if (step === 'alias' && form.email && form.email.includes('@')) {
      const timeoutId = setTimeout(checkAlias, 800);
      return () => clearTimeout(timeoutId);
    }
  }, [form.email, step, form.bidder_name]);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!userAlias) {
      setStep('alias');
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
      return;
    }

    setIsSubmitting(true);
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
      setForm(prev => ({ ...prev, amount: '' }));
      setMsg('');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAliasSelected(alias) {
    setUserAlias(alias);
    setSavedEmail(form.email);
    setStep('bid'); // Move to bid form after alias is created
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      const toStore = {
        email: form.email,
        bidder_name: parsed.bidder_name || '',
        alias: alias,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
  }

  // Step 1: Alias Creation
  if (step === 'alias') {
    return (
      <div>
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
            <div className="mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5">Create Your Bidding Alias</h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Choose a fun color and animal to create your secret identity. Your alias keeps your bids anonymous while we track who you are by email.
              </p>
            </div>

            <div className="h-px bg-gray-200 my-4"></div>

            {/* Email input first */}
            <div className="mb-4">
              <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1">
                Enter your email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base"
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
                placeholder="your@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                disabled={checkingAlias}
              />
              <p className="mt-1 text-xs text-gray-500">
                {checkingAlias ? (
                  <span className="flex items-center gap-1.5" style={{ color: '#00b140' }}>
                    <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking for existing alias...
                  </span>
                ) : (
                  'We\'ll check if you already have an alias'
                )}
              </p>
            </div>

            {/* Show existing alias if found */}
            {userAlias && (
              <div 
                className="rounded-lg p-4 mb-4 border"
                style={{ 
                  backgroundColor: 'rgba(0, 177, 64, 0.05)',
                  borderColor: 'rgba(0, 177, 64, 0.2)'
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <AliasAvatar 
                    alias={userAlias.alias} 
                    color={userAlias.color} 
                    animal={userAlias.animal}
                    size="md" 
                  />
                  <div className="flex-1">
                    <div className="font-bold text-sm" style={{ color: '#00b140' }}>Alias Found!</div>
                    <div className="text-xs text-gray-600">You're bidding as: <span className="font-semibold">{userAlias.alias}</span></div>
                  </div>
                </div>
                <button
                  type="button"
                  className="w-full px-4 py-2 text-white font-semibold rounded-lg text-sm transition-all duration-200"
                  style={{ backgroundColor: '#00b140' }}
                  onClick={() => setStep('bid')}
                >
                  Continue to Bid →
                </button>
              </div>
            )}

            {/* Show alias selector if no alias found */}
            {form.email && form.email.includes('@') && !userAlias && !checkingAlias && (
              <div className="mt-4">
                <AliasSelector
                  email={form.email}
                  onAliasSelected={handleAliasSelected}
                />
              </div>
            )}

            {/* Helper text when email not entered */}
            {(!form.email || !form.email.includes('@')) && (
              <div 
                className="rounded-lg p-3 text-center border"
                style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  borderColor: 'rgba(59, 130, 246, 0.2)'
                }}
              >
                <span className="text-xs text-gray-600">Enter your email above to get started</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Bid Form
  return (
    <div>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
          <div className="mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Place Your Bid</h3>
            <p className="text-xs sm:text-sm text-gray-600">Enter your details and bid amount</p>
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
                  className="w-full px-3 pl-8 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base"
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
                className="w-full px-4 py-2.5 text-white font-semibold rounded-lg text-sm sm:text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: '#00b140' }}
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
