'use client';

import { useState } from 'react';
import CustomAvatar from './CustomAvatar';

const AVATAR_STYLES = [
  { id: 'custom', name: 'Initials', description: 'Clean initials with gradient colors' },
];

export default function AvatarGenerator({ email, name, onAvatarSelected, initialSeed = null }) {
  const [selectedStyle, setSelectedStyle] = useState('custom');
  const [seed, setSeed] = useState(initialSeed || email || 'default');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const currentStyle = AVATAR_STYLES.find(s => s.id === selectedStyle);

  const handleRandomize = () => {
    // Generate a random seed
    const randomSeed = Math.random().toString(36).substring(2, 15) + 
                      Math.random().toString(36).substring(2, 15);
    setSeed(randomSeed);
    setError('');
  };

  const handleCreate = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Create a deterministic seed from email + current seed
      const avatarSeed = seed || email;
      
      // Generate a nice alias from the seed
      const alias = seed && seed.includes('@') 
        ? seed.split('@')[0].charAt(0).toUpperCase() + seed.split('@')[0].slice(1)
        : `User ${avatarSeed.substring(0, 6)}`;
      
      const payload = {
        email,
        alias: alias,
        avatar_style: selectedStyle,
        avatar_seed: avatarSeed,
      };

      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (trimmedName) {
        payload.name = trimmedName;
      }

      const response = await fetch('/api/alias/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error creating avatar');
        return;
      }

      // Success - notify parent
      if (onAvatarSelected) {
        onAvatarSelected({
          ...data.alias,
          avatar_style: selectedStyle,
          avatar_seed: avatarSeed,
        });
      }
    } catch (err) {
      setError('Error creating avatar. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-2xl border-2 border-primary/20 shadow-2xl p-6 sm:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-base-content">Create Your Avatar</h2>
            <p className="text-sm text-base-content/70">
              Choose a style and customize your unique bidding identity
            </p>
          </div>
        </div>
      </div>

      {/* Style Selection */}
      <div className="form-control w-full mb-6">
        <label className="label pb-3">
          <span className="label-text font-bold text-lg">Avatar Style</span>
        </label>
        <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-2 border-primary/30 rounded-xl p-4 shadow-md">
          <div className="flex items-center gap-4">
            <CustomAvatar seed={seed} size={56} />
            <div className="flex-1">
              <div className="font-bold text-lg">Dynamic Avatar</div>
              <div className="text-sm text-base-content/70">Unique patterns, gradients, and colors generated from your seed</div>
              <div className="flex gap-2 mt-2">
                <span className="badge badge-primary badge-sm">Gradients</span>
                <span className="badge badge-secondary badge-sm">Patterns</span>
                <span className="badge badge-accent badge-sm">Unique</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/50 rounded-2xl p-6 mb-6 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <CustomAvatar 
            seed={seed} 
            size={120} 
            className="border-4 border-primary/30 shadow-2xl"
          />
          <div className="text-center">
            <div className="font-bold text-xl text-base-content mb-1">
              Your Avatar Preview
            </div>
            <div className="text-sm text-base-content/70">
              Each seed generates a unique visual pattern
            </div>
          </div>
        </div>
      </div>

      {/* Seed Input (optional customization) */}
      <div className="form-control mb-6">
        <label className="label">
          <span className="label-text font-semibold">Customize Seed (optional)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="input input-bordered flex-1 border-2 focus:border-primary focus:outline-none"
            placeholder="Enter text to generate unique avatar"
            value={seed}
            onChange={(e) => {
              setSeed(e.target.value || email || 'default');
              setError('');
            }}
          />
          <button
            type="button"
            onClick={handleRandomize}
            className="btn btn-outline btn-primary"
          >
            Randomize
          </button>
        </div>
        <label className="label">
          <span className="label-text-alt">Change the seed to generate a different avatar</span>
        </label>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-error/10 border-2 border-error/30 rounded-xl p-4 mb-4">
          <span className="text-error font-semibold">{error}</span>
        </div>
      )}

      {/* Action Button */}
      <button
        type="button"
        onClick={handleCreate}
        disabled={isCreating || !email}
        className="btn btn-primary btn-lg w-full shadow-lg"
      >
        {isCreating ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            Creating...
          </>
        ) : (
          'Create Avatar'
        )}
      </button>
    </div>
  );
}

