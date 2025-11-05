'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VendorEnrollPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        setMsg(text || 'Invalid email or not registered as vendor admin');
        return;
      }

      const data = await res.json();
      
      // Store vendor admin session
      localStorage.setItem('vendor_admin_id', data.vendor_admin_id);
      localStorage.setItem('vendor_admin_email', data.email);
      localStorage.setItem('vendor_admin_name', data.name);

      // Redirect to vendor dashboard
      router.push('/vendor');
    } catch (err) {
      setMsg('Error logging in');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h1 className="text-3xl font-bold text-primary mb-2">Vendor Admin Login</h1>
          <p className="text-base-content/70 mb-6">
            Enter your registered email to access your vendor dashboard and manage your items.
          </p>

          {msg && (
            <div
              className={`mb-4 p-3 rounded ${
                msg.includes('Error') || msg.includes('Invalid') || msg.includes('not registered')
                  ? 'bg-red-100 text-red-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {msg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="divider">or</div>

          <div className="text-center">
            <Link href="/" className="link link-primary">
              Back to Catalog
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

