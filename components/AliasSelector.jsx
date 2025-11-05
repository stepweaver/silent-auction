'use client';

import { useState, useEffect, useMemo } from 'react';
import { COLORS, ANIMALS, generateRandomAlias, formatAlias } from '@/lib/alias';

// Categorize emojis by index ranges (simpler than filtering)
const ANIMALS_START = 0;
const ANIMALS_END = 46; // First 46 are animals (indices 0-45)
const PEOPLE_START = 46;
const PEOPLE_END = 75; // Next 29 are people (indices 46-74)
const VEHICLES_START = 75; // Rest are vehicles (indices 75+)

const EMOJI_CATEGORIES = {
  animals: ANIMALS.slice(ANIMALS_START, ANIMALS_END),
  people: ANIMALS.slice(PEOPLE_START, PEOPLE_END),
  vehicles: ANIMALS.slice(VEHICLES_START),
};

export default function AliasSelector({ email, name, onAliasSelected, initialAlias = null }) {
  const [selectedColor, setSelectedColor] = useState(initialAlias?.color || null);
  const [selectedAnimal, setSelectedAnimal] = useState(initialAlias?.animal || null);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emojiCategory, setEmojiCategory] = useState('animals');
  const [emojiSearch, setEmojiSearch] = useState('');
  const [checkingExistingEmail, setCheckingExistingEmail] = useState(false);

  // Check if email already has an alias when email changes
  useEffect(() => {
    let isMounted = true;
    
    const checkExistingEmailAlias = async () => {
      if (!email || !email.includes('@')) return;
      
      setCheckingExistingEmail(true);
      try {
        const response = await fetch('/api/alias/get', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();
        
        if (isMounted && response.ok && data.alias) {
          // Email already has an alias
          setError('This email already has an alias. Your existing alias will be used.');
          setSuccess(`Your existing alias: ${data.alias.alias}`);
          if (data.alias.color) setSelectedColor(data.alias.color);
          if (data.alias.animal) setSelectedAnimal(data.alias.animal);
          if (onAliasSelected) {
            onAliasSelected(data.alias);
          }
        }
      } catch (err) {
        // Silently fail - email might not have an alias yet
        if (isMounted) {
          console.error('Error checking existing email:', err);
        }
      } finally {
        if (isMounted) {
          setCheckingExistingEmail(false);
        }
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(() => {
      checkExistingEmailAlias();
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [email, onAliasSelected]);

  // Generate random alias on mount if no initial alias
  useEffect(() => {
    if (!initialAlias && !selectedColor && !selectedAnimal && !email) {
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
    // Reset category to show the new selection
    const selected = ANIMALS.find(a => a.value === random.animal);
    if (selected) {
      const index = ANIMALS.indexOf(selected);
      if (index < ANIMALS_END) setEmojiCategory('animals');
      else if (index < PEOPLE_END) setEmojiCategory('people');
      else setEmojiCategory('vehicles');
    }
  };

  // Check alias availability
  const handleCheckAlias = async () => {
    if (!selectedColor || !selectedAnimal) {
      setError('Please select both a color and an emoji');
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
      setError('Please select both a color and an emoji');
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
          name: name || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If email already has an alias, show the existing alias info
        if (data.existingAlias) {
          setError(data.error || 'This email already has an alias');
          // Auto-select the existing alias for the user
          if (data.existingAlias.color) {
            setSelectedColor(data.existingAlias.color);
          }
          if (data.existingAlias.animal) {
            setSelectedAnimal(data.existingAlias.animal);
          }
          // Show existing alias info
          setSuccess(`Your existing alias is: ${data.existingAlias.alias}`);
          // Notify parent about existing alias
          if (onAliasSelected) {
            onAliasSelected(data.existingAlias);
          }
        } else {
          setError(data.error || 'Error creating alias');
        }
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

  // Filter emojis by search and category
  const filteredEmojis = useMemo(() => {
    let emojis = EMOJI_CATEGORIES[emojiCategory] || [];
    
    if (emojiSearch.trim()) {
      const searchLower = emojiSearch.toLowerCase();
      emojis = emojis.filter(animal => 
        animal.name.toLowerCase().includes(searchLower) ||
        animal.value.toLowerCase().includes(searchLower)
      );
    }
    
    return emojis;
  }, [emojiCategory, emojiSearch]);

  const selectedColorObj = COLORS.find(c => c.value === selectedColor);
  const selectedAnimalObj = ANIMALS.find(a => a.value === selectedAnimal);

  return (
    <div className="bg-gradient-to-br from-base-100 to-base-200 rounded-2xl border-2 border-primary/20 shadow-2xl p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-base-content">Create Your Avatar</h2>
            <p className="text-sm text-base-content/70">
              Design your unique bidding identity
            </p>
          </div>
        </div>
      </div>

      {/* Color Selection - Full Color Buttons */}
      <div className="form-control w-full mb-6">
        <label className="label pb-3">
          <span className="label-text font-bold text-lg">1. Choose Your Color</span>
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => {
                setSelectedColor(color.value);
                setError('');
                setSuccess('');
              }}
              className={`relative h-12 sm:h-14 lg:h-16 rounded-lg transition-all duration-300 hover:scale-110 hover:shadow-xl ${
                selectedColor === color.value
                  ? 'ring-4 ring-primary ring-offset-2 shadow-2xl scale-105 z-10'
                  : 'hover:shadow-lg'
              }`}
              style={{
                backgroundColor: color.hex,
                border: selectedColor === color.value ? '3px solid white' : '2px solid transparent',
              }}
              title={color.name}
            >
              {selectedColor === color.value && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
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

      {/* Emoji Selection - Categorized with Search */}
      <div className="form-control w-full mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <label className="label pb-0">
            <span className="label-text font-bold text-lg">2. Choose Your Emoji</span>
          </label>
          
          {/* Search Input */}
          <div className="form-control flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder="Search emojis..."
              className="input input-bordered input-sm w-full border-2 focus:border-primary focus:outline-none"
              value={emojiSearch}
              onChange={(e) => setEmojiSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="tabs tabs-boxed mb-4 bg-base-200/50 justify-center sm:justify-start">
          <button
            type="button"
            onClick={() => {
              setEmojiCategory('animals');
              setEmojiSearch('');
            }}
            className={`tab tab-sm sm:tab-md transition-all ${
              emojiCategory === 'animals' ? 'tab-active' : ''
            }`}
          >
            🐾 Animals ({EMOJI_CATEGORIES.animals.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setEmojiCategory('people');
              setEmojiSearch('');
            }}
            className={`tab tab-sm sm:tab-md transition-all ${
              emojiCategory === 'people' ? 'tab-active' : ''
            }`}
          >
            👥 People ({EMOJI_CATEGORIES.people.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setEmojiCategory('vehicles');
              setEmojiSearch('');
            }}
            className={`tab tab-sm sm:tab-md transition-all ${
              emojiCategory === 'vehicles' ? 'tab-active' : ''
            }`}
          >
            🚗 Vehicles ({EMOJI_CATEGORIES.vehicles.length})
          </button>
        </div>

        {/* Emoji Grid */}
        <div className="bg-base-200/30 rounded-xl p-3 sm:p-4 border border-base-300">
          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-2 max-h-64 sm:max-h-80 overflow-y-auto">
            {filteredEmojis.length > 0 ? (
              filteredEmojis.map((animal) => (
                <button
                  key={animal.value}
                  type="button"
                  onClick={() => {
                    setSelectedAnimal(animal.value);
                    setError('');
                    setSuccess('');
                  }}
                  className={`btn btn-sm h-12 sm:h-14 transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                    selectedAnimal === animal.value
                      ? 'ring-4 ring-primary ring-offset-2 shadow-xl scale-110 bg-primary text-primary-content'
                      : 'hover:shadow-md'
                  }`}
                  title={animal.name}
                >
                  <span className="text-2xl sm:text-3xl">{animal.emoji}</span>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-base-content/50">
                <p className="text-sm">No emojis found matching "{emojiSearch}"</p>
                <button
                  type="button"
                  onClick={() => setEmojiSearch('')}
                  className="btn btn-sm btn-ghost mt-2"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
        
        {selectedAnimalObj && (
          <label className="label pt-2">
            <span className="label-text-alt text-primary font-semibold">
              Selected: {selectedAnimalObj.name}
            </span>
          </label>
        )}
      </div>

      {/* Preview */}
      {selectedColor && selectedAnimal && (
        <div className="bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/50 rounded-2xl p-4 sm:p-6 mb-6 shadow-xl animate-pulse-subtle">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-4xl sm:text-5xl shadow-2xl transition-transform hover:scale-110 cursor-pointer"
              style={{ backgroundColor: selectedColorObj?.hex }}
            >
              {selectedAnimalObj?.emoji}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="font-bold text-xl sm:text-2xl text-base-content mb-2">
                {formatAlias(selectedColor, selectedAnimal)}
              </div>
              <div className="text-sm text-base-content/70 mb-2">
                This is how others will see your bids
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-base-content/60">
                <span className="badge badge-primary badge-sm">{selectedColorObj?.name}</span>
                <span className="badge badge-secondary badge-sm">{selectedAnimalObj?.name}</span>
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
          className="btn btn-outline btn-primary w-full btn-lg hover:btn-primary transition-all duration-200 hover:scale-105"
        >
          Randomize Selection
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-error/10 border-2 border-error/30 rounded-xl p-4 mb-4 animate-fade-in">
          <span className="text-error font-semibold">{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-success/10 border-2 border-success/30 rounded-xl p-4 mb-4 animate-fade-in">
          <span className="text-success font-semibold">{success}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleCheckAlias}
          disabled={!selectedColor || !selectedAnimal || isChecking || isCreating}
          className="btn btn-outline btn-lg flex-1 transition-all hover:scale-105"
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
          className="btn btn-primary btn-lg flex-1 transition-all hover:scale-105 shadow-lg"
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
