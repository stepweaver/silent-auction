'use client';

import { useState, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
import { formatDollar } from '@/lib/money';
import AliasAvatar from '@/components/AliasAvatar';

const STORAGE_KEY = 'auction_bidder_info';
const ENROLLMENT_KEY = 'auction_enrolled';

const SUGGESTED_AMOUNTS = [10, 25, 50, 100];

export default function DonateForm({ deadline }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAlias, setUserAlias] = useState(null);
  const [savedEmail, setSavedEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const amountInputId = useId();
  const messageInputId = useId();

  const hasStatusMessage = Boolean(msg);
  const statusLower = msg.toLowerCase();
  const isErrorMessage = hasStatusMessage && (
    statusLower.includes('error') ||
    statusLower.includes('invalid') ||
    statusLower.includes('failed') ||
    statusLower.includes('closed') ||
    statusLower.includes('must') ||
    statusLower.includes('please verify')
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled !== 'true') {
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

    const numAmount = Number(amount);
    if (!amount || numAmount <= 0) {
      setMsg('Please enter a valid donation amount.');
      return;
    }

    setIsSubmitting(true);
    setMsg('');
    setIsSuccess(false);

    try {
      let donorName = userAlias?.name;
      if (!donorName && typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            donorName = parsed.bidder_name;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      donorName = donorName || userAlias?.alias || 'Anonymous';

      const { getJsonHeadersWithCsrf } = await import('@/lib/clientCsrf');
      const headers = await getJsonHeadersWithCsrf();
      if (!headers['x-csrf-token']) {
        setMsg('Security token missing. Please refresh the page and try again.');
        return;
      }

      const res = await fetch('/api/donate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          donor_name: donorName,
          email,
          amount: numAmount,
          message: message.trim() || null,
        }),
      });

      if (res.ok) {
        setMsg(`Thank you for your generous pledge of ${formatDollar(numAmount)}! You'll receive payment instructions when the auction closes.`);
        setIsSuccess(true);
        setAmount('');
        setMessage('');
      } else {
        const contentType = res.headers.get('content-type');
        const isJson = contentType && contentType.includes('application/json');
        const errMsg = isJson ? (await res.json()).error : await res.text();
        setMsg(errMsg || 'Failed to submit donation pledge.');
      }
    } catch (error) {
      setMsg('Error submitting donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: 'var(--primary-500)' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!userAlias) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
          <div
            className="rounded-lg p-4 border text-sm"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              borderColor: 'rgba(239, 68, 68, 0.2)',
              color: '#dc2626',
            }}
          >
            <p className="font-semibold mb-2">No alias found</p>
            <p className="text-xs mb-3">You need to create your alias before making a donation pledge.</p>
            <button
              type="button"
              onClick={() => router.push('/landing')}
              className="px-4 py-2 text-white font-semibold rounded-lg text-sm transition-all duration-200"
              style={{ backgroundColor: 'var(--primary-500)' }}
            >
              Create Alias
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
        <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
          <div className="mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">Pledge a Donation</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Support the auction with a direct donation — no item needed!
            </p>
          </div>

          {userAlias && (
            <div
              className="rounded-lg p-3 mb-4 border"
              style={{
                backgroundColor: 'rgba(0, 177, 64, 0.05)',
                borderColor: 'rgba(0, 177, 64, 0.2)',
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
                  <div className="font-bold text-sm text-gray-900">Donating as: {userAlias.name || userAlias.alias}</div>
                  <div className="text-xs text-gray-600">{savedEmail}</div>
                </div>
              </div>
            </div>
          )}

          <div className="h-px bg-gray-200 my-4"></div>

          {isSuccess ? (
            <div
              className="rounded-lg p-5 border-2 text-center"
              style={{
                backgroundColor: 'rgba(4, 122, 44, 0.08)',
                borderColor: 'rgba(4, 122, 44, 0.3)',
              }}
            >
              <div className="text-3xl mb-2">🎉</div>
              <p className="font-semibold text-green-700 text-sm sm:text-base">{msg}</p>
              <button
                type="button"
                onClick={() => { setIsSuccess(false); setMsg(''); }}
                className="mt-4 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 text-white"
                style={{ backgroundColor: 'var(--primary-500)' }}
              >
                Make Another Pledge
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor={amountInputId}
                  className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1"
                >
                  Donation Amount
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SUGGESTED_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
                      className={`px-3 py-1.5 text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${
                        Number(amount) === preset
                          ? 'text-white border-transparent'
                          : 'text-gray-700 border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={
                        Number(amount) === preset
                          ? { backgroundColor: 'var(--primary-500)', borderColor: 'var(--primary-500)' }
                          : {}
                      }
                    >
                      {formatDollar(preset)}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">$</span>
                  <input
                    id={amountInputId}
                    type="number"
                    step="0.01"
                    min="1"
                    className="w-full px-3 pl-8 py-3 border-2 border-gray-200 rounded-lg outline-none transition-all text-base"
                    style={{ borderColor: 'rgb(229 231 235)' }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary-500)';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 120, 87, 0.25)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor={messageInputId}
                  className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1"
                >
                  Message <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  id={messageInputId}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm resize-none"
                  style={{ borderColor: 'rgb(229 231 235)' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-500)';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(4, 120, 87, 0.25)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Leave a message of support (optional)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  rows={3}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">{message.length}/500</p>
              </div>

              {deadline && (
                <div
                  className="rounded-lg p-3 border text-xs"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderColor: 'rgba(59, 130, 246, 0.2)',
                    color: '#1e40af',
                  }}
                >
                  <strong>Auction closes:</strong> {new Date(deadline).toLocaleString()}
                </div>
              )}

              {hasStatusMessage && !isSuccess && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className={`rounded-lg p-4 border-2 text-xs sm:text-sm ${
                    isErrorMessage ? 'text-red-800' : 'text-green-700'
                  }`}
                  style={
                    isErrorMessage
                      ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.4)' }
                      : { backgroundColor: 'rgba(4, 122, 44, 0.08)', borderColor: 'rgba(4, 122, 44, 0.3)' }
                  }
                >
                  <span className="font-semibold">{msg}</span>
                </div>
              )}

              <div
                className="rounded-lg p-3 border text-xs text-gray-600"
                style={{
                  backgroundColor: 'rgba(249, 250, 251, 1)',
                  borderColor: 'rgba(229, 231, 235, 1)',
                }}
              >
                Your pledge is a commitment to donate. You will receive payment instructions via email when the auction closes.
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="w-full px-4 py-3.5 text-white font-semibold rounded-lg text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--primary-500)', minHeight: '48px' }}
                  disabled={isSubmitting || !userAlias}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    'Pledge Donation'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
