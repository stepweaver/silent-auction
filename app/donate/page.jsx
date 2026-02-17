'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import DonateForm from '@/components/DonateForm';

const ENROLLMENT_KEY = 'auction_enrolled';

export default function DonatePage() {
  const router = useRouter();
  const [deadline, setDeadline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const s = supabaseBrowser();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enrolled = localStorage.getItem(ENROLLMENT_KEY);
      if (enrolled !== 'true') {
        router.push('/landing');
        return;
      }
      setCheckingEnrollment(false);
    }
  }, [router]);

  useEffect(() => {
    if (checkingEnrollment) return;

    async function loadSettings() {
      try {
        const { data: settings } = await s
          .from('settings')
          .select('auction_deadline')
          .eq('id', 1)
          .maybeSingle();

        setDeadline(settings?.auction_deadline || null);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [checkingEnrollment]);

  if (checkingEnrollment || loading) {
    return (
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center py-12">
          <div
            className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin"
            style={{ borderTopColor: 'var(--primary-500)' }}
          ></div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-4 pb-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6 text-center">
          <h1
            className="text-2xl sm:text-3xl font-bold mb-2"
            style={{ color: 'var(--primary-700, var(--primary-500))' }}
          >
            Make a Donation
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
            Not bidding on an item? You can still support our cause by pledging
            a donation. Every dollar helps!
          </p>
        </div>

        <DonateForm deadline={deadline} />

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-medium transition-colors hover:underline"
            style={{ color: 'var(--primary-500)' }}
          >
            Back to Catalog
          </button>
        </div>
      </div>
    </main>
  );
}
