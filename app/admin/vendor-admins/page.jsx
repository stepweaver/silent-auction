'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function VendorAdminsPage() {
  const [vendorAdmins, setVendorAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', name: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    try {
      const res = await fetch('/api/admin/vendor-admin');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error loading vendor admins' }));
        setMsg(errorData.error || errorData.details || 'Error loading vendor admins');
        return;
      }

      const data = await res.json();
      setVendorAdmins(data.vendor_admins || []);
    } catch (err) {
      console.error('Error loading:', err);
      setMsg('Error loading vendor admins: ' + err.message);
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

    try {
      const res = await fetch('/api/admin/vendor-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Error creating vendor admin' }));
        setMsg(errorData.error || errorData.details || 'Error creating vendor admin');
        return;
      }

      setMsg('Vendor admin created successfully!');
      setForm({ email: '', name: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setMsg('Error creating vendor admin: ' + err.message);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
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
      <div className="mb-4 flex items-center gap-4">
        <Link href="/admin" className="underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Vendor Admins</h1>
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

      <div className="mb-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
        >
          {showForm ? 'Cancel' : '+ Add Vendor Admin'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-4 border rounded-xl bg-gray-50">
          <h2 className="font-semibold mb-3">Add New Vendor Admin</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Name</label>
              <input
                type="text"
                className="border rounded px-3 py-2 w-full max-w-md"
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
                className="border rounded px-3 py-2 w-full max-w-md"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
                disabled={isSubmitting}
                placeholder="john@example.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Vendor admins will use this email to log in and manage their items.
              </p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Vendor Admin'}
            </button>
          </form>
        </div>
      )}

      {vendorAdmins.length === 0 ? (
        <p className="text-gray-600">No vendor admins yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full border-collapse border min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Name</th>
                <th className="border p-2 text-left">Email</th>
                <th className="border p-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {vendorAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td className="border p-2">{admin.name}</td>
                  <td className="border p-2">{admin.email}</td>
                  <td className="border p-2">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

