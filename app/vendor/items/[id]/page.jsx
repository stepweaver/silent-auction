'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import Field from '@/components/Field';
import { formatDollar } from '@/lib/money';
import AliasAvatar from '@/components/AliasAvatar';

export default function VendorEditItemPage({ params }) {
  const router = useRouter();
  const s = supabaseBrowser();
  const { id } = use(params);
  const [vendorAdminId, setVendorAdminId] = useState(null);
  const [item, setItem] = useState(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    photo_url: '',
    start_price: '0',
    is_closed: false,
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [topBid, setTopBid] = useState(null);

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

  async function loadItem() {
    try {
      const { data, error } = await s
        .from('items')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) {
        setMsg('Item not found');
        return;
      }

      // Check ownership
      if (String(data.created_by) !== String(vendorAdminId)) {
        setMsg('Unauthorized: You can only edit your own items');
        return;
      }

      setItem(data);
      setForm({
        title: data.title || '',
        slug: data.slug || '',
        description: data.description || '',
        photo_url: data.photo_url || '',
        start_price: String(data.start_price || 0),
        is_closed: data.is_closed || false,
      });
      setPhotoFile(null);
      setPhotoPreview('');

      // Load top bid
      const { data: bidsData, error: bidsError } = await s
        .from('bids')
        .select('*')
        .eq('item_id', id)
        .order('amount', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!bidsError && bidsData) {
        // Fetch alias if present
        let aliasData = null;
        if (bidsData.alias_id) {
          const { data: alias } = await s
            .from('user_aliases')
            .select('id, alias, color, animal')
            .eq('id', bidsData.alias_id)
            .maybeSingle();
          aliasData = alias;
        }
        setTopBid({
          ...bidsData,
          user_aliases: aliasData,
        });
      } else {
        setTopBid(null);
      }
    } catch (err) {
      console.error('Error loading item:', err);
      setMsg('Error loading item');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id && vendorAdminId) {
      loadItem();
    }
  }, [id, vendorAdminId]);

  // Auto-generate slug from title
  function generateSlug(title) {
    if (!title) return '';
    return title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function handleTitleChange(e) {
    const title = e.target.value;
    setForm((f) => ({ 
      ...f, 
      title,
      slug: generateSlug(title) // Auto-generate slug from title
    }));
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

      const res = await fetch(`/api/vendor/item/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-vendor-admin-id': vendorAdminId || '',
        },
        body: JSON.stringify({ ...form, photo_url: photoUrl }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(text || 'Error updating item');
        return;
      }

      setMsg('Item updated!');
      setPhotoFile(null);
      setPhotoPreview('');
      await loadItem();
      
      // Refresh bids after update
      const { data: bidsData } = await s
        .from('bids')
        .select('*')
        .eq('item_id', id)
        .order('amount', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (bidsData) {
        let aliasData = null;
        if (bidsData.alias_id) {
          const { data: alias } = await s
            .from('user_aliases')
            .select('id, alias, color, animal')
            .eq('id', bidsData.alias_id)
            .maybeSingle();
          aliasData = alias;
        }
        setTopBid({
          ...bidsData,
          user_aliases: aliasData,
        });
      } else {
        setTopBid(null);
      }
    } catch (err) {
      setMsg('Error updating item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading || !vendorAdminId) {
    return (
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" style={{ borderTopColor: 'var(--primary-500)' }}></div>
        </div>
      </main>
    );
  }

  if (!item) {
    return (
      <main className="w-full px-4 py-4 sm:py-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl">
            <div className="px-4 sm:px-6 py-12 text-center">
              <p className="text-xs sm:text-sm text-gray-600 mb-4">{msg || 'Item not found.'}</p>
              <Link 
                href="/vendor" 
                className="inline-block px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold text-white"
                style={{ backgroundColor: 'var(--primary-500)' }}
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const currentBid = topBid ? Number(topBid.amount) : Number(item.start_price || 0);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin + `/i/${item.slug}` : `/i/${item.slug}`
  )}`;

  return (
    <main className="w-full px-4 py-4 sm:py-6 pb-8 sm:pb-10">
      <div className="max-w-6xl mx-auto">
        <Link 
          href="/vendor" 
          className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </Link>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Edit Item</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Field label="Title" required>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base"
                      style={{
                        borderColor: 'rgb(229 231 235)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-500)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 177, 64, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      value={form.title}
                      onChange={handleTitleChange}
                      required
                      disabled={isSubmitting}
                    />
                  </Field>


                  <Field label="Description">
                    <textarea
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg outline-none transition-all text-sm sm:text-base resize-y"
                      style={{
                        borderColor: 'rgb(229 231 235)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--primary-500)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0, 177, 64, 0.2)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      rows="3"
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
                          e.currentTarget.style.borderColor = 'var(--primary-500)';
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
                          <p className="text-xs text-gray-500 mt-1">Current photo</p>
                        </div>
                      )}
                      {uploadingPhoto && (
                        <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--primary-500)' }}>
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Uploading photo...
                        </p>
                      )}
                    </div>
                  </Field>

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
                        e.currentTarget.style.borderColor = 'var(--primary-500)';
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

                  <Field label="Status">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_closed}
                        onChange={(e) => setForm((f) => ({ ...f, is_closed: e.target.checked }))}
                        disabled={isSubmitting}
                        className="w-4 h-4 rounded border-gray-300"
                        style={{ accentColor: 'var(--primary-500)' }}
                      />
                      <span className="text-xs sm:text-sm text-gray-700">Item is closed</span>
                    </label>
                  </Field>

                  {msg && (
                    <div
                      className={`p-3 rounded-lg border text-xs sm:text-sm ${
                        msg.includes('Error') || msg.includes('Unauthorized')
                          ? 'text-red-700'
                          : 'text-green-700'
                      }`}
                      style={msg.includes('Error') || msg.includes('Unauthorized') ? {
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
                      style={{ backgroundColor: 'var(--primary-500)' }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
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

          <div className="space-y-4">
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Preview</h3>
                <div className="border border-gray-200 rounded-lg p-3">
                  {form.photo_url && (
                    <img src={form.photo_url} alt="" className="w-full rounded-lg mb-2 max-h-32 object-contain" />
                  )}
                  <h4 className="font-medium text-sm text-gray-900">{form.title || 'Item title'}</h4>
                  <p className="mt-1 text-xs text-gray-600">
                    Start: {formatDollar(form.start_price)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Current Bid</h3>
                <div 
                  className="rounded-lg p-3 border"
                  style={{ 
                    backgroundColor: 'rgba(0, 177, 64, 0.05)',
                    borderColor: 'rgba(0, 177, 64, 0.2)'
                  }}
                >
                  <div className="text-xl sm:text-2xl font-bold mb-1" style={{ color: 'var(--primary-500)' }}>
                    {formatDollar(currentBid)}
                  </div>
                  {topBid ? (
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center gap-2">
                        {topBid.user_aliases ? (
                          <>
                            <AliasAvatar
                              alias={topBid.user_aliases.alias}
                              color={topBid.user_aliases.color}
                              animal={topBid.user_aliases.animal}
                              size="sm"
                            />
                            <span className="text-xs sm:text-sm font-medium text-gray-900">{topBid.user_aliases.alias}</span>
                          </>
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-600">
                            {topBid.bidder_name || 'Anonymous'}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">No bids yet</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="px-4 sm:px-5 md:px-6 py-4 sm:py-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3">QR Code</h3>
                <img alt="QR Code" src={qrUrl} className="border border-gray-200 rounded-lg w-full max-w-[120px]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

