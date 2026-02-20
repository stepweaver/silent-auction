import { z } from 'zod';

export const BidSchema = z.object({
  slug: z.string().optional(),
  item_id: z.string().uuid().optional(),
  bidder_name: z.string().min(1).max(80),
  email: z.string().email(),
  amount: z.coerce.number().positive(),
});

export const ItemSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().max(100).optional(), // Optional - will be auto-generated from title if not provided
  description: z.string().max(2000).optional().nullable(),
  photo_url: z.string().url().optional().or(z.literal('')).nullable(),
  thumbnail_url: z.string().url().optional().or(z.literal('')).nullable(),
  start_price: z.coerce.number().nonnegative(),
  is_closed: z.boolean().optional(),
  category: z.string().max(100).optional().nullable(),
});

export const DonationSchema = z.object({
  donor_name: z.string().min(1).max(80),
  email: z.string().email(),
  amount: z.coerce.number().positive(),
  message: z.string().max(500).optional().nullable(),
});

export const SettingsSchema = z.object({
  auction_title: z.string().max(200).optional(),
  auction_deadline: z.string().datetime().optional(),
  auction_start: z.string().datetime().optional().nullable(),
  soft_close_seconds: z.coerce.number().int().nonnegative().optional(),
  contact_email: z.string().email().optional(),
  payment_instructions: z.string().optional(),
  pickup_instructions: z.string().optional(),
  auction_closed: z.boolean().optional(),
});

/**
 * Validates email format using a comprehensive regex pattern
 * This is more strict than basic HTML5 validation
 */
export function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  // RFC 5322 compliant email regex (simplified but comprehensive)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email.trim());
}

/**
 * Extracts the domain from an email address
 */
export function getEmailDomain(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) {
    return null;
  }
  
  return parts[1];
}

/**
 * Common email domain typos and corrections
 */
const COMMON_TYPOS = {
  // Gmail typos
  'gmial.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmaiil.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gmaik.com': 'gmail.com',
  'gmailc.om': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmail.xom': 'gmail.com',
  // Yahoo typos
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
  'outllok.com': 'outlook.com',
  'outlookk.com': 'outlook.com',
  'hotmial.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmali.com': 'hotmail.com',
  'hotmiall.com': 'hotmail.com',
};

/**
 * Suggests a correction for common email domain typos
 */
export function suggestEmailCorrection(email) {
  if (!email || typeof email !== 'string') {
    return null;
  }
  
  const domain = getEmailDomain(email);
  if (!domain) {
    return null;
  }
  
  const corrected = COMMON_TYPOS[domain];
  if (corrected) {
    const localPart = email.split('@')[0];
    return `${localPart}@${corrected}`;
  }
  
  return null;
}

/**
 * Validates email using Zod schema
 */
export function validateEmail(email) {
  try {
    z.string().email().parse(email);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: 'Please enter a valid email address' };
  }
}

/**
 * Validates name to detect bot-like patterns
 * Rejects random strings, all-caps without vowels, etc.
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  // Length validation
  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 80) {
    return { valid: false, error: 'Name must be 80 characters or less' };
  }

  // Reject if it's all random-looking characters (high entropy)
  // Pattern: mostly consonants, no spaces, very long
  const hasVowels = /[aeiouAEIOU]/.test(trimmed);
  const hasSpaces = /\s/.test(trimmed);
  const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
  
  // If it's all caps, has no vowels, and no spaces, it's likely bot spam
  if (isAllCaps && !hasVowels && !hasSpaces && trimmed.length > 8) {
    return { valid: false, error: 'Please enter a valid name' };
  }

  // Reject if it's just random characters (high ratio of consonants to vowels)
  // Count vowels and consonants
  const vowelCount = (trimmed.match(/[aeiouAEIOU]/g) || []).length;
  const consonantCount = (trimmed.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || []).length;
  
  // If there are very few vowels compared to consonants and it's long, likely spam
  if (trimmed.length > 10 && consonantCount > 0 && vowelCount / consonantCount < 0.2 && !hasSpaces) {
    return { valid: false, error: 'Please enter a valid name' };
  }

  // Reject if it contains suspicious patterns (URLs, scripts, SQL keywords)
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /SELECT|DROP|INSERT|UPDATE|DELETE/i, // SQL keywords
    /http[s]?:\/\//i, // URLs
    /www\./i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: 'Invalid characters in name' };
    }
  }

  // Allow normal names (with spaces, apostrophes, hyphens, etc.)
  // Basic check: contains at least one letter
  if (!/[a-zA-Z]/.test(trimmed)) {
    return { valid: false, error: 'Name must contain at least one letter' };
  }

  return { valid: true, error: null };
}