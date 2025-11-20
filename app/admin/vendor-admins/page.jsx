'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDollar } from '@/lib/money';

export default function VendorAdminsPage() {
  const [vendorAdmins, setVendorAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollmentLink, setEnrollmentLink] = useState(null);
  const [expandedDonors, setExpandedDonors] = useState(new Set());

  async function load() {
    try {
      const res = await fetch('/api/admin/vendor-admin');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error loading donors' }));
        setMsg(errorData.error || errorData.details || 'Error loading donors');
        return;
      }

      const data = await res.json();
      setVendorAdmins(data.vendor_admins || []);
    } catch (err) {
      console.error('Error loading:', err);
      setMsg('Error loading donors: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setMsg('');
    setEnrollmentLink(null);

    try {
      const res = await fetch('/api/admin/vendor-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error creating donor' }));
        setMsg(errorData.error || errorData.details || 'Error creating donor');
        return;
      }

      const data = await res.json();
      
      if (data.email_sent) {
        // Show the generated link for verification (even if email was sent)
        if (data.enrollment_link) {
          setEnrollmentLink(data.enrollment_link);
        }
        setMsg('Donor created successfully! An enrollment email has been sent to ' + form.email + '.');
      } else {
        // Fallback: show link if email wasn't sent
        const link = data.enrollment_link || (() => {
          const token = data.enrollment_token;
          if (token) {
            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            return `${baseUrl}/vendor-enroll?token=${encodeURIComponent(token)}`;
          }
          return null;
        })();
        
        if (link) {
          setEnrollmentLink(link);
          setMsg('Donor created successfully! Email could not be sent. Please send them the enrollment link below.');
        } else {
          setMsg('Donor created successfully!');
        }
      }
      setForm({ email: '', name: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setMsg('Error creating donor: ' + err.message);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function copyEnrollmentLink() {
    if (enrollmentLink) {
      navigator.clipboard.writeText(enrollmentLink);
      const originalMsg = msg;
      setMsg('Enrollment link copied to clipboard!');
      setTimeout(() => {
        setMsg(originalMsg);
      }, 2000);
    }
  }

  function toggleDonorItems(donorId) {
    setExpandedDonors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(donorId)) {
        newSet.delete(donorId);
      } else {
        newSet.add(donorId);
      }
      return newSet;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Link href="/admin" className="text-sm underline text-gray-700 hover:text-gray-900">
          ← Dashboard
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold">Donors</h1>
      </div>

      {msg && (
        <div
          className={`mb-3 sm:mb-4 p-2 sm:p-3 rounded text-sm ${
            msg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}
        >
          {msg}
        </div>
      )}

      {enrollmentLink && (
        <div className={`mb-3 sm:mb-4 p-3 sm:p-4 border rounded-xl ${msg.includes('Email could not be sent') ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
          <h3 className="font-semibold mb-2 text-sm sm:text-base">
            {msg.includes('Email could not be sent') ? 'Enrollment Link (Fallback)' : 'Enrollment Link'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            {msg.includes('Email could not be sent') 
              ? 'Email could not be sent automatically. Please send this link to the donor manually.'
              : 'Enrollment link that was sent via email (for your reference):'}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={enrollmentLink}
              className="flex-1 border rounded px-3 py-2 text-xs sm:text-sm bg-white font-mono break-all"
            />
            <button
              onClick={copyEnrollmentLink}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm sm:text-base whitespace-nowrap"
            >
              Copy Link
            </button>
          </div>
        </div>
      )}

      <div className="mb-3 sm:mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm sm:text-base w-full sm:w-auto"
        >
          {showForm ? 'Cancel' : '+ Add Donor'}
        </button>
      </div>

      {showForm && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-xl bg-gray-50">
          <h2 className="font-semibold mb-3 text-base sm:text-lg">Add New Donor</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Name</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full sm:max-w-md"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                required
                disabled={isSubmitting}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                className="border rounded px-3 py-2 w-full sm:max-w-md"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                disabled={isSubmitting}
                placeholder="john@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                An enrollment email with a login link will be sent to this address automatically.
              </p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Donor'}
            </button>
          </form>
        </div>
      )}

      {vendorAdmins.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">No donors yet.</p>
      ) : (
        <>
          {/* Mobile: Card View */}
          <div className="block md:hidden space-y-3">
            {vendorAdmins.map((admin) => {
              const isExpanded = expandedDonors.has(admin.id);
              const items = admin.items || [];
              const itemCount = admin.item_count || 0;
              
              return (
                <div key={admin.id} className="border rounded-lg bg-white overflow-hidden">
                  <div className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">{admin.name}</h3>
                        <p className="text-xs text-gray-600 break-all mb-1">{admin.email}</p>
                        <p className="text-xs text-gray-500">
                          Created: {new Date(admin.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {itemCount > 0 && (
                        <button
                          onClick={() => toggleDonorItems(admin.id)}
                          className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          {isExpanded ? 'Hide' : `Show ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                    {itemCount === 0 && (
                      <p className="text-xs text-gray-500 italic">No items yet</p>
                    )}
                  </div>
                  
                  {isExpanded && items.length > 0 && (
                    <div className="border-t bg-gray-50 p-3 space-y-2">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Items ({itemCount}):</h4>
                      {items.map((item) => {
                        const current = Number(item.current_high_bid ?? item.start_price);
                        return (
                          <div key={item.id} className="bg-white border rounded p-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <Link
                                  href={`/admin/items/${item.id}`}
                                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline block truncate"
                                >
                                  {item.title}
                                </Link>
                                <p className="text-xs text-gray-500 font-mono truncate mt-0.5">{item.slug}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Current: <span className="font-semibold text-green-600">{formatDollar(current)}</span>
                                </p>
                              </div>
                              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-semibold ${
                                item.is_closed 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {item.is_closed ? 'Closed' : 'Open'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden md:block space-y-4">
            {vendorAdmins.map((admin) => {
              const isExpanded = expandedDonors.has(admin.id);
              const items = admin.items || [];
              const itemCount = admin.item_count || 0;
              
              return (
                <div key={admin.id} className="border rounded-lg bg-white overflow-hidden">
                  <div className="border-b">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-3 text-left text-sm font-semibold">Name</th>
                          <th className="p-3 text-left text-sm font-semibold">Email</th>
                          <th className="p-3 text-left text-sm font-semibold">Created</th>
                          <th className="p-3 text-left text-sm font-semibold">Items</th>
                          <th className="p-3 text-left text-sm font-semibold w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-3 text-sm font-medium">{admin.name}</td>
                          <td className="p-3 text-sm break-all">{admin.email}</td>
                          <td className="p-3 text-sm">
                            {new Date(admin.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-sm">
                            {itemCount > 0 ? (
                              <span className="font-semibold">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                            ) : (
                              <span className="text-gray-400 italic">No items</span>
                            )}
                          </td>
                          <td className="p-3">
                            {itemCount > 0 && (
                              <button
                                onClick={() => toggleDonorItems(admin.id)}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                              >
                                {isExpanded ? 'Hide Items' : 'Show Items'}
                              </button>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  {isExpanded && items.length > 0 && (
                    <div className="p-4 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Items ({itemCount}):</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-white border-b">
                              <th className="p-2 text-left text-xs font-semibold text-gray-600">Title</th>
                              <th className="p-2 text-left text-xs font-semibold text-gray-600">Slug</th>
                              <th className="p-2 text-left text-xs font-semibold text-gray-600">Current High</th>
                              <th className="p-2 text-left text-xs font-semibold text-gray-600">Status</th>
                              <th className="p-2 text-left text-xs font-semibold text-gray-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => {
                              const current = Number(item.current_high_bid ?? item.start_price);
                              return (
                                <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                  <td className="p-2 text-sm">{item.title}</td>
                                  <td className="p-2 text-xs font-mono text-gray-600">{item.slug}</td>
                                  <td className="p-2 text-sm">
                                    <span className="font-semibold text-green-600">{formatDollar(current)}</span>
                                  </td>
                                  <td className="p-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                      item.is_closed 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {item.is_closed ? 'Closed' : 'Open'}
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    <Link
                                      href={`/admin/items/${item.id}`}
                                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      Edit
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

