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
  description: z.string().max(2000).optional(),
  photo_url: z.string().url().optional().or(z.literal('')),
  start_price: z.coerce.number().nonnegative(),
  is_closed: z.boolean().optional(),
});

export const SettingsSchema = z.object({
  auction_title: z.string().max(200).optional(),
  auction_deadline: z.string().datetime().optional(),
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
  'gmial.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmaiil.com': 'gmail.com',
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