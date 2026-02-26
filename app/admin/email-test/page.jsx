'use client';

import { useState } from 'react';

export default function EmailTestPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email?.trim();
    if (!trimmed) {
      setStatus({ ok: false, error: 'Please enter an email address.' });
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/email-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ ok: false, error: data.error || 'Request failed' });
        return;
      }
      setStatus({ ok: true, sent: data.sent, failed: data.failed, failedDetails: data.failedDetails });
    } catch (err) {
      setStatus({ ok: false, error: err.message || 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">Email Test</h1>
      <p className="text-sm text-gray-600 mb-4">
        Send all email types to one address. Only the email you enter will receive anything. No auction actions are triggered.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
            disabled={loading}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
        >
          {loading ? 'Sending…' : 'Send all test emails'}
        </button>
      </form>
      {status && (
        <div
          className={`mt-4 p-3 rounded-md text-sm ${
            status.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {status.ok ? (
            <>
              <p className="font-medium">Done.</p>
              <p className="mt-1">
                Sent: {status.sent?.join(', ') || 'none'}.
              </p>
              {status.failed?.length ? (
                <div className="mt-2">
                  <p className="font-medium">Failed: {status.failed.join(', ')}</p>
                  {status.failedDetails?.length ? (
                    <ul className="mt-1 list-disc list-inside text-xs opacity-90">
                      {status.failedDetails.map((f, i) => (
                        <li key={i}>{typeof f === 'string' ? f : `${f.name}: ${f.error}`}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p>{status.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
