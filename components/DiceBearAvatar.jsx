'use client';

import { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { lorelei, shapes, initials, identicon } from '@dicebear/collection';

export default function DiceBearAvatar({ seed, style = 'lorelei', size = 64, className = '' }) {
  const avatarSvg = useMemo(() => {
    let avatarStyle;
    
    switch (style) {
      case 'shapes':
        avatarStyle = shapes;
        break;
      case 'initials':
        avatarStyle = initials;
        break;
      case 'identicon':
        avatarStyle = identicon;
        break;
      default:
        avatarStyle = lorelei;
    }

    const avatar = createAvatar(avatarStyle, {
      seed: seed || 'default',
      size: size,
      radius: 50,
    });

    return avatar.toString();
  }, [seed, style, size]);

  return (
    <div 
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: avatarSvg }}
    />
  );
}

