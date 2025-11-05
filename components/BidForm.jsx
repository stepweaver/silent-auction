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

  // Load alias from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.alias && parsed.email) {
            setUserAlias(parsed.alias);
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
        email: form.email, 
        bidder_name: bidderName,
        amount: Number(form.amount) 
      });
      // Clear amount but keep email/alias
      setForm(prev => ({ ...prev, amount: '' }));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleAliasSelected(alias) {
    setUserAlias(alias);
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
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-2xl border border-base-300 shadow-xl p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-base-content mb-2">Create Your Bidding Alias</h3>
              <p className="text-base text-base-content/70 leading-relaxed">
                Choose a fun color and animal to create your secret identity. Your alias keeps your bids anonymous while we track who you are by email.
              </p>
            </div>
          </div>

          <div className="divider my-6"></div>

          {/* Email input first */}
          <div className="form-control mb-6">
            <label className="label pb-2">
              <span className="label-text font-semibold text-base">Enter your email</span>
            </label>
            <input
              type="email"
              className="input input-bordered input-lg w-full border-2 focus:border-primary focus:outline-none transition-colors"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              disabled={checkingAlias}
            />
            <label className="label pt-2">
              <span className="label-text-alt text-sm">
                {checkingAlias ? (
                  <span className="flex items-center gap-2 text-primary">
                    <span className="loading loading-spinner loading-sm"></span>
                    Checking for existing alias...
                  </span>
                ) : (
                  'We\'ll check if you already have an alias'
                )}
              </span>
            </label>
          </div>

          {/* Show existing alias if found */}
          {userAlias && (
            <div className="bg-success/10 border-2 border-success/30 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <AliasAvatar 
                  alias={userAlias.alias} 
                  color={userAlias.color} 
                  animal={userAlias.animal}
                  size="lg" 
                />
                <div className="flex-1">
                  <div className="font-bold text-lg text-success mb-1">Alias Found!</div>
                  <div className="text-base-content/70">You're bidding as: <span className="font-semibold">{userAlias.alias}</span></div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-success btn-lg w-full"
                onClick={() => setStep('bid')}
              >
                Continue to Bid →
              </button>
            </div>
          )}

          {/* Show alias selector if no alias found */}
          {form.email && form.email.includes('@') && !userAlias && !checkingAlias && (
            <div className="mt-6">
              <AliasSelector
                email={form.email}
                onAliasSelected={handleAliasSelected}
              />
            </div>
          )}

          {/* Helper text when email not entered */}
          {(!form.email || !form.email.includes('@')) && (
            <div className="bg-info/10 border border-info/30 rounded-xl p-4 text-center">
              <span className="text-base-content/70">Enter your email above to get started</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Step 2: Bid Form
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-2xl border border-base-300 shadow-xl p-6 sm:p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">2</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-base-content mb-2">Place Your Bid</h3>
            <p className="text-base text-base-content/70">Enter your details and bid amount</p>
          </div>
        </div>

        {/* Alias Display */}
        {userAlias && (
          <div className="bg-success/10 border-2 border-success/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <AliasAvatar 
                alias={userAlias.alias} 
                color={userAlias.color} 
                animal={userAlias.animal}
                size="md" 
              />
              <div className="flex-1">
                <div className="font-bold text-base-content">Bidding as: {userAlias.alias}</div>
                <div className="text-sm text-base-content/70">This is how others see your bids</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setStep('alias')}
              >
                Change
              </button>
            </div>
          </div>
        )}

        <div className="divider my-6"></div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="form-control">
            <label className="label pb-2">
              <span className="label-text font-semibold text-base">Email</span>
            </label>
            <input
              type="email"
              className="input input-bordered input-lg w-full border-2 focus:border-primary focus:outline-none transition-colors"
              placeholder="your@email.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              disabled={isSubmitting}
            />
            <label className="label pt-2">
              <span className="label-text-alt text-sm">Required for bid confirmation</span>
            </label>
          </div>
          <div className="form-control">
            <label className="label pb-2">
              <span className="label-text font-semibold text-base">Your bid amount</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/50 font-semibold">$</span>
              <input
                type="number"
                step="0.01"
                min={nextMin}
                className="input input-bordered input-lg w-full pl-8 border-2 focus:border-primary focus:outline-none transition-colors"
                placeholder={formatDollar(nextMin)}
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                required
                disabled={isSubmitting}
              />
            </div>
            <label className="label pt-2">
              <span className="label-text-alt text-sm">Minimum bid: <span className="font-semibold text-primary">{formatDollar(nextMin)}</span></span>
            </label>
          </div>
          {deadline && (
            <div className="bg-info/10 border border-info/30 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm"><strong>Bidding closes:</strong> {new Date(deadline).toLocaleString()}</span>
              </div>
            </div>
          )}
          {message && (
            <div className={`rounded-xl p-4 ${message.includes('Error') ? 'bg-error/10 border-2 border-error/30' : 'bg-success/10 border-2 border-success/30'}`}>
              <span className={message.includes('Error') ? 'text-error font-semibold' : 'text-success font-semibold'}>{message}</span>
            </div>
          )}
          <div className="form-control mt-6 pt-4 border-t border-base-300">
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isSubmitting || !userAlias}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
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
  );
}
