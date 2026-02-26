/**
 * Secret endpoint: send closing emails (winner digest + admin winners list) to a single address for testing.
 * Only the specified email receives anything. No auction actions are triggered.
 * Protected by admin Basic Auth.
 * Uses dynamic config from settings DB and env (pickup contact, payment/pickup instructions).
 */

import { headers } from 'next/headers';
import { checkBasicAuth } from '@/lib/auth';
import { jsonError, jsonUnauthorized } from '@/lib/apiResponses';
import { sendWinnerDigest, sendAdminWinnersList } from '@/lib/notifications';
import { supabaseServer } from '@/lib/serverSupabase';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const paymentUrl =
  process.env.CHEDDARUP_PAYMENT_URL_WINNERS || `${siteUrl}/payment-instructions`;
const pickupContact = process.env.PICKUP_CONTACT || null;
const pickupInstructionsEnv =
  process.env.PICKUP_INSTRUCTIONS ||
  'Items may be picked up on Thursday immediately following the close of the auction at 7:30pm in the LGI room across from the gym.';
const paymentInstructionsEnv =
  process.env.PAYMENT_INSTRUCTIONS || null;

export async function POST(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('Valid email address required', 400);
  }

  let settings = null;
  try {
    const supabase = supabaseServer();
    const { data } = await supabase
      .from('settings')
      .select('payment_instructions, pickup_instructions, contact_email')
      .eq('id', 1)
      .maybeSingle();
    settings = data;
  } catch {
    // ignore
  }

  const contactEmail =
    settings?.contact_email ||
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    process.env.AUCTION_CONTACT_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    null;
  const pickupInstructions =
    settings?.pickup_instructions || pickupInstructionsEnv;
  const paymentInstructions =
    settings?.payment_instructions || paymentInstructionsEnv;

  const sent = [];
  const failed = [];

  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  const run = async (name, fn) => {
    try {
      const ok = await fn();
      if (ok) sent.push(name);
      else failed.push({ name, error: 'Send returned false' });
    } catch (err) {
      failed.push({ name, error: err?.message || String(err) });
    }
    await delay(800);
  };

  await run('Winner digest', () =>
    sendWinnerDigest({
      email,
      bidderName: 'Test Winner',
      items: [
        { itemTitle: 'Lakeside Cabin Weekend Getaway', winningBid: 125, itemUrl: `${siteUrl}/i/sample-1` },
        { itemTitle: 'VIP School Parking Spot (2025–2026)', winningBid: 300, itemUrl: `${siteUrl}/i/sample-2` },
        { itemTitle: 'Principal for a Day Experience', winningBid: 210, itemUrl: `${siteUrl}/i/sample-3` },
      ],
      paymentInstructions: paymentInstructions,
      pickupInstructions,
      pickupContact,
      contactEmail,
      paymentInstructionsUrl: paymentUrl,
    }),
  );

  await run('Admin winners list', () =>
    sendAdminWinnersList({
      adminEmails: [email],
      winners: [
        { itemTitle: 'Lakeside Cabin Weekend Getaway', bidderName: 'Jane Smith', email, winningBid: 125 },
        { itemTitle: 'VIP School Parking Spot (2025–2026)', bidderName: 'John Doe', email: 'john@example.com', winningBid: 300 },
        { itemTitle: 'Principal for a Day Experience', bidderName: 'Test Winner', email, winningBid: 210 },
      ],
      donors: [
        { donorName: 'Test Donor One', email: 'donor1@example.com', amount: 50, message: 'Happy to support!' },
        { donorName: 'Test Donor Two', email: 'donor2@example.com', amount: 25, message: null },
      ],
      contactEmail,
      auctionClosedAt: new Date().toISOString(),
    }),
  );

  return Response.json({ ok: true, sent, failed: failed.map((f) => (typeof f === 'string' ? f : f.name)), failedDetails: failed });
}
