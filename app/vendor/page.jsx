'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import { formatDollar } from '@/lib/money';

export default function VendorDashboard() {
  const router = useRouter();
  const s = supabaseBrowser();
  const [vendorAdmin, setVendorAdmin] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    // Check if vendor admin is logged in
    if (typeof window !== 'undefined') {
      const vendorAdminId = localStorage.getItem('vendor_admin_id');
      const vendorAdminEmail = localStorage.getItem('vendor_admin_email');
      const vendorAdminName = localStorage.getItem('vendor_admin_name');

      if (!vendorAdminId || !vendorAdminEmail) {
        router.push('/vendor-enroll');
        return;
      }

      setVendorAdmin({
        id: vendorAdminId,
        email: vendorAdminEmail,
        name: vendorAdminName,
      });
    }
  }, [router]);

  async function load() {
    if (!vendorAdmin) return;

    try {
      // Load items created by this vendor admin (using item_leaders view for current bid info)
      const { data: itemsData, error } = await s
        .from('item_leaders')
        .select('*')
        .eq('created_by', vendorAdmin.id)
        .order('title', { ascending: true });

      if (error) throw error;
      setItems(itemsData || []);
    } catch (err) {
      console.error('Error loading items:', err);
      setMsg('Error loading items');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (vendorAdmin) {
      load();
    }
  }, [vendorAdmin]);

  function handleLogout() {
    localStorage.removeItem('vendor_admin_id');
    localStorage.removeItem('vendor_admin_email');
    localStorage.removeItem('vendor_admin_name');
    router.push('/vendor-enroll');
  }

  if (loading || !vendorAdmin) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex items-center justify-center py-12">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-2">Vendor Dashboard</h1>
          <p className="text-base-content/70">
            Welcome, {vendorAdmin.name} ({vendorAdmin.email})
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-ghost btn-sm"
        >
          Logout
        </button>
      </div>

      {msg && (
        <div
          className={`mb-4 p-2 rounded ${
            msg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {msg}
        </div>
      )}

      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Items</h2>
        <Link
          href="/vendor/items/new"
          className="btn btn-primary"
        >
          + New Item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center py-12">
            <p className="text-base-content/70 text-lg mb-4">No items yet.</p>
            <Link href="/vendor/items/new" className="btn btn-primary">
              Create Your First Item
            </Link>
          </div>
        </div>
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
                        href={`/vendor/items/${item.id}`}
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
    </main>
  );
}

