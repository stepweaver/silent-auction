'use client';

import { getColorByValue, getAnimalByValue } from '@/lib/alias';

export default function AliasAvatar({ alias, color, animal, size = 'md' }) {
  // If we have a full alias object
  let displayColor = color;
  let displayAnimal = animal;
  let displayAlias = alias;

  // If we only have alias string, parse it
  if (alias && !color && !animal) {
    const parts = alias.split(' ');
    if (parts.length >= 2) {
      displayColor = parts[0].toLowerCase();
      displayAnimal = parts.slice(1).join(' ').toLowerCase();
    }
  }

  const colorObj = displayColor ? getColorByValue(displayColor) : null;
  const animalObj = displayAnimal ? getAnimalByValue(displayAnimal) : null;

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  if (!colorObj || !animalObj) {
    // Fallback to initials if alias data is missing
    return (
      <div className={`${sizeClass} rounded-full bg-base-300 flex items-center justify-center font-semibold`}>
        {alias ? alias.substring(0, 2).toUpperCase() : '??'}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}
      style={{ backgroundColor: colorObj.hex }}
      title={displayAlias || `${colorObj.name} ${animalObj.name}`}
    >
      <span>{animalObj.emoji}</span>
    </div>
  );
}

