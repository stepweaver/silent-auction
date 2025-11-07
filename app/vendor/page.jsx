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
      // Load items created by this donor (using item_leaders view for current bid info)
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
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: 'var(--primary-500)' }}></div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-4 sm:py-6 pb-8 sm:pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1" style={{ color: 'var(--primary-500)' }}>Donor Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Welcome, {vendorAdmin.name} ({vendorAdmin.email})
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="self-start px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>

        {msg && (
          <div
            className={`mb-4 p-3 rounded-lg border text-xs sm:text-sm ${
              msg.includes('Error') ? 'text-red-700' : 'text-green-700'
            }`}
            style={msg.includes('Error') ? {
              backgroundColor: 'rgba(239, 68, 68, 0.05)',
              borderColor: 'rgba(239, 68, 68, 0.2)'
            } : {
              backgroundColor: 'rgba(0, 177, 64, 0.05)',
              borderColor: 'rgba(0, 177, 64, 0.2)'
            }}
          >
            {msg}
          </div>
        )}

        <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">My Items</h2>
          <Link
            href="/vendor/items/new"
            className="inline-block px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--primary-500)' }}
          >
            + New Item
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl">
            <div className="px-4 sm:px-6 py-12 text-center">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-xl">📦</span>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-3">No items yet.</p>
              <Link 
                href="/vendor/items/new" 
                className="inline-block px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--primary-500)' }}
              >
                Create Your First Item
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {items.map((item) => {
                const current = Number(item.current_high_bid ?? item.start_price);
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                  typeof window !== 'undefined'
                    ? window.location.origin + `/i/${item.slug}`
                    : `/i/${item.slug}`
                )}`;

                return (
                  <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-sm text-gray-900 flex-1">{item.title}</h3>
                        {item.is_closed ? (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-bold text-white ml-2"
                            style={{ backgroundColor: 'var(--accent-warm-500)' }}
                          >
                            Closed
                          </span>
                        ) : (
                          <span 
                            className="px-2 py-0.5 rounded-full text-xs font-bold text-white ml-2"
                            style={{ backgroundColor: 'var(--primary-500)' }}
                          >
                            Open
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 text-xs text-gray-600 mb-3">
                        <div><span className="font-semibold">Slug:</span> <span className="font-mono">{item.slug}</span></div>
                        <div><span className="font-semibold">Current High:</span> {formatDollar(current)}</div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <Link
                          href={`/vendor/items/${item.id}`}
                          className="text-xs font-medium"
                          style={{ color: 'var(--primary-500)' }}
                        >
                          Edit →
                        </Link>
                        <img alt="QR" src={qrUrl} className="w-12 h-12 rounded border border-gray-300" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Title</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Slug</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Current High</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">QR</th>
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
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.title}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-600">{item.slug}</td>
                          <td className="px-4 py-3 text-sm text-gray-900">{formatDollar(current)}</td>
                          <td className="px-4 py-3">
                            {item.is_closed ? (
                              <span 
                                className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: 'var(--accent-warm-500)' }}
                              >
                                Closed
                              </span>
                            ) : (
                              <span 
                                className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: 'var(--primary-500)' }}
                              >
                                Open
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/vendor/items/${item.id}`}
                              className="text-xs sm:text-sm font-medium hover:underline"
                              style={{ color: 'var(--primary-500)' }}
                            >
                              Edit
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <img alt="QR" src={qrUrl} className="w-12 h-12 rounded border border-gray-300" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

