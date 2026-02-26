/**
 * Secret endpoint: send all email types to a single address for testing.
 * Only the specified email receives anything. No auction actions are triggered.
 * Protected by admin Basic Auth.
 */

import { headers } from 'next/headers';
import { checkBasicAuth } from '@/lib/auth';
import { jsonError, jsonUnauthorized } from '@/lib/apiResponses';
import {
  sendBidConfirmation,
  sendOutbidEmail,
  sendWinnerDigest,
  sendDonationConfirmation,
  sendAliasAccessNotification,
  sendVendorAdminEnrollmentEmail,
  sendEmailVerification,
} from '@/lib/notifications';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
  process.env.AUCTION_CONTACT_EMAIL ||
  'pto@example.org';
const paymentUrl =
  process.env.CHEDDARUP_PAYMENT_URL_WINNERS || `${siteUrl}/payment-instructions`;
const donationPaymentUrl =
  process.env.CHEDDARUP_PAYMENT_URL_DONATIONS || paymentUrl;
const pickupContact = process.env.PICKUP_CONTACT || null;

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

  await run('Bid confirmation', () =>
    sendBidConfirmation({
      email,
      bidderName: 'Test Bidder',
      itemTitle: 'Lakeside Cabin Weekend Getaway',
      bidAmount: 125,
      itemUrl: `${siteUrl}/i/sample-item`,
      contactEmail,
    }),
  );

  await run('Outbid', () =>
    sendOutbidEmail({
      email,
      bidderName: 'Test Bidder',
      itemTitle: 'Lakeside Cabin Weekend Getaway',
      newHighBid: 150,
      itemUrl: `${siteUrl}/i/sample-item`,
      contactEmail,
    }),
  );

  await run('Winner digest', () =>
    sendWinnerDigest({
      email,
      bidderName: 'Test Winner',
      items: [
        { itemTitle: 'Lakeside Cabin Weekend Getaway', winningBid: 125, itemUrl: `${siteUrl}/i/sample-1` },
        { itemTitle: 'VIP School Parking Spot (2025–2026)', winningBid: 300, itemUrl: `${siteUrl}/i/sample-2` },
        { itemTitle: 'Principal for a Day Experience', winningBid: 210, itemUrl: `${siteUrl}/i/sample-3` },
      ],
      paymentInstructions: null,
      pickupInstructions: 'Items may be picked up on Thursday immediately following the close of the auction at 7:30pm in the LGI room across from the gym.',
      pickupContact,
      contactEmail,
      paymentInstructionsUrl: paymentUrl,
    }),
  );

  await run('Donation confirmation', () =>
    sendDonationConfirmation({
      email,
      donorName: 'Test Donor',
      amount: 50,
      message: 'Happy to support the school!',
      contactEmail,
      donationPaymentUrl,
    }),
  );

  await run('Security alert', () =>
    sendAliasAccessNotification({
      email,
      alias: 'Purple Panda',
      contactEmail,
      siteUrl,
    }),
  );

  await run('Vendor enrollment', () =>
    sendVendorAdminEnrollmentEmail({
      email,
      name: 'Test Vendor',
      enrollmentLink: `${siteUrl}/vendor-enroll?token=test-token`,
      contactEmail,
    }),
  );

  await run('Email verification', () =>
    sendEmailVerification({
      email,
      name: 'Test User',
      verificationLink: `${siteUrl}/verify-email?token=test&email=${encodeURIComponent(email)}`,
      contactEmail,
    }),
  );

  return Response.json({ ok: true, sent, failed: failed.map((f) => (typeof f === 'string' ? f : f.name)), failedDetails: failed });
}
