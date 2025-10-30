'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import { formatDollar } from '@/lib/money';

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

    const newDeadline = new Date(settings.auction_deadline);
    newDeadline.setMinutes(newDeadline.getMinutes() + 30);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auction_deadline: newDeadline.toISOString(),
        }),
      });

      if (res.ok) {
        setMsg('Deadline extended by 30 minutes');
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
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const deadline = settings?.auction_deadline
    ? new Date(settings.auction_deadline)
    : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Admin Dashboard</h1>

      {msg && (
        <div
          className={`mb-4 p-2 rounded ${
            msg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="mb-6 p-4 border rounded-xl bg-gray-50">
        <h2 className="font-semibold mb-2">Current Settings</h2>
        <p>
          <b>Deadline:</b>{' '}
          {deadline ? deadline.toLocaleString() : 'Not set'}
        </p>
        {settings?.contact_email && (
          <p>
            <b>Contact:</b> {settings.contact_email}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          {deadline && (
            <button
              onClick={extendDeadline}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Extend deadline +30m
            </button>
          )}
          <button
            onClick={closeAll}
            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Close all items now
          </button>
        </div>
      </div>

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Items</h2>
        <Link
          href="/admin/items/new"
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          New Item
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-600">No items yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full border-collapse border min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Title</th>
                <th className="border p-2 text-left">Slug</th>
                <th className="border p-2 text-left">Current High</th>
                <th className="border p-2 text-left">Min Increment</th>
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-left">Actions</th>
                <th className="border p-2 text-left">QR</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const current = Number(item.current_high_bid ?? item.start_price);
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                  typeof window !== 'undefined'
                    ? window.location.origin + `/i/${item.slug}`
                    : `/i/${item.slug}`
                )}`;

                return (
                  <tr key={item.id}>
                    <td className="border p-2">{item.title}</td>
                    <td className="border p-2 font-mono text-xs">{item.slug}</td>
                    <td className="border p-2">{formatDollar(current)}</td>
                    <td className="border p-2">{formatDollar(item.min_increment)}</td>
                    <td className="border p-2">
                      {item.is_closed ? (
                        <span className="text-red-600 font-semibold">Closed</span>
                      ) : (
                        <span className="text-green-600 font-semibold">Open</span>
                      )}
                    </td>
                    <td className="border p-2">
                      <Link
                        href={`/admin/items/${item.id}`}
                        className="text-blue-600 underline hover:no-underline"
                      >
                        Edit
                      </Link>
                    </td>
                    <td className="border p-2">
                      <img alt="QR" src={qrUrl} className="w-16 h-16" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
