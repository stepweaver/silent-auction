'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import Field from '@/components/Field';
import { formatDollar } from '@/lib/money';
import AliasAvatar from '@/components/AliasAvatar';

const DEFAULT_CATEGORIES = [
  'Sports',
  'Family Fun',
  'Arts & Crafts',
  'Food & Dining',
  'Adult',
  'Self-Care & Beauty',
  'Home & Auto',
  'Holiday',
  'Grade Level Fun',
  'Classroom & Teacher Fun',
];

export default function EditItemPage({ params }) {
  const router = useRouter();
  const s = supabaseBrowser();
  const { id } = use(params);
  const [item, setItem] = useState(null);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    photo_url: '',
    thumbnail_url: '',
    start_price: '0',
    is_closed: false,
    category: '',
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [topBid, setTopBid] = useState(null);
  const [customCategories, setCustomCategories] = useState([]);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch custom categories on load
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const { categories } = await res.json();
          // Filter out default categories to get only custom ones
          const custom = categories.filter(cat => !DEFAULT_CATEGORIES.includes(cat));
          setCustomCategories(custom);
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    }
    fetchCategories();
  }, []);

  // Combined categories list: defaults + custom (sorted) + Other at the end
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories.sort(), 'Other'];

  async function loadItem() {
    try {
      const { data, error } = await s.from('items').select('*').eq('id', id).single();

      if (error) throw error;
      if (!data) {
        setMsg('Item not found');
        return;
      }

      setItem(data);
      setForm({
        title: data.title || '',
        slug: data.slug || '',
        description: data.description || '',
        photo_url: data.photo_url || '',
        thumbnail_url: data.thumbnail_url || '',
        start_price: String(data.start_price || 0),
        is_closed: data.is_closed || false,
        category: data.category || '',
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
    if (id) {
      loadItem();
    }
  }, [id]);

  function handleSlugChange(e) {
    const slug = e.target.value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setForm((f) => ({ ...f, slug }));
  }

  async function handlePhotoUpload(file) {
    if (!file) return { url: null, thumbnailUrl: null };

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed');
      }

      const { url, thumbnailUrl } = await res.json();
      return { url, thumbnailUrl };
    } catch (err) {
      setMsg(`Photo upload error: ${err.message}`);
      return { url: null, thumbnailUrl: null };
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);

    // Create preview
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
      // Upload photo first if provided
      let photoUrl = form.photo_url;
      let thumbnailUrl = form.thumbnail_url;
      if (photoFile) {
        const uploadResult = await handlePhotoUpload(photoFile);
        if (!uploadResult.url) {
          setIsSubmitting(false);
          return;
        }
        photoUrl = uploadResult.url;
        thumbnailUrl = uploadResult.thumbnailUrl || null;
      }

      const res = await fetch(`/api/admin/item/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photo_url: photoUrl, thumbnail_url: thumbnailUrl }),
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

  async function handleDelete() {
    if (!item) return;
    const confirmed = window.confirm(
      'Delete this item permanently?\n\nThis is only allowed for items that do not have any bids yet. This action cannot be undone.'
    );
    if (!confirmed) return;

    setMsg('');
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/item/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(text || 'Error deleting item');
        setIsDeleting(false);
        return;
      }

      // On success, take admin back to dashboard
      router.push('/admin');
    } catch (err) {
      console.error(err);
      setMsg('Error deleting item');
      setIsDeleting(false);
    }
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!item) {
    return (
      <div>
        <p>Item not found.</p>
        <Link href="/admin" className="underline">
          ← Dashboard
        </Link>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin + `/i/${item.slug}` : `/i/${item.slug}`
  )}`;

  const currentBid = topBid ? Number(topBid.amount) : Number(item.start_price || 0);

  return (
    <div>
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Link href="/admin" className="text-sm underline text-gray-700 hover:text-gray-900">
          ← Dashboard
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold">Edit Item</h1>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 lg:col-span-2">
          <Field label="Title" required>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              disabled={isSubmitting}
            />
          </Field>

          <Field label="Slug" required>
            <input
              type="text"
              className="border rounded px-3 py-2 w-full font-mono"
              value={form.slug}
              onChange={handleSlugChange}
              required
              disabled={isSubmitting}
            />
          </Field>

          <Field label="Description">
            <textarea
              className="border rounded px-3 py-2 w-full"
              rows="3"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              disabled={isSubmitting}
            />
          </Field>

          <Field label="Category">
            <select
              className="border rounded px-3 py-2 w-full"
              value={showCustomInput ? 'Other' : form.category}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'Other') {
                  setShowCustomInput(true);
                  setForm((f) => ({ ...f, category: '' }));
                } else {
                  setShowCustomInput(false);
                  setCustomCategoryInput('');
                  setForm((f) => ({ ...f, category: value }));
                }
              }}
              disabled={isSubmitting}
            >
              <option value="">Select a category...</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {showCustomInput && (
              <div className="mt-2">
                <input
                  type="text"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="Enter new category name..."
                  value={customCategoryInput}
                  onChange={(e) => {
                    setCustomCategoryInput(e.target.value);
                    setForm((f) => ({ ...f, category: e.target.value }));
                  }}
                  disabled={isSubmitting}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  This category will be saved and available for future items.
                </p>
              </div>
            )}
          </Field>

          <Field label="Photo">
            <div className="space-y-2">
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                className="border rounded px-3 py-2 w-full"
                onChange={handlePhotoChange}
                disabled={isSubmitting || uploadingPhoto}
              />
              <p className="text-xs text-gray-500">Or enter URL below</p>
              <input
                type="url"
                className="border rounded px-3 py-2 w-full"
                value={form.photo_url}
                onChange={(e) => {
                  setForm((f) => ({ ...f, photo_url: e.target.value }));
                  setPhotoFile(null);
                  setPhotoPreview('');
                }}
                disabled={isSubmitting || uploadingPhoto}
                placeholder="https://..."
              />
              {(form.photo_url || photoPreview || photoFile) && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, photo_url: '', thumbnail_url: '' }));
                      setPhotoFile(null);
                      setPhotoPreview('');
                    }}
                    disabled={isSubmitting || uploadingPhoto}
                    className="text-sm text-red-600 hover:text-red-700 underline disabled:opacity-50"
                  >
                    Remove photo (use default)
                  </button>
                </div>
              )}
              {photoPreview && (
                <div className="mt-2">
                  <Image
                    src={photoPreview}
                    alt="Preview"
                    width={320}
                    height={240}
                    className="w-full max-w-xs rounded border"
                    style={{ height: 'auto' }}
                    unoptimized
                  />
                  <p className="text-xs text-gray-500 mt-1">Preview (will upload on save)</p>
                </div>
              )}
              {form.photo_url && !photoFile && !photoPreview && (
                <div className="mt-2">
                  <Image
                    src={form.photo_url}
                    alt="Current"
                    width={320}
                    height={240}
                    className="w-full max-w-xs rounded border"
                    style={{ height: 'auto' }}
                  />
                  <p className="text-xs text-gray-500 mt-1">Current photo</p>
                </div>
              )}
              {uploadingPhoto && <p className="text-xs text-blue-600">Uploading photo...</p>}
            </div>
          </Field>

          <Field label="Start Price" required>
            <input
              type="number"
              step="0.01"
              min="0"
              className="border rounded px-3 py-2 w-full"
              value={form.start_price}
              onChange={(e) => setForm((f) => ({ ...f, start_price: e.target.value }))}
              required
              disabled={isSubmitting}
            />
          </Field>

          <Field label="Status">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_closed}
                onChange={(e) => setForm((f) => ({ ...f, is_closed: e.target.checked }))}
                disabled={isSubmitting || isDeleting}
                className="w-4 h-4"
              />
              <span>Item is closed</span>
            </label>
          </Field>

          {msg && (
            <div
              className={`p-2 sm:p-3 rounded text-sm ${
                msg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {msg}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
              disabled={isSubmitting || isDeleting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href="/admin" className="px-4 py-2 border rounded hover:bg-gray-50 text-center text-sm sm:text-base">
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 border border-red-600 text-red-700 rounded hover:bg-red-50 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Item'}
            </button>
          </div>
        </form>

        <div className="space-y-4 sm:space-y-6">
          <div>
            <h3 className="font-semibold mb-2 text-sm">Preview</h3>
            <div className="border rounded-lg p-3">
              {form.photo_url && (
                <Image
                  src={form.photo_url}
                  alt=""
                  width={320}
                  height={256}
                  className="w-full rounded mb-2 object-contain"
                  style={{ height: 'auto', maxHeight: '8rem' }}
                />
              )}
              <h4 className="font-medium text-sm">{form.title || 'Item title'}</h4>
              <p className="mt-1 text-xs text-gray-600">
                Start: {formatDollar(form.start_price)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 text-sm">Current Bid</h3>
            <div className="border rounded-lg p-3 bg-gray-50">
              <div className="text-xl sm:text-2xl font-bold text-primary mb-1">
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
                        <span className="text-xs sm:text-sm font-medium">{topBid.user_aliases.alias}</span>
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

          <div>
            <h3 className="font-semibold mb-2 text-sm">QR Code</h3>
            <Image alt="QR Code" src={qrUrl} width={150} height={150} className="border rounded w-full max-w-[120px] sm:max-w-[150px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
