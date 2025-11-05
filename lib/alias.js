/**
 * Alias utility functions for color and animal combinations
 * Kid-friendly selections for auction anonymity
 */

export const COLORS = [
  { name: 'Red', value: 'red', hex: '#ef4444', emoji: '🔴' },
  { name: 'Orange', value: 'orange', hex: '#f97316', emoji: '🟠' },
  { name: 'Yellow', value: 'yellow', hex: '#eab308', emoji: '🟡' },
  { name: 'Green', value: 'green', hex: '#22c55e', emoji: '🟢' },
  { name: 'Blue', value: 'blue', hex: '#3b82f6', emoji: '🔵' },
  { name: 'Purple', value: 'purple', hex: '#a855f7', emoji: '🟣' },
  { name: 'Pink', value: 'pink', hex: '#ec4899', emoji: '🩷' },
  { name: 'Teal', value: 'teal', hex: '#14b8a6', emoji: '🩵' },
  { name: 'Lime', value: 'lime', hex: '#84cc16', emoji: '💚' },
  { name: 'Cyan', value: 'cyan', hex: '#06b6d4', emoji: '💙' },
];

export const ANIMALS = [
  { name: 'Bear', value: 'bear', emoji: '🐻' },
  { name: 'Cat', value: 'cat', emoji: '🐱' },
  { name: 'Dog', value: 'dog', emoji: '🐶' },
  { name: 'Elephant', value: 'elephant', emoji: '🐘' },
  { name: 'Fox', value: 'fox', emoji: '🦊' },
  { name: 'Frog', value: 'frog', emoji: '🐸' },
  { name: 'Giraffe', value: 'giraffe', emoji: '🦒' },
  { name: 'Horse', value: 'horse', emoji: '🐴' },
  { name: 'Lion', value: 'lion', emoji: '🦁' },
  { name: 'Monkey', value: 'monkey', emoji: '🐵' },
  { name: 'Owl', value: 'owl', emoji: '🦉' },
  { name: 'Panda', value: 'panda', emoji: '🐼' },
  { name: 'Penguin', value: 'penguin', emoji: '🐧' },
  { name: 'Rabbit', value: 'rabbit', emoji: '🐰' },
  { name: 'Tiger', value: 'tiger', emoji: '🐯' },
  { name: 'Turtle', value: 'turtle', emoji: '🐢' },
  { name: 'Unicorn', value: 'unicorn', emoji: '🦄' },
  { name: 'Whale', value: 'whale', emoji: '🐋' },
  { name: 'Zebra', value: 'zebra', emoji: '🦓' },
  { name: 'Dolphin', value: 'dolphin', emoji: '🐬' },
];

/**
 * Generate a random alias
 */
export function generateRandomAlias() {
  const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
  const randomAnimal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  
  return {
    color: randomColor.value,
    colorName: randomColor.name,
    animal: randomAnimal.value,
    animalName: randomAnimal.name,
    alias: `${randomColor.name} ${randomAnimal.name}`,
    colorHex: randomColor.hex,
    animalEmoji: randomAnimal.emoji,
  };
}

/**
 * Get color object by value
 */
export function getColorByValue(value) {
  return COLORS.find(c => c.value === value) || COLORS[0];
}

/**
 * Get animal object by value
 */
export function getAnimalByValue(value) {
  return ANIMALS.find(a => a.value === value) || ANIMALS[0];
}

/**
 * Format alias display string
 */
export function formatAlias(color, animal) {
  const colorObj = getColorByValue(color);
  const animalObj = getAnimalByValue(animal);
  return `${colorObj.name} ${animalObj.name}`;
}

