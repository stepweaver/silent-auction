/**
 * Icon-based alias system with expanded options for better uniqueness
 */

// Expanded color palette - 20 colors for more combinations
export const COLORS = [
  { name: 'Red', value: 'red', hex: '#ef4444' },
  { name: 'Orange', value: 'orange', hex: '#f97316' },
  { name: 'Yellow', value: 'yellow', hex: '#eab308' },
  { name: 'Green', value: 'green', hex: '#22c55e' },
  { name: 'Blue', value: 'blue', hex: '#3b82f6' },
  { name: 'Purple', value: 'purple', hex: '#a855f7' },
  { name: 'Pink', value: 'pink', hex: '#ec4899' },
  { name: 'Teal', value: 'teal', hex: '#14b8a6' },
  { name: 'Lime', value: 'lime', hex: '#84cc16' },
  { name: 'Cyan', value: 'cyan', hex: '#06b6d4' },
  { name: 'Indigo', value: 'indigo', hex: '#6366f1' },
  { name: 'Violet', value: 'violet', hex: '#8b5cf6' },
  { name: 'Rose', value: 'rose', hex: '#f43f5e' },
  { name: 'Amber', value: 'amber', hex: '#f59e0b' },
  { name: 'Emerald', value: 'emerald', hex: '#10b981' },
  { name: 'Sky', value: 'sky', hex: '#0ea5e9' },
  { name: 'Fuchsia', value: 'fuchsia', hex: '#d946ef' },
  { name: 'Slate', value: 'slate', hex: '#64748b' },
  { name: 'Stone', value: 'stone', hex: '#78716c' },
  { name: 'Navy', value: 'navy', hex: '#1e3a8a' },
];

// Icon options - 40+ icons for maximum combinations (20 colors × 40 icons = 800 combinations!)
export const ICONS = [
  { name: 'Star', value: 'star', icon: 'Star' },
  { name: 'Heart', value: 'heart', icon: 'Heart' },
  { name: 'Diamond', value: 'diamond', icon: 'Diamond' },
  { name: 'Moon', value: 'moon', icon: 'Moon' },
  { name: 'Sun', value: 'sun', icon: 'Sun' },
  { name: 'Flame', value: 'flame', icon: 'Flame' },
  { name: 'Sparkles', value: 'sparkles', icon: 'Sparkles' },
  { name: 'Zap', value: 'zap', icon: 'Zap' },
  { name: 'Trophy', value: 'trophy', icon: 'Trophy' },
  { name: 'Crown', value: 'crown', icon: 'Crown' },
  { name: 'Shield', value: 'shield', icon: 'Shield' },
  { name: 'Sword', value: 'sword', icon: 'Sword' },
  { name: 'Gem', value: 'gem', icon: 'Gem' },
  { name: 'Comet', value: 'comet', icon: 'Comet' },
  { name: 'Rocket', value: 'rocket', icon: 'Rocket' },
  { name: 'Lightning', value: 'lightning', icon: 'Zap' },
  { name: 'Leaf', value: 'leaf', icon: 'Leaf' },
  { name: 'Flower', value: 'flower', icon: 'Flower' },
  { name: 'Tree', value: 'tree', icon: 'TreePine' },
  { name: 'Mountain', value: 'mountain', icon: 'Mountain' },
  { name: 'Wave', value: 'wave', icon: 'Waves' },
  { name: 'Droplet', value: 'droplet', icon: 'Droplets' },
  { name: 'Snowflake', value: 'snowflake', icon: 'Snowflake' },
  { name: 'Cloud', value: 'cloud', icon: 'Cloud' },
  { name: 'Anchor', value: 'anchor', icon: 'Anchor' },
  { name: 'Ship', value: 'ship', icon: 'Ship' },
  { name: 'Fish', value: 'fish', icon: 'Fish' },
  { name: 'Bird', value: 'bird', icon: 'Bird' },
  { name: 'Butterfly', value: 'butterfly', icon: 'Butterfly' },
  { name: 'Bug', value: 'bug', icon: 'Bug' },
  { name: 'Cat', value: 'cat', icon: 'Cat' },
  { name: 'Dog', value: 'dog', icon: 'Dog' },
  { name: 'Rabbit', value: 'rabbit', icon: 'Rabbit' },
  { name: 'Fox', value: 'fox', icon: 'Fox' },
  { name: 'Paw', value: 'paw', icon: 'PawPrint' },
  { name: 'Music', value: 'music', icon: 'Music' },
  { name: 'Guitar', value: 'guitar', icon: 'Guitar' },
  { name: 'Drum', value: 'drum', icon: 'Drum' },
  { name: 'Microphone', value: 'microphone', icon: 'Mic' },
  { name: 'Camera', value: 'camera', icon: 'Camera' },
  { name: 'Film', value: 'film', icon: 'Film' },
  { name: 'Gamepad', value: 'gamepad', icon: 'Gamepad2' },
  { name: 'Puzzle', value: 'puzzle', icon: 'Puzzle' },
  { name: 'Book', value: 'book', icon: 'Book' },
  { name: 'Pen', value: 'pen', icon: 'PenTool' },
  { name: 'Palette', value: 'palette', icon: 'Palette' },
  { name: 'Brush', value: 'brush', icon: 'Paintbrush' },
];

/**
 * Generate a random alias
 */
export function generateRandomAlias() {
  const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  const randomIcon = ICONS[Math.floor(Math.random() * ICONS.length)];
  
  return {
    color: randomColor.value,
    colorName: randomColor.name,
    icon: randomIcon.value,
    iconName: randomIcon.name,
    alias: `${randomColor.name} ${randomIcon.name}`,
    colorHex: randomColor.hex,
  };
}

/**
 * Get color object by value
 */
export function getColorByValue(value) {
  return COLORS.find(c => c.value === value) || COLORS[0];
}

/**
 * Get icon object by value
 */
export function getIconByValue(value) {
  return ICONS.find(i => i.value === value) || ICONS[0];
}

/**
 * Format alias display string
 */
export function formatAlias(color, icon) {
  const colorObj = getColorByValue(color);
  const iconObj = getIconByValue(icon);
  return `${colorObj.name} ${iconObj.name}`;
}

