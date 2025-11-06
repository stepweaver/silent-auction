'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Field from '@/components/Field';

export default function VendorNewItemPage() {
  const router = useRouter();
  const [vendorAdminId, setVendorAdminId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    photo_url: '',
    start_price: '0',
    min_increment: '5',
    is_closed: false,
  });
  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = localStorage.getItem('vendor_admin_id');
      if (!id) {
        router.push('/vendor-enroll');
        return;
      }
      setVendorAdminId(id);
    }
  }, [router]);

  function handleSlugChange(e) {
    const slug = e.target.value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setForm((f) => ({ ...f, slug }));
  }

  async function handlePhotoUpload(file) {
    if (!file) return null;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'x-vendor-admin-id': vendorAdminId || '',
        },
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
      }

      const { url } = await res.json();
      return url;
    } catch (err) {
      setMsg(`Photo upload error: ${err.message}`);
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg('');
    setIsSubmitting(true);

    try {
      let photoUrl = form.photo_url;
      if (photoFile) {
        const uploadedUrl = await handlePhotoUpload(photoFile);
        if (!uploadedUrl) {
          setIsSubmitting(false);
          return;
        }
        photoUrl = uploadedUrl;
      }

      const res = await fetch('/api/vendor/item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vendor-admin-id': vendorAdminId || '',
        },
        body: JSON.stringify({ ...form, photo_url: photoUrl }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(text || 'Error creating item');
        return;
      }

      const { item } = await res.json();
      router.push(`/vendor/items/${item.id}`);
    } catch (err) {
      setMsg('Error creating item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!vendorAdminId) {
    return (
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: '#00b140' }}></div>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full px-4 py-4 sm:py-6 pb-8 sm:pb-10">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/vendor" 
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>
        
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">New Item</h1>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Title" required>
                <input
                  type="text"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base"
                  style={{
                    borderColor: 'rgb(229 231 235)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#00b140';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 177, 64, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  disabled={isSubmitting}
                />
              </Field>

              <Field label="Slug" required>
                <input
                  type="text"
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base font-mono"
                  style={{
                    borderColor: 'rgb(229 231 235)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#00b140';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 177, 64, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  value={form.slug}
                  onChange={handleSlugChange}
                  required
                  disabled={isSubmitting}
                  placeholder="auto-generated-from-title"
                />
                <p className="text-xs text-gray-500 mt-1">
                  URL-friendly identifier (auto-formatted from title if not provided)
                </p>
              </Field>

              <Field label="Description">
                <textarea
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base resize-y"
                  style={{
                    borderColor: 'rgb(229 231 235)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#00b140';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 177, 64, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  rows="4"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  disabled={isSubmitting}
                />
              </Field>

              <Field label="Photo">
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-xs sm:text-sm"
                    onChange={handlePhotoChange}
                    disabled={isSubmitting || uploadingPhoto}
                  />
                  <p className="text-xs text-gray-500">Or enter URL below</p>
                  <input
                    type="url"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base"
                    style={{
                      borderColor: 'rgb(229 231 235)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#00b140';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 177, 64, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    value={form.photo_url}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, photo_url: e.target.value }));
                      setPhotoFile(null);
                      setPhotoPreview('');
                    }}
                    disabled={isSubmitting || uploadingPhoto}
                    placeholder="https://..."
                  />
                  {photoPreview && (
                    <div className="mt-2">
                      <img src={photoPreview} alt="Preview" className="max-w-xs rounded-lg border border-gray-200" />
                      <p className="text-xs text-gray-500 mt-1">Preview (will upload on save)</p>
                    </div>
                  )}
                  {form.photo_url && !photoFile && !photoPreview && (
                    <div className="mt-2">
                      <img src={form.photo_url} alt="Current" className="max-w-xs rounded-lg border border-gray-200" />
                    </div>
                  )}
                  {uploadingPhoto && (
                    <p className="text-xs flex items-center gap-1.5" style={{ color: '#00b140' }}>
                      <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading photo...
                    </p>
                  )}
                </div>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Start Price" required>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base"
                    style={{
                      borderColor: 'rgb(229 231 235)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#00b140';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 177, 64, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    value={form.start_price}
                    onChange={(e) => setForm((f) => ({ ...f, start_price: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </Field>

                <Field label="Min Increment" required>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base"
                    style={{
                      borderColor: 'rgb(229 231 235)'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#00b140';
                      e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 177, 64, 0.2)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    value={form.min_increment}
                    onChange={(e) => setForm((f) => ({ ...f, min_increment: e.target.value }))}
                    required
                    disabled={isSubmitting}
                  />
                </Field>
              </div>

              {msg && (
                <div 
                  className={`p-3 rounded-lg border text-xs sm:text-sm ${
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

              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-white font-semibold rounded-lg text-sm sm:text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#00b140' }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Item'
                  )}
                </button>
                <Link
                  href="/vendor"
                  className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg text-sm sm:text-base hover:bg-gray-50 transition-colors text-center"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

