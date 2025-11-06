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
  min_increment: z.coerce.number().positive(),
  is_closed: z.boolean().optional(),
});

export const SettingsSchema = z.object({
  auction_title: z.string().max(200).optional(),
  auction_deadline: z.string().datetime().optional(),
  soft_close_seconds: z.coerce.number().int().nonnegative().optional(),
  contact_email: z.string().email().optional(),
  payment_instructions: z.string().optional(),
  pickup_instructions: z.string().optional(),
});
