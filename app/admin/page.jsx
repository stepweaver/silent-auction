'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import { formatDollar } from '@/lib/money';

function SetDeadline({ onSet, currentDeadline }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // Pre-fill with current deadline if it exists
  useEffect(() => {
    if (currentDeadline) {
      const d = new Date(currentDeadline);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      setDate(`${year}-${month}-${day}`);
      setTime(`${hours}:${minutes}`);
    }
  }, [currentDeadline]);

  async function handleSetDeadline(e) {
    e.preventDefault();
    if (!date || !time) {
      setMsg('Please enter both date and time');
      return;
    }

    setIsSubmitting(true);
    setMsg('');

    try {
      const deadline = new Date(`${date}T${time}`);
      if (isNaN(deadline.getTime())) {
        setMsg('Invalid date/time');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_deadline: deadline.toISOString(),
        }),
      });

      if (res.ok) {
        setMsg('Deadline updated successfully!');
        setTimeout(() => {
          onSet();
        }, 500);
      } else {
        setMsg('Error setting deadline');
      }
    } catch (err) {
      setMsg('Error setting deadline');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSetDeadline} className='space-y-2'>
      <div className='flex flex-col sm:flex-row gap-2 sm:items-end'>
        <div className='flex-1'>
          <label className='block text-xs font-semibold text-yellow-900 mb-1'>
            Date
          </label>
          <input
            type='date'
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className='border rounded px-2 py-1.5 text-sm w-full'
            required
            disabled={isSubmitting}
          />
        </div>
        <div className='flex-1'>
          <label className='block text-xs font-semibold text-yellow-900 mb-1'>
            Time
          </label>
          <input
            type='time'
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className='border rounded px-2 py-1.5 text-sm w-full'
            required
            disabled={isSubmitting}
          />
        </div>
        <button
          type='submit'
          className='px-3 py-1.5 sm:py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50 whitespace-nowrap'
          disabled={isSubmitting}
        >
          Set
        </button>
      </div>
      {msg && (
        <p
          className={`text-xs ${
            msg.includes('Error') ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {msg}
        </p>
      )}
    </form>
  );
}

export default function AdminDashboard() {
  const s = supabaseBrowser();
  const [settings, setSettings] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const [{ data: settingsData }, { data: itemsData }] = await Promise.all([
        s.from('settings').select('*').eq('id', 1).maybeSingle(),
        s.from('item_leaders').select('*').order('title', { ascending: true }),
      ]);

      setSettings(settingsData);
      setItems(itemsData || []);
    } catch (err) {
      console.error('Error loading:', err);
      setMsg('Error loading data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function extendDeadline() {
    if (!settings?.auction_deadline) return;

    // Verification step
    const currentDeadline = new Date(settings.auction_deadline);
    const newDeadline = new Date(currentDeadline);
    newDeadline.setMinutes(newDeadline.getMinutes() + 15);

    const confirmMessage = `Extend deadline by 15 minutes?\n\nCurrent: ${currentDeadline.toLocaleString()}\nNew: ${newDeadline.toLocaleString()}`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_deadline: newDeadline.toISOString(),
        }),
      });

      if (res.ok) {
        setMsg('Deadline extended by 15 minutes');
        await load();
      } else {
        setMsg('Error extending deadline');
      }
    } catch (err) {
      setMsg('Error extending deadline');
    }
  }

  async function closeAll() {
    if (!confirm('Close all items? This cannot be undone.')) return;

    try {
      const res = await fetch('/api/admin/close-all', {
        method: 'POST',
      });

      if (res.ok) {
        setMsg('All items closed');
        await load();
      } else {
        setMsg('Error closing items');
      }
    } catch (err) {
      setMsg('Error closing items');
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <p className='text-gray-600'>Loading...</p>
      </div>
    );
  }

  const deadline = settings?.auction_deadline
    ? new Date(settings.auction_deadline)
    : null;
  const allClosed = items && items.length > 0 ? items.every((item) => item.is_closed) : false;
  const openCount = items && items.length > 0 ? items.filter((item) => !item.is_closed).length : 0;
  const now = new Date();
  const closed = allClosed || (deadline ? now >= deadline : false);

  return (
    <div>
      <h1 className='text-xl sm:text-2xl font-semibold mb-3 sm:mb-4'>
        Admin Dashboard
      </h1>

      {msg && (
        <div
          className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded text-sm ${
            msg.includes('Error')
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {msg}
        </div>
      )}

      <div className='mb-4 sm:mb-6 p-3 sm:p-4 border rounded-xl bg-gray-50'>
        <h2 className='font-semibold mb-2 text-base sm:text-lg'>
          Current Settings
        </h2>
        <div className='space-y-1.5 sm:space-y-2 text-sm'>
          <p>
            <b>Deadline:</b> {deadline ? deadline.toLocaleString() : 'Not set'}
          </p>
          <p>
            <b>Status:</b>{' '}
            {closed ? (
              <span className='text-red-600 font-semibold'>
                CLOSED ({allClosed ? 'all items closed' : 'deadline passed'})
              </span>
            ) : (
              <span className='text-green-600 font-semibold'>OPEN</span>
            )}
          </p>
          {!closed && deadline && (
            <p className='text-xs text-gray-600'>
              {openCount === 1
                ? '1 item still open. Auction will close automatically at the deadline.'
                : `${openCount} items still open. Auction will close automatically at the deadline.`}
            </p>
          )}
          {closed && (
            <p className='text-xs text-gray-600'>
              {openCount === 0
                ? 'All catalog items are now closed.'
                : `${openCount} items remain open; please review.`}
            </p>
          )}
          {settings?.contact_email && (
            <p className='break-all'>
              <b>Contact:</b> {settings.contact_email}
            </p>
          )}
        </div>
        <div className='mt-3 space-y-2'>
          <div className='p-2 sm:p-3 bg-white border rounded'>
            <p className='text-sm font-semibold mb-2'>
              {deadline ? 'Update Deadline' : 'Set Deadline'}
            </p>
            <SetDeadline
              onSet={load}
              currentDeadline={settings?.auction_deadline}
            />
          </div>
          <div className='flex flex-col sm:flex-row gap-2'>
            {deadline && (
              <button
                onClick={extendDeadline}
                className='px-3 py-2 sm:py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm'
              >
                Extend deadline +15m
              </button>
            )}
            <button
              onClick={closeAll}
              className='px-3 py-2 sm:py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm'
            >
              Close all items now
            </button>
          </div>
        </div>
      </div>

      <div className='mb-3 sm:mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3'>
        <h2 className='text-lg sm:text-xl font-semibold'>Items</h2>
        <Link
          href='/admin/items/new'
          className='px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm sm:text-base text-center'
        >
          New Item
        </Link>
      </div>

      {items.length === 0 ? (
        <p className='text-gray-600 text-sm sm:text-base'>No items yet.</p>
      ) : (
        <>
          {/* Mobile: Card View */}
          <div className='block md:hidden space-y-3'>
            {items.map((item) => {
              const current = Number(item.current_high_bid ?? item.start_price);
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                typeof window !== 'undefined'
                  ? window.location.origin + `/i/${item.slug}`
                  : `/i/${item.slug}`
              )}`;

              return (
                <Link
                  key={item.id}
                  href={`/admin/items/${item.id}`}
                  className='block border rounded-lg bg-white overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02]'
                >
                  <div className='p-3 flex gap-3'>
                    {/* Small Preview Image */}
                    <div className='shrink-0'>
                      {item.photo_url ? (
                        <div className='w-16 h-16 bg-gray-100 rounded overflow-hidden'>
                          <img
                            src={item.photo_url}
                            alt={item.title}
                            className='w-full h-full object-contain'
                          />
                        </div>
                      ) : (
                        <div className='w-16 h-16 bg-gray-100 rounded grid place-items-center text-gray-400 text-xs'>
                          No photo
                        </div>
                      )}
                    </div>
                    
                    {/* Card Content */}
                    <div className='flex-1 min-w-0'>
                      <div className='flex justify-between items-start mb-2'>
                        <div className='flex-1 min-w-0'>
                          <h3 className='font-semibold text-sm truncate'>
                            {item.title}
                          </h3>
                          <p className='text-xs text-gray-500 font-mono truncate'>
                            {item.slug}
                          </p>
                        </div>
                        <img
                          alt='QR'
                          src={qrUrl}
                          className='w-12 h-12 shrink-0 ml-2 rounded border border-gray-200'
                        />
                      </div>
                      <div className='grid grid-cols-2 gap-2 text-xs'>
                        <div>
                          <span className='text-gray-600'>High:</span>{' '}
                          <span className='font-semibold text-green-600'>
                            {formatDollar(current)}
                          </span>
                        </div>
                        <div className='text-right'>
                          <span
                            className={`text-xs font-semibold ${
                              item.is_closed ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {item.is_closed ? 'Closed' : 'Open'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: Table View */}
          <div className='hidden md:block overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6'>
            <table className='w-full border-collapse border'>
              <thead>
                <tr className='bg-gray-100'>
                  <th className='border p-2 text-left text-sm'>Preview</th>
                  <th className='border p-2 text-left text-sm'>Title</th>
                  <th className='border p-2 text-left text-sm'>Slug</th>
                  <th className='border p-2 text-left text-sm'>Current High</th>
                  <th className='border p-2 text-left text-sm'>Status</th>
                  <th className='border p-2 text-left text-sm'>QR</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const current = Number(
                    item.current_high_bid ?? item.start_price
                  );
                  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                    typeof window !== 'undefined'
                      ? window.location.origin + `/i/${item.slug}`
                      : `/i/${item.slug}`
                  )}`;

                  return (
                    <tr
                      key={item.id}
                      className='cursor-pointer hover:bg-gray-50 transition-colors'
                      onClick={() => {
                        window.location.href = `/admin/items/${item.id}`;
                      }}
                    >
                      <td className='border p-2'>
                        {item.photo_url ? (
                          <div className='w-20 h-20 bg-gray-100 rounded overflow-hidden'>
                            <img
                              src={item.photo_url}
                              alt={item.title}
                              className='w-full h-full object-contain'
                            />
                          </div>
                        ) : (
                          <div className='w-20 h-20 bg-gray-100 rounded grid place-items-center text-gray-400 text-xs'>
                            No photo
                          </div>
                        )}
                      </td>
                      <td className='border p-2 text-sm'>{item.title}</td>
                      <td className='border p-2 font-mono text-xs'>
                        {item.slug}
                      </td>
                      <td className='border p-2 text-sm'>
                        <span className='font-semibold text-green-600'>
                          {formatDollar(current)}
                        </span>
                      </td>
                      <td className='border p-2'>
                        {item.is_closed ? (
                          <span className='text-red-600 font-semibold text-sm'>
                            Closed
                          </span>
                        ) : (
                          <span className='text-green-600 font-semibold text-sm'>
                            Open
                          </span>
                        )}
                      </td>
                      <td className='border p-2'>
                        <img alt='QR' src={qrUrl} className='w-16 h-16 rounded border border-gray-200' />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
