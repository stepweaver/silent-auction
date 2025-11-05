'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';

const ENROLLMENT_KEY = 'auction_enrolled';

export default function PaymentInstructionsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check enrollment
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled !== 'true') {
        window.location.href = '/landing';
        return;
      }
    }

    // Load settings
    const loadSettings = async () => {
      const s = supabaseBrowser();
      try {
        const { data, error } = await s
          .from('settings')
          .select('*')
          .eq('id', 1)
          .maybeSingle();

        if (error) throw error;
        setSettings(data);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-primary mb-2">Payment Instructions</h1>
        <p className="text-base-content/70 text-lg">
          Congratulations on your winning bids! Here's how to complete your payment.
        </p>
      </div>

      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <div className="space-y-6">
            {settings?.payment_instructions ? (
              <div>
                <h2 className="text-2xl font-bold text-primary mb-3">Payment</h2>
                <div className="bg-info/10 border border-info/30 rounded-xl p-4">
                  <p className="text-base-content whitespace-pre-line">
                    {settings.payment_instructions}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-primary mb-3">Payment</h2>
                <div className="alert alert-info">
                  <span>Payment instructions will be available soon. Please check back later or contact the event organizers.</span>
                </div>
              </div>
            )}

            {settings?.pickup_instructions && (
              <div>
                <h2 className="text-2xl font-bold text-primary mb-3">Pickup</h2>
                <div className="bg-success/10 border border-success/30 rounded-xl p-4">
                  <p className="text-base-content whitespace-pre-line">
                    {settings.pickup_instructions}
                  </p>
                </div>
              </div>
            )}

            {settings?.contact_email && (
              <div>
                <h2 className="text-2xl font-bold text-primary mb-3">Questions?</h2>
                <div className="bg-base-200 rounded-xl p-4">
                  <p className="text-base-content">
                    Contact us at:{' '}
                    <a href={`mailto:${settings.contact_email}`} className="link link-primary">
                      {settings.contact_email}
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="divider my-6"></div>

          <div className="flex gap-3">
            <Link href="/avatar" className="btn btn-primary">
              ← Back to Dashboard
            </Link>
            <Link href="/" className="btn btn-ghost">
              View Catalog
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

