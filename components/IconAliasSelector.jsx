'use client';

import { useState, useEffect } from 'react';
import { COLORS, ICONS, generateRandomAlias, formatAlias, getColorByValue, getIconByValue } from '@/lib/iconAlias';
import {
  Star,
  Heart,
  Diamond,
  Moon,
  Sun,
  Flame,
  Sparkles,
  Zap,
  Trophy,
  Crown,
  Shield,
  Sword,
  Gem,
  Comet,
  Rocket,
  Leaf,
  Flower,
  TreePine,
  Mountain,
  Waves,
  Droplets,
  Snowflake,
  Cloud,
  Anchor,
  Ship,
  Fish,
  Bird,
  Butterfly,
  Bug,
  Cat,
  Dog,
  Rabbit,
  Fox,
  PawPrint,
  Music,
  Guitar,
  Drum,
  Mic,
  Camera,
  Film,
  Gamepad2,
  Puzzle,
  Book,
  PenTool,
  Palette,
  Paintbrush,
} from 'lucide-react';

const LUCIDE_ICON_MAP = {
  Star,
  Heart,
  Diamond,
  Moon,
  Sun,
  Flame,
  Sparkles,
  Zap,
  Trophy,
  Crown,
  Shield,
  Sword,
  Gem,
  Comet,
  Rocket,
  Leaf,
  Flower,
  TreePine,
  Mountain,
  Waves,
  Droplets,
  Snowflake,
  Cloud,
  Anchor,
  Ship,
  Fish,
  Bird,
  Butterfly,
  Bug,
  Cat,
  Dog,
  Rabbit,
  Fox,
  PawPrint,
  Music,
  Guitar,
  Drum,
  Mic,
  Camera,
  Film,
  Gamepad2,
  Puzzle,
  Book,
  PenTool,
  Palette,
  Paintbrush,
};

export default function IconAliasSelector({ email, onAliasSelected, initialAlias = null }) {
  const [selectedColor, setSelectedColor] = useState(initialAlias?.color || null);
  const [selectedIcon, setSelectedIcon] = useState(initialAlias?.icon || null);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate random alias on mount if no initial alias
  useEffect(() => {
    if (!initialAlias && !selectedColor && !selectedIcon) {
      const random = generateRandomAlias();
      setSelectedColor(random.color);
      setSelectedIcon(random.icon);
    }
  }, [initialAlias]);

  // Auto-generate random alias
  const handleRandomize = () => {
    const random = generateRandomAlias();
    setSelectedColor(random.color);
    setSelectedIcon(random.icon);
    setError('');
    setSuccess('');
  };

  // Check alias availability
  const handleCheckAlias = async () => {
    if (!selectedColor || !selectedIcon) {
      setError('Please select both a color and an icon');
      return;
    }

    if (!email) {
      setError('Email is required');
      return;
    }

    setIsChecking(true);
    setError('');
    setSuccess('');

    try {
      const alias = formatAlias(selectedColor, selectedIcon);
      const response = await fetch('/api/alias/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error checking alias');
        return;
      }

      if (data.available) {
        setSuccess('This alias is available!');
      } else {
        setError('This alias is already taken. Try a different combination!');
      }
    } catch (err) {
      setError('Error checking alias. Please try again.');
      console.error(err);
    } finally {
      setIsChecking(false);
    }
  };

  // Create alias
  const handleCreateAlias = async () => {
    if (!selectedColor || !selectedIcon) {
      setError('Please select both a color and an icon');
      return;
    }

    if (!email) {
      setError('Email is required');
      return;
    }

    setIsCreating(true);
    setError('');
    setSuccess('');

    try {
      const alias = formatAlias(selectedColor, selectedIcon);
      const { getJsonHeadersWithCsrf } = await import('@/lib/clientCsrf');
      const headers = await getJsonHeadersWithCsrf();
      if (!headers['x-csrf-token']) {
        setError('Security token missing. Please refresh the page and try again.');
        return;
      }
      const response = await fetch('/api/alias/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          alias,
          color: selectedColor,
          icon: selectedIcon,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error creating alias');
        return;
      }

      // Success - notify parent
      if (onAliasSelected) {
        onAliasSelected(data.alias);
      }
    } catch (err) {
      setError('Error creating alias. Please try again.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedColorObj = COLORS.find(c => c.value === selectedColor);
  const selectedIconObj = ICONS.find(i => i.value === selectedIcon);

  const IconComponent = selectedIconObj ? (LUCIDE_ICON_MAP[selectedIconObj.icon] || Star) : null;

  return (
    <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-2xl border-2 border-primary/20 shadow-2xl p-6 sm:p-8 animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-base-content">Create Your Avatar</h2>
            <p className="text-sm text-base-content/70">
              Choose a color and icon for your unique bidding identity
            </p>
          </div>
        </div>
      </div>

      {/* Color Selection */}
      <div className="form-control w-full mb-6">
        <label className="label pb-3">
          <span className="label-text font-bold text-lg">1. Choose Your Color</span>
        </label>
        <div className="grid grid-cols-5 sm:grid-cols-5 gap-3">
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => {
                setSelectedColor(color.value);
                setError('');
                setSuccess('');
              }}
              className={`btn btn-sm h-16 transition-all duration-200 hover:scale-110 ${
                selectedColor === color.value
                  ? 'ring-4 ring-primary ring-offset-2 shadow-lg scale-105'
                  : 'hover:shadow-md'
              }`}
              style={{
                backgroundColor: selectedColor === color.value ? color.hex : color.hex + '20',
                borderColor: color.hex,
                borderWidth: '2px',
                color: selectedColor === color.value ? '#fff' : color.hex,
              }}
              title={color.name}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: color.hex }}
              />
            </button>
          ))}
        </div>
        {selectedColorObj && (
          <label className="label pt-2">
            <span className="label-text-alt text-primary font-semibold">
              Selected: {selectedColorObj.name}
            </span>
          </label>
        )}
      </div>

      {/* Icon Selection */}
      <div className="form-control w-full mb-6">
        <label className="label pb-3">
          <span className="label-text font-bold text-lg">2. Choose Your Icon</span>
        </label>
        <div className="grid grid-cols-5 sm:grid-cols-5 gap-3 max-h-64 overflow-y-auto">
          {ICONS.map((icon) => {
            const Icon = LUCIDE_ICON_MAP[icon.icon] || Star;
            return (
              <button
                key={icon.value}
                type="button"
                onClick={() => {
                  setSelectedIcon(icon.value);
                  setError('');
                  setSuccess('');
                }}
                className={`btn btn-sm h-16 flex-col gap-1 transition-all duration-200 hover:scale-110 ${
                  selectedIcon === icon.value
                    ? 'ring-4 ring-primary ring-offset-2 shadow-lg scale-105 bg-primary'
                    : 'hover:shadow-md'
                }`}
                title={icon.name}
              >
                <Icon size={20} strokeWidth={2} />
                <span className="text-xs leading-tight">{icon.name}</span>
              </button>
            );
          })}
        </div>
        {selectedIconObj && (
          <label className="label pt-2">
            <span className="label-text-alt text-primary font-semibold">
              Selected: {selectedIconObj.name}
            </span>
          </label>
        )}
      </div>

      {/* Preview */}
      {selectedColor && selectedIcon && (
        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/50 rounded-2xl p-6 mb-6 shadow-xl animate-pulse-subtle">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-110"
              style={{ backgroundColor: selectedColorObj?.hex }}
            >
              {IconComponent && (
                <IconComponent size={48} strokeWidth={2} className="text-white" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="font-bold text-2xl text-base-content mb-2">
                {formatAlias(selectedColor, selectedIcon)}
              </div>
              <div className="text-sm text-base-content/70 mb-2">
                Your secret bidding identity 🕵️ - This is how others will see your bids
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-base-content/60">
                <span className="badge badge-primary badge-sm">{selectedColorObj?.name}</span>
                <span className="badge badge-secondary badge-sm">{selectedIconObj?.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Random Button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleRandomize}
          className="btn btn-outline btn-primary w-full btn-lg hover:btn-primary transition-all"
        >
          Randomize Selection
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-error/10 border-2 border-error/30 rounded-xl p-4 mb-4">
          <span className="text-error font-semibold">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-success/10 border-2 border-success/30 rounded-xl p-4 mb-4">
          <span className="text-success font-semibold">{success}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleCheckAlias}
          disabled={!selectedColor || !selectedIcon || isChecking || isCreating}
          className="btn btn-outline btn-lg flex-1"
        >
          {isChecking ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Checking...
            </>
          ) : (
            'Check Availability'
          )}
        </button>
        <button
          type="button"
          onClick={handleCreateAlias}
          disabled={!selectedColor || !selectedIcon || isCreating || !!error}
          className="btn btn-primary btn-lg flex-1"
        >
          {isCreating ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Creating...
            </>
          ) : (
            'Create Alias'
          )}
        </button>
      </div>
    </div>
  );
}

