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
    <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary/95 to-primary/90 px-5 sm:px-6 md:px-8 py-6 sm:py-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/30">
            <span className="text-white font-bold text-xl sm:text-2xl">A</span>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Create Your Avatar</h2>
            <p className="text-sm sm:text-base text-white/90 mt-0.5">
              Design your unique bidding identity
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 sm:px-6 md:px-8 py-5 sm:py-6 md:py-8">

      {/* Color Selection */}
      <div className="mb-5 sm:mb-6">
        <label className="block text-sm sm:text-base font-bold text-gray-900 mb-3">
          1. Choose Your Color
        </label>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 gap-2">
          {COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => {
                setSelectedColor(color.value);
                setError('');
                setSuccess('');
              }}
              className={`relative h-10 sm:h-12 md:h-14 rounded-lg transition-all duration-200 hover:scale-110 ${
                selectedColor === color.value
                  ? 'ring-3 ring-primary ring-offset-2 shadow-lg scale-105 z-10'
                  : 'hover:shadow-md'
              }`}
              style={{
                backgroundColor: color.hex,
                border: selectedColor === color.value ? '2px solid white' : '1px solid rgba(0,0,0,0.1)',
              }}
              title={color.name}
            >
              {selectedColor === color.value && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
        {selectedColorObj && (
          <p className="mt-2 text-xs sm:text-sm text-primary font-semibold">
            Selected: {selectedColorObj.name}
          </p>
        )}
      </div>

      {/* Emoji Selection */}
      <div className="mb-5 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <label className="block text-sm sm:text-base font-bold text-gray-900">
            2. Choose Your Emoji
          </label>
          
          {/* Search Input */}
          <input
            type="text"
            placeholder="Search emojis..."
            className="w-full sm:w-48 px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
            value={emojiSearch}
            onChange={(e) => setEmojiSearch(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
          <button
            type="button"
            onClick={() => {
              setEmojiCategory('animals');
              setEmojiSearch('');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              emojiCategory === 'animals'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              emojiCategory === 'people'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              emojiCategory === 'vehicles'
                ? 'bg-primary text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🚗 Vehicles ({EMOJI_CATEGORIES.vehicles.length})
          </button>
        </div>

        {/* Emoji Grid */}
        <div className="bg-gray-50 rounded-xl p-3 sm:p-4 border border-gray-200">
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 sm:max-h-80 overflow-y-auto">
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
                  className={`h-10 sm:h-12 md:h-14 rounded-lg transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                    selectedAnimal === animal.value
                      ? 'ring-3 ring-primary ring-offset-2 shadow-lg scale-110 bg-primary text-white'
                      : 'bg-white hover:shadow-md border border-gray-200'
                  }`}
                  title={animal.name}
                >
                  <span className="text-xl sm:text-2xl md:text-3xl">{animal.emoji}</span>
                </button>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                <p className="text-sm mb-2">No emojis found matching "{emojiSearch}"</p>
                <button
                  type="button"
                  onClick={() => setEmojiSearch('')}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </div>
        
        {selectedAnimalObj && (
          <p className="mt-2 text-xs sm:text-sm text-primary font-semibold">
            Selected: {selectedAnimalObj.name}
          </p>
        )}
      </div>

      {/* Preview */}
      {selectedColor && selectedAnimal && (
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-5 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-3xl sm:text-4xl shadow-lg transition-transform hover:scale-110"
              style={{ backgroundColor: selectedColorObj?.hex }}
            >
              {selectedAnimalObj?.emoji}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="font-bold text-lg sm:text-xl md:text-2xl text-gray-900 mb-1">
                {formatAlias(selectedColor, selectedAnimal)}
              </div>
              <div className="text-xs sm:text-sm text-gray-600 mb-2">
                This is how others will see your bids
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                  {selectedColorObj?.name}
                </span>
                <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-medium rounded-full">
                  {selectedAnimalObj?.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Random Button */}
      <div className="mb-4 sm:mb-5">
        <button
          type="button"
          onClick={handleRandomize}
          className="w-full px-4 py-2.5 border-2 border-primary text-primary font-semibold rounded-xl hover:bg-primary hover:text-white transition-all duration-200 text-sm sm:text-base"
        >
          🎲 Randomize Selection
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 sm:p-4 mb-4">
          <p className="text-red-700 font-medium text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 sm:p-4 mb-4">
          <p className="text-green-700 font-medium text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleCheckAlias}
          disabled={!selectedColor || !selectedAnimal || isChecking || isCreating}
          className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base flex items-center justify-center gap-2"
        >
          {isChecking ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
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
          className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] text-sm sm:text-base flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            'Create Alias'
          )}
        </button>
      </div>
      </div>
    </div>
  );
}
