'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import Field from '@/components/Field';
import { formatDollar } from '@/lib/money';

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
    start_price: '0',
    min_increment: '5',
    is_closed: false,
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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
        start_price: String(data.start_price || 0),
        min_increment: String(data.min_increment || 5),
        is_closed: data.is_closed || false,
      });
      setPhotoFile(null);
      setPhotoPreview('');
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
    if (!file) return null;

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
      if (photoFile) {
        const uploadedUrl = await handlePhotoUpload(photoFile);
        if (!uploadedUrl) {
          setIsSubmitting(false);
          return;
        }
        photoUrl = uploadedUrl;
      }

      const res = await fetch(`/api/admin/item/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (err) {
      setMsg('Error updating item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
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

  const current = Number(item.start_price || 0);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin + `/i/${item.slug}` : `/i/${item.slug}`
  )}`;

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Link href="/admin" className="underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">Edit Item</h1>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="space-y-4">
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
              {photoPreview && (
                <div className="mt-2">
                  <img src={photoPreview} alt="Preview" className="max-w-xs rounded border" />
                  <p className="text-xs text-gray-500 mt-1">Preview (will upload on save)</p>
                </div>
              )}
              {form.photo_url && !photoFile && !photoPreview && (
                <div className="mt-2">
                  <img src={form.photo_url} alt="Current" className="max-w-xs rounded border" />
                  <p className="text-xs text-gray-500 mt-1">Current photo</p>
                </div>
              )}
              {uploadingPhoto && <p className="text-xs text-blue-600">Uploading photo...</p>}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
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

            <Field label="Min Increment" required>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="border rounded px-3 py-2 w-full"
                value={form.min_increment}
                onChange={(e) => setForm((f) => ({ ...f, min_increment: e.target.value }))}
                required
                disabled={isSubmitting}
              />
            </Field>
          </div>

          <Field label="Status">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_closed}
                onChange={(e) => setForm((f) => ({ ...f, is_closed: e.target.checked }))}
                disabled={isSubmitting}
                className="w-4 h-4"
              />
              <span>Item is closed</span>
            </label>
          </Field>

          {msg && (
            <div
              className={`p-2 rounded ${
                msg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {msg}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href="/admin" className="px-4 py-2 border rounded hover:bg-gray-50">
              Cancel
            </Link>
          </div>
        </form>

        <div>
          <h3 className="font-semibold mb-2">Preview</h3>
          <div className="border rounded-xl p-4">
            {form.photo_url && (
              <img src={form.photo_url} alt="" className="w-full rounded-lg mb-2" />
            )}
            <h4 className="font-medium">{form.title || 'Item title'}</h4>
            {form.description && (
              <p className="text-sm mt-1 opacity-80">{form.description}</p>
            )}
            <p className="mt-2 text-sm">
              Start: {formatDollar(form.start_price)} • Min increment:{' '}
              {formatDollar(form.min_increment)}
            </p>
          </div>

          <h3 className="font-semibold mt-6 mb-2">QR Code</h3>
          <img alt="QR Code" src={qrUrl} className="border rounded" />
        </div>
      </div>
    </div>
  );
}
