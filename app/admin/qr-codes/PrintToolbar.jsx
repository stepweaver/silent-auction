'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PrintToolbar() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    try {
      setError('');
      setDownloading(true);
      const response = await fetch('/api/admin/qr-codes/download');
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'silent-auction-qr-codes.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('QR export download failed:', err);
      setError(err.message || 'Failed to download');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className='no-print sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-md'>
      <div className='mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-lg font-semibold text-gray-900 sm:text-xl'>
            QR Code Export
          </h1>
          <p className='text-sm text-gray-600 sm:text-base'>
            Download a PDF with one scannable sheet per item.
          </p>
          {error && <p className='mt-1 text-xs text-red-600'>{error}</p>}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <button
            type='button'
            onClick={handleDownload}
            disabled={downloading}
            className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-70'
          >
            {downloading ? 'Generating…' : 'Download ALL QR Codes'}
          </button>
          <Link
            href='/admin'
            className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300'
          >
            Back to Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
