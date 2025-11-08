'use client';

import Image from 'next/image';
import { useCallback, useMemo, useState } from 'react';

const sanitizeFilename = (value) =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64) || 'auction-item';

export default function QrCodeCard({ item, itemUrl, qrSrc }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const downloadFilename = useMemo(() => {
    const { slug, title, id } = item || {};
    return `silent-auction-qr-${
      sanitizeFilename(slug || title || id) || 'item'
    }.pdf`;
  }, [item]);

  const handleDownload = useCallback(async () => {
    if (!item?.id) {
      setError('Missing item identifier');
      return;
    }

    try {
      setError('');
      setDownloading(true);
      const response = await fetch(`/api/admin/qr-codes/item/${item.id}`);
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFilename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Single QR export download failed:', err);
      setError(err.message || 'Failed to download QR sheet');
    } finally {
      setDownloading(false);
    }
  }, [downloadFilename, item?.id]);

  return (
    <section className='qr-page flex min-h-[9.5in] flex-col items-center justify-center gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'>
      <div className='no-print flex w-full justify-end'>
        <button
          type='button'
          onClick={handleDownload}
          disabled={downloading}
          className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-70'
        >
          {downloading ? 'Preparing…' : 'Download THIS QR Code'}
        </button>
      </div>
      {error && (
        <p className='no-print -mt-4 w-full text-right text-xs text-red-600'>
          {error}
        </p>
      )}

      <div className='text-center'>
        <p className='text-sm font-semibold uppercase tracking-wide text-emerald-600'>
          Mary Frank Elementary PTO Silent Auction
        </p>
        <h2 className='mt-2 text-3xl font-bold text-gray-900 sm:text-4xl'>
          {item.title}
        </h2>
      </div>

      <Image
        src={qrSrc}
        alt={`QR code for ${item.title}`}
        width={900}
        height={900}
        className='w-full max-w-[6.5in] rounded-xl border border-gray-100 shadow-lg'
      />

      <div className='w-full max-w-2xl text-center text-gray-700'>
        <p className='text-base font-semibold'>
          Scan to view item &amp; place bids
        </p>
        <p className='mt-1 break-all text-sm text-gray-500'>{itemUrl}</p>
        {item.start_price && (
          <p className='mt-3 text-sm text-gray-600'>
            Starting bid: ${Number(item.start_price).toFixed(2)}
          </p>
        )}
        {item.description && (
          <p className='mt-2 text-sm leading-relaxed text-gray-600'>
            {item.description}
          </p>
        )}
      </div>
    </section>
  );
}
