'use client';

import { useState, useEffect } from 'react';
import { COLORS, ANIMALS, generateRandomAlias, formatAlias } from '@/lib/alias';

export default function AliasSelector({ email, onAliasSelected, initialAlias = null }) {
  const [selectedColor, setSelectedColor] = useState(initialAlias?.color || null);
  const [selectedAnimal, setSelectedAnimal] = useState(initialAlias?.animal || null);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate random alias on mount if no initial alias
  useEffect(() => {
    if (!initialAlias && !selectedColor && !selectedAnimal) {
      const random = generateRandomAlias();
      setSelectedColor(random.color);
      setSelectedAnimal(random.animal);
    }
  }, [initialAlias]);

  // Auto-generate random alias
  const handleRandomize = () => {
    const random = generateRandomAlias();
    setSelectedColor(random.color);
    setSelectedAnimal(random.animal);
    setError('');
    setSuccess('');
  };

  // Check alias availability
  const handleCheckAlias = async () => {
    if (!selectedColor || !selectedAnimal) {
      setError('Please select both a color and an animal');
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
      const alias = formatAlias(selectedColor, selectedAnimal);
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
    if (!selectedColor || !selectedAnimal) {
      setError('Please select both a color and an animal');
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
      const alias = formatAlias(selectedColor, selectedAnimal);
      const response = await fetch('/api/alias/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          alias,
          color: selectedColor,
          animal: selectedAnimal,
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
  const selectedAnimalObj = ANIMALS.find(a => a.value === selectedAnimal);

  return (
    <div className="bg-base-100 rounded-xl border border-base-300 shadow-lg p-6 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-base-content mb-2">Choose Your Alias</h2>
        <p className="text-sm text-base-content/70">
          Select a color and animal combination to create your unique bidding identity.
        </p>
      </div>

        {/* Color Selection */}
        <div className="form-control w-full mb-6">
          <label className="label pb-2">
            <span className="label-text font-semibold text-base">Choose a Color</span>
          </label>
          <div className="grid grid-cols-5 gap-3">
            {COLORS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => {
                  setSelectedColor(color.value);
                  setError('');
                  setSuccess('');
                }}
                className={`btn btn-sm ${
                  selectedColor === color.value
                    ? 'btn-primary'
                    : 'btn-outline'
                }`}
                style={{
                  backgroundColor: selectedColor === color.value ? color.hex : 'transparent',
                  borderColor: color.hex,
                  color: selectedColor === color.value ? '#fff' : color.hex,
                }}
                title={color.name}
              >
                <span className="text-lg">{color.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Animal Selection */}
        <div className="form-control w-full mb-6">
          <label className="label pb-2">
            <span className="label-text font-semibold text-base">Choose an Animal</span>
          </label>
          <div className="grid grid-cols-5 gap-3">
            {ANIMALS.map((animal) => (
              <button
                key={animal.value}
                type="button"
                onClick={() => {
                  setSelectedAnimal(animal.value);
                  setError('');
                  setSuccess('');
                }}
                className={`btn btn-sm ${
                  selectedAnimal === animal.value
                    ? 'btn-primary'
                    : 'btn-outline'
                }`}
                title={animal.name}
              >
                <span className="text-2xl">{animal.emoji}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {selectedColor && selectedAnimal && (
          <div className="bg-primary/10 border-2 border-primary/30 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg"
                style={{ backgroundColor: selectedColorObj?.hex }}
              >
                {selectedAnimalObj?.emoji}
              </div>
              <div className="flex-1">
                <div className="font-bold text-lg text-base-content mb-1">
                  Your Alias: {formatAlias(selectedColor, selectedAnimal)}
                </div>
                <div className="text-sm text-base-content/70">
                  This is how others will see your bids
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
            className="btn btn-outline btn-primary w-full"
          >
            🎲 Randomize Selection
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
            disabled={!selectedColor || !selectedAnimal || isChecking || isCreating}
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
            disabled={!selectedColor || !selectedAnimal || isCreating || !!error}
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

