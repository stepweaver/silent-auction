'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <main className="w-full px-4 py-8 sm:py-12">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 sm:p-8">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Poor connection or a temporary glitch. Please try again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2.5 rounded-lg font-semibold text-white"
              style={{ backgroundColor: 'var(--primary-500)' }}
            >
              Try again
            </button>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-lg font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Go to catalog
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
