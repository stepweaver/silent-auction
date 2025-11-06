'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function VendorEnrollPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  async function authenticateWithToken(token) {
    setIsAuthenticating(true);
    setMsg('');

    try {
      const res = await fetch('/api/vendor-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(text || 'Invalid or expired enrollment link');
        setIsAuthenticating(false);
        return;
      }

      const data = await res.json();
      
      // Store vendor admin session
      localStorage.setItem('vendor_admin_id', data.vendor_admin_id);
      localStorage.setItem('vendor_admin_email', data.email);
      localStorage.setItem('vendor_admin_name', data.name);

      // Redirect directly to add items page
      router.push('/vendor/items/new');
    } catch (err) {
      setMsg('Error authenticating');
      console.error(err);
      setIsAuthenticating(false);
    }
  }

  // Auto-authenticate if token is provided in URL
  useEffect(() => {
    const token = searchParams?.get('token');
    if (token && !isAuthenticating) {
      authenticateWithToken(token);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg('');

    try {
      const res = await fetch('/api/vendor-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(text || 'Invalid email or not registered as donor');
        return;
      }

      const data = await res.json();
      
      // Store vendor admin session
      localStorage.setItem('vendor_admin_id', data.vendor_admin_id);
      localStorage.setItem('vendor_admin_email', data.email);
      localStorage.setItem('vendor_admin_name', data.name);

      // Redirect to donor dashboard
      router.push('/vendor');
    } catch (err) {
      setMsg('Error logging in');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Show loading state while authenticating with token
  if (isAuthenticating) {
    return (
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl">
            <div className="px-4 sm:px-6 py-12 text-center">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: '#00b140' }}></div>
              <p className="text-xs sm:text-sm text-gray-600">Authenticating...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-4 sm:py-6 pb-8 sm:pb-10">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1.5" style={{ color: '#00b140' }}>Donor Login</h1>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              Enter your registered email to access your donor dashboard and manage your items.
            </p>

            {msg && (
              <div
                className={`mb-4 p-3 rounded-lg border text-xs sm:text-sm ${
                  msg.includes('Error') || msg.includes('Invalid') || msg.includes('not registered')
                    ? 'text-red-700'
                    : 'text-green-700'
                }`}
                style={msg.includes('Error') || msg.includes('Invalid') || msg.includes('not registered') ? {
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  borderColor: 'rgba(239, 68, 68, 0.2)'
                } : {
                  backgroundColor: 'rgba(0, 177, 64, 0.05)',
                  borderColor: 'rgba(0, 177, 64, 0.2)'
                }}
              >
                {msg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-900 mb-1">Email</label>
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="your@email.com"
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2.5 text-white font-semibold rounded-lg text-sm sm:text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: '#00b140' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-xs text-gray-500">or</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            <div className="text-center">
              <Link 
                href="/" 
                className="text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                style={{ color: '#00b140' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#00b140';
                }}
              >
                Back to Catalog
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

