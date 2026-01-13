'use client';

import { useState, useEffect, useMemo, useId } from 'react';
import Image from 'next/image';
import { COLORS, ANIMALS, generateRandomAlias, formatAlias } from '@/lib/alias';

// Animation keyframes for randomize effect (2 full rotations)
const randomizeAnimation = `
  @keyframes randomizeSpin {
    0% { transform: rotate(0deg) scale(1); }
    12.5% { transform: rotate(90deg) scale(1.1); }
    25% { transform: rotate(180deg) scale(1.15); }
    37.5% { transform: rotate(270deg) scale(1.1); }
    50% { transform: rotate(360deg) scale(1.05); }
    62.5% { transform: rotate(450deg) scale(1.1); }
    75% { transform: rotate(540deg) scale(1.15); }
    87.5% { transform: rotate(630deg) scale(1.1); }
    100% { transform: rotate(720deg) scale(1); }
  }
  @keyframes randomizeShake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
    20%, 40%, 60%, 80% { transform: translateX(4px); }
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

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

export default function AliasSelector({
  email,
  name: propName,
  onAliasSelected,
  initialAlias = null,
  isModal = false,
  onClose = null,
}) {
  const [selectedColor, setSelectedColor] = useState(
    initialAlias?.color || null
  );
  const [selectedAnimal, setSelectedAnimal] = useState(
    initialAlias?.animal || null
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [emojiCategory, setEmojiCategory] = useState('animals');
  const [emojiSearch, setEmojiSearch] = useState('');
  const [checkingExistingEmail, setCheckingExistingEmail] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const emojiPickerId = useId();
  const modalTitleId = useId();

  // Use the name from verification token generation
  const name = propName;

  // Check verification status when email is provided
  useEffect(() => {
    const checkVerification = async () => {
      if (!email || !email.trim()) {
        setCheckingVerification(false);
        setIsVerified(false);
        return;
      }

      setCheckingVerification(true);
      try {
        const response = await fetch('/api/alias/check-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();

        if (response.ok) {
          const verified = data.verified === true;
          setIsVerified(verified);
          if (!verified) {
            // Clear any previous success messages if not verified
            setSuccess('');
          }
        } else {
          setIsVerified(false);
        }
      } catch (err) {
        console.error('Error checking verification:', err);
        setIsVerified(false);
      } finally {
        setCheckingVerification(false);
      }
    };

    checkVerification();
  }, [email]);

  // Check if email already has an alias when email changes
  useEffect(() => {
    let isMounted = true;

    const checkExistingEmailAlias = async () => {
      // Basic format check - don't do expensive validation on every keystroke
      if (!email || !email.includes('@') || email.split('@').length !== 2)
        return;

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
          setError(
            'This email already has an alias. Your existing alias will be used.'
          );
          setSuccess(`Your existing alias: ${data.alias.alias}`);
          if (data.alias.color) setSelectedColor(data.alias.color);
          if (data.alias.animal) setSelectedAnimal(data.alias.animal);

          // Note: Security notification is handled by landing page recovery logic
          // This component is used during alias creation flow, not recovery

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

  // Auto-generate random alias with animation
  const handleRandomize = () => {
    setIsRandomizing(true);
    setError('');
    setSuccess('');

    // Animate through random selections before settling (longer animation)
    let iterations = 0;
    const maxIterations = 16; // More iterations for longer spin
    const interval = setInterval(() => {
      const random = generateRandomAlias();
      setSelectedColor(random.color);
      setSelectedAnimal(random.animal);

      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setIsRandomizing(false);

        // Reset category to show the new selection
        const selected = ANIMALS.find((a) => a.value === random.animal);
        if (selected) {
          const index = ANIMALS.indexOf(selected);
          if (index < ANIMALS_END) setEmojiCategory('animals');
          else if (index < PEOPLE_END) setEmojiCategory('people');
          else setEmojiCategory('vehicles');
        }
      }
    }, 100); // 100ms per iteration = 1.6s total
  };

  // Check alias availability
  const handleCheckAlias = async () => {
    if (!selectedColor || !selectedAnimal) {
      setError('Please select both a color and an emoji');
      return;
    }

    if (!email || !email.trim()) {
      setError('Email is required');
      return;
    }

    // Validate email format and domain - REQUIRED before proceeding
    try {
      const response = await fetch('/api/email/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!data.valid) {
        let errorMsg = data.error || 'Please enter a valid email address';
        if (data.suggestion) {
          errorMsg += ` Did you mean ${data.suggestion}?`;
        }
        setError(errorMsg);
        return; // BLOCK if validation fails
      }
    } catch (err) {
      console.error('Email validation error:', err);
      // If validation API fails, we MUST reject to prevent invalid registrations
      setError(
        'Unable to verify email address. Please check for typos and try again.'
      );
      return; // BLOCK on validation failure
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

    if (!email || !email.trim()) {
      setError('Email is required');
      return;
    }

    // Check verification before proceeding
    if (!isVerified && !checkingVerification) {
      // Double-check verification status
      try {
        const checkResponse = await fetch('/api/alias/check-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const checkData = await checkResponse.json();
        
        if (!checkData.verified) {
          setError('Please verify your email address before creating an alias. Check your email for the verification link.');
          return;
        }
        setIsVerified(true);
      } catch (err) {
        console.error('Error checking verification:', err);
        setError('Please verify your email address before creating an alias. Check your email for the verification link.');
        return;
      }
    }

    if (!isVerified) {
      setError('Please verify your email address before creating an alias. Check your email for the verification link.');
      return;
    }

    // Validate email format and domain - REQUIRED before proceeding
    try {
      const response = await fetch('/api/email/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await response.json();

      if (!data.valid) {
        let errorMsg = data.error || 'Please enter a valid email address';
        if (data.suggestion) {
          errorMsg += ` Did you mean ${data.suggestion}?`;
        }
        setError(errorMsg);
        return; // BLOCK if validation fails
      }
    } catch (err) {
      console.error('Email validation error:', err);
      // If validation API fails, we MUST reject to prevent invalid registrations
      setError(
        'Unable to verify email address. Please check for typos and try again.'
      );
      return; // BLOCK on validation failure
    }

    setIsCreating(true);
    setError('');
    setSuccess('');

    try {
      const alias = formatAlias(selectedColor, selectedAnimal);
      const requestPayload = {
        email: email.trim(), // Use trimmed email
        alias,
        color: selectedColor,
        animal: selectedAnimal,
      };

      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (trimmedName) {
        requestPayload.name = trimmedName;
      }

      const response = await fetch('/api/alias/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Log error details for debugging
        console.error('[ALIAS SELECTOR] Create alias failed:', {
          status: response.status,
          error: data.error,
          email: email.trim(),
          payload: requestPayload,
        });

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
          // Show the actual error message from the server
          setError(data.error || 'Error creating alias');
        }
        return;
      }

      // Success - check if verification is required
      if (data.requiresVerification) {
        setSuccess(
          data.message ||
            'Alias created! Please check your email to verify your address before you can start bidding.'
        );
        // Don't proceed to enrollment yet - user needs to verify email
        return;
      }

      // Success - notify parent (only if already verified)
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
      emojis = emojis.filter(
        (animal) =>
          animal.name.toLowerCase().includes(searchLower) ||
          animal.value.toLowerCase().includes(searchLower)
      );
    }

    return emojis;
  }, [emojiCategory, emojiSearch]);

  const selectedColorObj = COLORS.find((c) => c.value === selectedColor);
  const selectedAnimalObj = ANIMALS.find((a) => a.value === selectedAnimal);

  const content = (
    <div className='bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col'>
      {/* Header */}
      <div
        className='px-4 py-3 sm:px-5 sm:py-4 text-center flex-shrink-0'
        style={{
          backgroundColor: '#1e293b',
        }}
      >
        <div className='flex items-center justify-between mb-2'>
          <div className='w-12 h-12 sm:w-14 sm:h-14 relative'>
            <Image
              src='/logo-with-glow.png'
              alt='Mary Frank Elementary'
              fill
              className='object-contain drop-shadow-lg'
              priority
              sizes='(max-width: 640px) 48px, 56px'
            />
          </div>
          <h2 id={modalTitleId} className='text-base sm:text-lg md:text-xl font-bold text-white flex-1'>
            Create Your Avatar
          </h2>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className='w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors'
              aria-label='Close'
            >
              <svg
                className='w-5 h-5 text-white'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content - Scrollable */}
      <div className='px-4 sm:px-5 md:px-6 py-3 sm:py-4 overflow-y-auto flex-1'>
        {/* Preview - Compact and Prominent */}
        {selectedColor && selectedAnimal && (
          <div
            className='border-2 rounded-lg p-2.5 sm:p-3 mb-3'
            style={{
              backgroundColor: 'rgba(0, 177, 64, 0.05)',
              borderColor: 'rgba(0, 177, 64, 0.2)',
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <div className='flex items-center gap-2.5'>
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-xl sm:text-2xl shadow-md flex-shrink-0 transition-all duration-300 ${
                  isRandomizing ? 'animate-spin' : ''
                }`}
                style={{
                  backgroundColor: selectedColorObj?.hex,
                  animation: isRandomizing
                    ? 'randomizeSpin 1.6s ease-in-out'
                    : undefined,
                }}
              >
                {selectedAnimalObj?.emoji}
              </div>
              <div className='flex-1 min-w-0'>
                <div className='font-bold text-sm sm:text-base text-gray-900 mb-0.5 truncate'>
                  {formatAlias(selectedColor, selectedAnimal)}
                </div>
                <div className='text-xs text-gray-600'>
                  Your bidding identity
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Color Selection */}
        <div className='mb-3'>
          <label className='block text-xs font-bold text-gray-900 mb-1.5'>
            Color
          </label>
          <div className='grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1.5'>
            {COLORS.map((color) => (
              <button
                key={color.value}
                type='button'
                onClick={() => {
                  setSelectedColor(color.value);
                  setError('');
                  setSuccess('');
                }}
                className={`relative h-8 sm:h-9 rounded-lg transition-all duration-200 hover:scale-110 ${
                  selectedColor === color.value
                    ? 'shadow-md scale-110 z-10 ring-2 ring-white'
                    : 'hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: color.hex,
                  border:
                    selectedColor === color.value
                      ? '2px solid white'
                      : '1px solid rgba(0,0,0,0.1)',
                  boxShadow:
                    selectedColor === color.value
                      ? '0 0 0 2px var(--primary-500), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      : undefined,
                }}
                aria-pressed={selectedColor === color.value}
                aria-label={color.name}
              >
                <span className='sr-only'>{color.name}</span>
                {selectedColor === color.value && (
                  <div className='absolute inset-0 flex items-center justify-center'>
                    <svg
                      className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-white drop-shadow-lg'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={3}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Emoji Selection - Collapsible */}
        <div className='mb-3'>
          <div className='flex items-center justify-between mb-1.5'>
            <label className='block text-xs font-bold text-gray-900'>
              Emoji
            </label>
            <button
              type='button'
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className='text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors'
              aria-expanded={showEmojiPicker}
              aria-controls={emojiPickerId}
              style={{ color: showEmojiPicker ? 'var(--primary-500)' : undefined }}
            >
              {showEmojiPicker ? 'Hide' : 'Show'} Picker
            </button>
          </div>

          {/* Quick Emoji Selection - Always Visible */}
          {!showEmojiPicker && selectedAnimalObj && (
            <div className='mb-2'>
              <button
                type='button'
                onClick={() => setShowEmojiPicker(true)}
                className='w-full h-10 rounded-lg border-2 border-gray-200 hover:border-primary transition-all flex items-center justify-center gap-2 bg-gray-50'
                aria-haspopup='listbox'
                aria-expanded={showEmojiPicker}
                aria-controls={emojiPickerId}
              >
                <span className='text-xl'>{selectedAnimalObj.emoji}</span>
                <span className='text-xs text-gray-600'>
                  {selectedAnimalObj.name}
                </span>
                <svg
                  className='w-4 h-4 text-gray-400'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 9l-7 7-7-7'
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Full Emoji Picker - Collapsible */}
          {showEmojiPicker && (
            <div className='space-y-2'>
              {/* Search Input */}
              <input
                type='text'
                placeholder='Search emojis...'
                className='w-full px-2.5 py-1.5 border-2 border-gray-200 rounded-lg outline-none transition-all text-xs'
                style={{
                  borderColor: 'rgb(229 231 235)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary-500)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 2px rgba(0, 177, 64, 0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(229 231 235)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                value={emojiSearch}
                onChange={(e) => setEmojiSearch(e.target.value)}
              />

              {/* Category Tabs */}
              <div className='flex flex-wrap gap-1.5 mb-2'>
                <button
                  type='button'
                  onClick={() => {
                    setEmojiCategory('animals');
                    setEmojiSearch('');
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                    emojiCategory === 'animals'
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={
                    emojiCategory === 'animals'
                      ? { backgroundColor: 'var(--primary-500)' }
                      : {}
                  }
                >
                  🐾 Animals
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setEmojiCategory('people');
                    setEmojiSearch('');
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                    emojiCategory === 'people'
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={
                    emojiCategory === 'people'
                      ? { backgroundColor: 'var(--primary-500)' }
                      : {}
                  }
                >
                  👥 People
                </button>
                <button
                  type='button'
                  onClick={() => {
                    setEmojiCategory('vehicles');
                    setEmojiSearch('');
                  }}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
                    emojiCategory === 'vehicles'
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={
                    emojiCategory === 'vehicles'
                      ? { backgroundColor: 'var(--primary-500)' }
                      : {}
                  }
                >
                  🚗 Vehicles
                </button>
              </div>

              {/* Emoji Grid */}
              <div id={emojiPickerId} className='bg-gray-50 rounded-lg p-2 border border-gray-200' role='listbox'>
                <div className='grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-48 overflow-y-auto'>
                  {filteredEmojis.length > 0 ? (
                    filteredEmojis.map((animal) => (
                      <button
                        key={animal.value}
                        type='button'
                        onClick={() => {
                          setSelectedAnimal(animal.value);
                          setError('');
                          setSuccess('');
                        }}
                        className={`h-8 sm:h-9 rounded-lg transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                          selectedAnimal === animal.value
                            ? 'shadow-md scale-110 ring-2 ring-primary'
                            : 'bg-white hover:shadow-sm border border-gray-200'
                        }`}
                        style={
                          selectedAnimal === animal.value
                            ? {
                                backgroundColor: 'var(--primary-500)',
                                boxShadow:
                                  '0 0 0 2px var(--primary-500), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                              }
                            : {}
                        }
                        aria-pressed={selectedAnimal === animal.value}
                        aria-label={animal.name}
                        title={animal.name}
                      >
                        <span className='text-base sm:text-lg'>
                          {animal.emoji}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className='col-span-full text-center py-6 text-gray-500'>
                      <p className='text-xs mb-2'>
                        No emojis found matching "{emojiSearch}"
                      </p>
                      <button
                        type='button'
                        onClick={() => setEmojiSearch('')}
                        className='text-xs hover:underline font-medium'
                        style={{ color: 'var(--primary-500)' }}
                      >
                        Clear search
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Random Button */}
        <div className='mb-3'>
          <button
            type='button'
            onClick={handleRandomize}
            disabled={isRandomizing}
            aria-busy={isRandomizing}
            className={`w-full px-3 py-2 border-2 font-semibold rounded-lg transition-all duration-200 text-xs flex items-center justify-center gap-2 ${
              isRandomizing ? 'cursor-wait' : ''
            }`}
            style={{
              borderColor: 'var(--primary-500)',
              color: isRandomizing ? '#059669' : 'var(--primary-500)',
              backgroundColor: isRandomizing
                ? 'rgba(4, 106, 56, 0.12)'
                : 'transparent',
              animation: isRandomizing
                ? 'randomizeShake 0.5s ease-in-out'
                : undefined,
            }}
            onMouseEnter={(e) => {
              if (!isRandomizing) {
                e.currentTarget.style.backgroundColor = 'var(--primary-500)';
                e.currentTarget.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRandomizing) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--primary-500)';
              }
            }}
          >
            <span className={isRandomizing ? 'animate-spin' : ''}>🎲</span>
            {isRandomizing ? 'Randomizing...' : 'Randomize Selection'}
          </button>
        </div>

        {/* Verification Status */}
        {checkingVerification && (
          <div className='bg-blue-50 border-2 border-blue-200 rounded-lg p-2 mb-2'>
            <p className='text-blue-700 font-medium text-xs flex items-center gap-1.5'>
              <svg
                className='w-4 h-4 flex-shrink-0 animate-spin'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                />
              </svg>
              Checking verification status...
            </p>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div
            className='bg-red-50 border-2 border-red-200 rounded-lg p-2 mb-2'
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <p className='text-red-700 font-medium text-xs flex items-center gap-1.5'>
              <svg
                className='w-4 h-4 flex-shrink-0'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
              {error}
            </p>
          </div>
        )}
        {success && (
          <div
            className='bg-green-50 border-2 border-green-200 rounded-lg p-2 mb-2'
            style={{ animation: 'slideUp 0.3s ease-out' }}
          >
            <p className='text-green-700 font-medium text-xs flex items-center gap-1.5'>
              <svg
                className='w-4 h-4 flex-shrink-0'
                fill='currentColor'
                viewBox='0 0 20 20'
              >
                <path
                  fillRule='evenodd'
                  d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
                  clipRule='evenodd'
                />
              </svg>
              {success}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className='flex gap-2 flex-shrink-0 pt-2 border-t border-gray-200'>
          <button
            type='button'
            onClick={handleCheckAlias}
            disabled={
              !selectedColor || !selectedAnimal || isChecking || isCreating
            }
            className='flex-1 px-3 py-2 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs flex items-center justify-center gap-1.5'
          >
            {isChecking ? (
              <>
                <svg
                  className='animate-spin h-3.5 w-3.5'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  ></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  ></path>
                </svg>
                Checking...
              </>
            ) : (
              'Check'
            )}
          </button>
          <button
            type='button'
            onClick={handleCreateAlias}
            disabled={
              !selectedColor || !selectedAnimal || isCreating || checkingVerification || !!error || !isVerified
            }
            className='flex-1 px-3 py-2 text-white font-semibold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs flex items-center justify-center gap-1.5'
            style={{ backgroundColor: 'var(--primary-500)' }}
          >
            {isCreating ? (
              <>
                <svg
                  className='animate-spin h-3.5 w-3.5'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                >
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'
                  ></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  ></path>
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

  // Render as modal or regular component
  if (isModal) {
    return (
      <>
        <style jsx>{randomizeAnimation}</style>
        <div
          className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'
          style={{ animation: 'fadeIn 0.2s ease-out' }}
          role='presentation'
          onClick={(e) => {
            if (e.target === e.currentTarget && onClose) {
              onClose();
            }
          }}
        >
          <div
            role='dialog'
            aria-modal='true'
            aria-labelledby={modalTitleId}
            className='w-full max-w-md'
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx>{randomizeAnimation}</style>
      {content}
    </>
  );
}
