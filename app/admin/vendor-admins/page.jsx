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
  const [enrollmentLink, setEnrollmentLink] = useState(null);

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
        setMsg('Donor created successfully! An enrollment email has been sent to ' + form.email + '.');
      } else {
        // Fallback: show link if email wasn't sent
        const token = data.enrollment_token;
        if (token) {
          const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
          const link = `${baseUrl}/vendor-enroll?token=${token}`;
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
        <div className="mb-3 sm:mb-4 p-3 sm:p-4 border rounded-xl bg-yellow-50 border-yellow-200">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">Enrollment Link (Fallback)</h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            Email could not be sent automatically. Please send this link to the donor manually.
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
            {vendorAdmins.map((admin) => (
              <div key={admin.id} className="border rounded-lg p-3 bg-white">
                <h3 className="font-semibold text-sm mb-1">{admin.name}</h3>
                <p className="text-xs text-gray-600 break-all mb-1">{admin.email}</p>
                <p className="text-xs text-gray-500">
                  Created: {new Date(admin.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden md:block overflow-x-auto -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left text-sm">Name</th>
                  <th className="border p-2 text-left text-sm">Email</th>
                  <th className="border p-2 text-left text-sm">Created</th>
                </tr>
              </thead>
              <tbody>
                {vendorAdmins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="border p-2 text-sm">{admin.name}</td>
                    <td className="border p-2 text-sm break-all">{admin.email}</td>
                    <td className="border p-2 text-sm">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

