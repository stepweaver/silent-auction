'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Field from '@/components/Field';

export default function NewItemPage() {
  const router = useRouter();
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

      const res = await fetch('/api/admin/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photo_url: photoUrl }),
      });

      if (!res.ok) {
        const text = await res.text();
        setMsg(text || 'Error creating item');
        return;
      }

      const { item } = await res.json();
      router.push(`/admin/items/${item.id}`);
    } catch (err) {
      setMsg('Error creating item');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Link href="/admin" className="underline">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-semibold">New Item</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
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
            placeholder="auto-generated-from-title"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL-friendly identifier (auto-formatted from title if not provided)
          </p>
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

        {msg && (
          <div className={`p-2 rounded ${msg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {msg}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Item'}
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
