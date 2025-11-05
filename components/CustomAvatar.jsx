'use client';

import { useMemo } from 'react';

// Generate a color palette from a string seed
function generateColorsFromSeed(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate multiple colors for gradients
  const hue1 = Math.abs(hash) % 360;
  const hue2 = (hue1 + 60 + (Math.abs(hash >> 8) % 60)) % 360;
  const hue3 = (hue1 + 120 + (Math.abs(hash >> 16) % 60)) % 360;
  
  const saturation = 70 + (Math.abs(hash) % 20); // 70-90%
  const lightness = 50 + (Math.abs(hash >> 4) % 20); // 50-70%
  
  return {
    primary: `hsl(${hue1}, ${saturation}%, ${lightness}%)`,
    secondary: `hsl(${hue2}, ${saturation}%, ${lightness}%)`,
    accent: `hsl(${hue3}, ${saturation}%, ${lightness}%)`,
    hash: Math.abs(hash),
  };
}

// Get initials from seed
function getInitials(seed) {
  if (!seed) return '??';
  
  if (seed.includes('@')) {
    const parts = seed.split('@');
    const name = parts[0];
    if (name.length >= 2) {
      return name.substring(0, 2).toUpperCase();
    }
    return name.charAt(0).toUpperCase() + (name.charAt(1) || name.charAt(0)).toUpperCase();
  }
  
  const words = seed.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  
  return seed.substring(0, 2).toUpperCase().padEnd(2, seed.charAt(0).toUpperCase());
}

// Generate pattern type based on hash
function getPatternType(hash) {
  const patterns = ['gradient', 'rings', 'dots', 'stripes', 'waves'];
  return patterns[hash % patterns.length];
}

export default function CustomAvatar({ seed, size = 64, className = '' }) {
  const { initials, colors, patternType, rotation } = useMemo(() => {
    const seedStr = seed || 'default';
    const initial = getInitials(seedStr);
    const colorData = generateColorsFromSeed(seedStr);
    const pattern = getPatternType(colorData.hash);
    const rotation = (colorData.hash % 360);
    
    return {
      initials: initial,
      colors: colorData,
      patternType: pattern,
      rotation: rotation,
    };
  }, [seed]);

  const renderPattern = () => {
    const sizeStr = size;
    const center = size / 2;
    
    switch (patternType) {
      case 'rings':
        return (
          <svg width={sizeStr} height={sizeStr} className="absolute inset-0">
            <defs>
              <radialGradient id={`ring-${seed}`}>
                <stop offset="0%" stopColor={colors.primary} />
                <stop offset="50%" stopColor={colors.secondary} />
                <stop offset="100%" stopColor={colors.accent} />
              </radialGradient>
            </defs>
            <circle cx={center} cy={center} r={sizeStr * 0.4} fill={`url(#ring-${seed})`} opacity="0.8" />
            <circle cx={center} cy={center} r={sizeStr * 0.25} fill={colors.secondary} opacity="0.6" />
            <circle cx={center} cy={center} r={sizeStr * 0.1} fill={colors.primary} />
          </svg>
        );
      
      case 'dots':
        return (
          <svg width={sizeStr} height={sizeStr} className="absolute inset-0">
            <defs>
              <pattern id={`dots-${seed}`} x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="1.5" fill={colors.primary} opacity="0.6" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#dots-${seed})`} />
            <circle cx={center} cy={center} r={sizeStr * 0.35} fill={colors.secondary} opacity="0.7" />
          </svg>
        );
      
      case 'stripes':
        return (
          <svg width={sizeStr} height={sizeStr} className="absolute inset-0" style={{ transform: `rotate(${rotation}deg)` }}>
            <defs>
              <linearGradient id={`stripes-${seed}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.primary} />
                <stop offset="50%" stopColor={colors.secondary} />
                <stop offset="100%" stopColor={colors.accent} />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map(i => (
              <rect
                key={i}
                x={0}
                y={(sizeStr / 5) * i}
                width={sizeStr}
                height={sizeStr / 5}
                fill={i % 2 === 0 ? colors.primary : colors.secondary}
                opacity="0.8"
              />
            ))}
          </svg>
        );
      
      case 'waves':
        return (
          <svg width={sizeStr} height={sizeStr} className="absolute inset-0">
            <defs>
              <linearGradient id={`waves-${seed}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colors.primary} />
                <stop offset="50%" stopColor={colors.secondary} />
                <stop offset="100%" stopColor={colors.accent} />
              </linearGradient>
            </defs>
            <path
              d={`M 0 ${sizeStr * 0.5} Q ${sizeStr * 0.25} ${sizeStr * 0.3}, ${sizeStr * 0.5} ${sizeStr * 0.5} T ${sizeStr} ${sizeStr * 0.5} L ${sizeStr} ${sizeStr} L 0 ${sizeStr} Z`}
              fill={`url(#waves-${seed})`}
              opacity="0.8"
            />
            <path
              d={`M 0 ${sizeStr * 0.7} Q ${sizeStr * 0.25} ${sizeStr * 0.5}, ${sizeStr * 0.5} ${sizeStr * 0.7} T ${sizeStr} ${sizeStr * 0.7} L ${sizeStr} ${sizeStr} L 0 ${sizeStr} Z`}
              fill={colors.secondary}
              opacity="0.6"
            />
          </svg>
        );
      
      default: // gradient
        return (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 50%, ${colors.accent} 100%)`,
            }}
          />
        );
    }
  };

  // Calculate text color for contrast
  const hash = colors.hash;
  const textColor = '#ffffff';

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold shadow-lg relative overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        color: textColor,
      }}
    >
      {renderPattern()}
      <span className="relative z-10 drop-shadow-lg" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
        {initials}
      </span>
    </div>
  );
}
