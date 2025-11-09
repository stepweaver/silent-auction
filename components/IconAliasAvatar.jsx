'use client';

import { getColorByValue, getIconByValue } from '@/lib/iconAlias';
import * as LucideIcons from 'lucide-react';

export default function IconAliasAvatar({ alias, color, icon, animal, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const iconSize = iconSizes[size] || iconSizes.md;

  // Color + icon system (new)
  let displayColor = color;
  let displayIcon = icon;
  let displayAlias = alias;

  // If we only have alias string, parse it
  if (alias && !color && !icon) {
    const parts = alias.split(' ');
    if (parts.length >= 2) {
      displayColor = parts[0].toLowerCase();
      displayIcon = parts.slice(1).join(' ').toLowerCase();
    }
  }

  const colorObj = displayColor ? getColorByValue(displayColor) : null;
  const iconObj = displayIcon ? getIconByValue(displayIcon) : null;

  // Fallback to old animal system if icon not found
  if (!colorObj || (!iconObj && !animal)) {
    // Fallback to initials if alias data is missing
    return (
      <div className={`${sizeClass} rounded-full bg-base-300 flex items-center justify-center font-semibold`}>
        {alias ? alias.substring(0, 2).toUpperCase() : '??'}
      </div>
    );
  }

  // Use icon if available, otherwise fall back to animal emoji (legacy)
  let IconComponent = null;
  if (iconObj) {
    IconComponent = LucideIcons[iconObj.icon] || LucideIcons.Star;
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold shadow-lg`}
      style={{ backgroundColor: colorObj.hex }}
      title={displayAlias || `${colorObj.name} ${iconObj?.name || ''}`}
    >
      {IconComponent ? (
        <IconComponent size={iconSize} strokeWidth={2.5} className="text-white" />
      ) : (
        <span className="text-lg">{animal}</span>
      )}
    </div>
  );
}







