'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Field from '@/components/Field';

const CATEGORIES = [
  'Sports',
  'Restaurants',
  'Family Fun',
  'Services',
  'Memberships',
  'Other',
];

export default function NewItemPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    photo_url: '',
    start_price: '0',
    is_closed: false,
    category: '',
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
      <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Link href="/admin" className="text-sm underline text-gray-700 hover:text-gray-900">
          ← Dashboard
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold">New Item</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-3 sm:space-y-4">
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

        <Field label="Category">
          <select
            className="border rounded px-3 py-2 w-full"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            disabled={isSubmitting}
          >
            <option value="">Select a category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
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
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-600">
              <p className="font-semibold text-gray-700">Photo tips for donors:</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                <li>Turn your phone sideways so the picture is in landscape.</li>
                <li>Fill the frame with the item and leave a little space around the edges.</li>
                <li>Shoot in a bright room, avoid strong backlighting, and wipe the camera lens first.</li>
              </ul>
            </div>
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
              </div>
            )}
            {uploadingPhoto && <p className="text-xs text-blue-600">Uploading photo...</p>}
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

        </div>

        {msg && (
          <div className={`p-2 sm:p-3 rounded text-sm ${msg.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            {msg}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Item'}
          </button>
          <Link
            href="/admin"
            className="px-4 py-2 border rounded hover:bg-gray-50 text-center text-sm sm:text-base"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
