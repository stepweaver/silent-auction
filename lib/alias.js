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
  { name: 'Indigo', value: 'indigo', hex: '#6366f1', emoji: '💜' },
  { name: 'Violet', value: 'violet', hex: '#8b5cf6', emoji: '🔮' },
  { name: 'Rose', value: 'rose', hex: '#f43f5e', emoji: '🌹' },
  { name: 'Amber', value: 'amber', hex: '#f59e0b', emoji: '🟨' },
  { name: 'Emerald', value: 'emerald', hex: '#10b981', emoji: '💎' },
  { name: 'Sky', value: 'sky', hex: '#0ea5e9', emoji: '☁️' },
  { name: 'Fuchsia', value: 'fuchsia', hex: '#d946ef', emoji: '🌸' },
  { name: 'Slate', value: 'slate', hex: '#64748b', emoji: '⚫' },
  { name: 'Stone', value: 'stone', hex: '#78716c', emoji: '🪨' },
  { name: 'Navy', value: 'navy', hex: '#1e3a8a', emoji: '🌊' },
];

// Expanded options: Animals, People, Vehicles - 60+ options total
export const ANIMALS = [
  // Animals
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
  { name: 'Shark', value: 'shark', emoji: '🦈' },
  { name: 'Octopus', value: 'octopus', emoji: '🐙' },
  { name: 'Crab', value: 'crab', emoji: '🦀' },
  { name: 'Lobster', value: 'lobster', emoji: '🦞' },
  { name: 'Butterfly', value: 'butterfly', emoji: '🦋' },
  { name: 'Bird', value: 'bird', emoji: '🐦' },
  { name: 'Eagle', value: 'eagle', emoji: '🦅' },
  { name: 'Duck', value: 'duck', emoji: '🦆' },
  { name: 'Chicken', value: 'chicken', emoji: '🐔' },
  { name: 'Rooster', value: 'rooster', emoji: '🐓' },
  { name: 'Pig', value: 'pig', emoji: '🐷' },
  { name: 'Cow', value: 'cow', emoji: '🐮' },
  { name: 'Sheep', value: 'sheep', emoji: '🐑' },
  { name: 'Goat', value: 'goat', emoji: '🐐' },
  { name: 'Camel', value: 'camel', emoji: '🐪' },
  { name: 'Kangaroo', value: 'kangaroo', emoji: '🦘' },
  { name: 'Koala', value: 'koala', emoji: '🐨' },
  { name: 'Mouse', value: 'mouse', emoji: '🐭' },
  { name: 'Hamster', value: 'hamster', emoji: '🐹' },
  { name: 'Wolf', value: 'wolf', emoji: '🐺' },
  { name: 'Deer', value: 'deer', emoji: '🦌' },
  { name: 'Rhinoceros', value: 'rhinoceros', emoji: '🦏' },
  { name: 'Hippopotamus', value: 'hippopotamus', emoji: '🦛' },
  { name: 'Badger', value: 'badger', emoji: '🦡' },
  { name: 'Raccoon', value: 'raccoon', emoji: '🦝' },
  // People
  { name: 'Superhero', value: 'superhero', emoji: '🦸' },
  { name: 'Supervillain', value: 'supervillain', emoji: '🦹' },
  { name: 'Astronaut', value: 'astronaut', emoji: '🧑‍🚀' },
  { name: 'Construction Worker', value: 'construction', emoji: '👷' },
  { name: 'Police Officer', value: 'police', emoji: '👮' },
  { name: 'Detective', value: 'detective', emoji: '🕵️' },
  { name: 'Judge', value: 'judge', emoji: '👨‍⚖️' },
  { name: 'Farmer', value: 'farmer', emoji: '👨‍🌾' },
  { name: 'Chef', value: 'chef', emoji: '👨‍🍳' },
  { name: 'Mechanic', value: 'mechanic', emoji: '👨‍🔧' },
  { name: 'Doctor', value: 'doctor', emoji: '👨‍⚕️' },
  { name: 'Student', value: 'student', emoji: '👨‍🎓' },
  { name: 'Singer', value: 'singer', emoji: '👨‍🎤' },
  { name: 'Artist', value: 'artist', emoji: '👨‍🎨' },
  { name: 'Pilot', value: 'pilot', emoji: '👨‍✈️' },
  { name: 'Firefighter', value: 'firefighter', emoji: '👨‍🚒' },
  { name: 'Princess', value: 'princess', emoji: '👸' },
  { name: 'Prince', value: 'prince', emoji: '🤴' },
  { name: 'Genie', value: 'genie', emoji: '🧞' },
  { name: 'Mage', value: 'mage', emoji: '🧙' },
  { name: 'Fairy', value: 'fairy', emoji: '🧚' },
  { name: 'Vampire', value: 'vampire', emoji: '🧛' },
  { name: 'Mermaid', value: 'mermaid', emoji: '🧜' },
  { name: 'Elf', value: 'elf', emoji: '🧝' },
  { name: 'Zombie', value: 'zombie', emoji: '🧟' },
  { name: 'Baby', value: 'baby', emoji: '👶' },
  { name: 'Child', value: 'child', emoji: '🧒' },
  { name: 'Adult', value: 'adult', emoji: '🧑' },
  { name: 'Older Person', value: 'older', emoji: '🧓' },
  // Vehicles
  { name: 'Car', value: 'car', emoji: '🚗' },
  { name: 'Taxi', value: 'taxi', emoji: '🚕' },
  { name: 'Bus', value: 'bus', emoji: '🚌' },
  { name: 'Truck', value: 'truck', emoji: '🚚' },
  { name: 'Fire Truck', value: 'firetruck', emoji: '🚒' },
  { name: 'Police Car', value: 'policecar', emoji: '🚓' },
  { name: 'Ambulance', value: 'ambulance', emoji: '🚑' },
  { name: 'Race Car', value: 'racecar', emoji: '🏎️' },
  { name: 'Tractor', value: 'tractor', emoji: '🚜' },
  { name: 'Motorcycle', value: 'motorcycle', emoji: '🏍️' },
  { name: 'Bicycle', value: 'bicycle', emoji: '🚲' },
  { name: 'Scooter', value: 'scooter', emoji: '🛴' },
  { name: 'Skateboard', value: 'skateboard', emoji: '🛹' },
  { name: 'Airplane', value: 'airplane', emoji: '✈️' },
  { name: 'Helicopter', value: 'helicopter', emoji: '🚁' },
  { name: 'Rocket', value: 'rocket', emoji: '🚀' },
  { name: 'Flying Saucer', value: 'ufo', emoji: '🛸' },
  { name: 'Train', value: 'train', emoji: '🚂' },
  { name: 'Bullet Train', value: 'bullettrain', emoji: '🚅' },
  { name: 'Metro', value: 'metro', emoji: '🚇' },
  { name: 'Tram', value: 'tram', emoji: '🚊' },
  { name: 'Monorail', value: 'monorail', emoji: '🚝' },
  { name: 'Mountain Railway', value: 'mountainrail', emoji: '🚞' },
  { name: 'Ship', value: 'ship', emoji: '🚢' },
  { name: 'Sailboat', value: 'sailboat', emoji: '⛵' },
  { name: 'Speedboat', value: 'speedboat', emoji: '🚤' },
  { name: 'Ferry', value: 'ferry', emoji: '⛴️' },
  { name: 'Motorboat', value: 'motorboat', emoji: '🛥️' },
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

