import { supabaseServer } from '@/lib/serverSupabase';

const SENTINEL_ITEM_ID = '00000000-0000-0000-0000-000000000000';

async function getAllWinners(supabase, items) {
  if (!items || items.length === 0) {
    return [];
  }

  const winnerPromises = items.map(async (item) => {
    const { data: topBid, error: bidError } = await supabase
      .from('bids')
      .select('bidder_name, email, amount')
      .eq('item_id', item.id)
      .order('amount', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bidError) {
      console.error(`closeAuction:getAllWinners bid error for ${item.id}`, bidError);
      return null;
    }

    if (!topBid) {
      return null;
    }

    if (!topBid.email) {
      console.warn(`closeAuction:getAllWinners missing email for winning bid on item ${item.id}`);
    }

    return {
      itemId: item.id,
      itemTitle: item.title,
      itemSlug: item.slug,
      bidderName: topBid.bidder_name,
      email: topBid.email,
      winningBid: topBid.amount,
    };
  });

  const winners = await Promise.all(winnerPromises);
  return winners.filter(Boolean);
}

/**
 * Send closing emails (winner digest + admin winners list) without closing items.
 * Use when items are already closed but emails were never sent (recovery).
 */
export async function sendClosingEmailsOnly({ triggeredBy = 'manual' } = {}) {
  const supabase = supabaseServer();
  const now = new Date();

  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('payment_instructions, pickup_instructions, contact_email')
    .eq('id', 1)
    .maybeSingle();

  if (settingsError) {
    console.error('sendClosingEmailsOnly:settings error', settingsError);
  }

  const { data: closedItems, error: itemsError } = await supabase
    .from('items')
    .select('id, title, slug')
    .eq('is_closed', true)
    .neq('id', SENTINEL_ITEM_ID);

  if (itemsError) {
    console.error('sendClosingEmailsOnly:items error', itemsError);
    return {
      winners: [],
      winnersCount: 0,
      emailsSent: 0,
      winnerRecipients: [],
      adminEmailsSent: 0,
      donationsCount: 0,
      donationsTotal: 0,
      error: itemsError.message,
    };
  }

  if (!closedItems || closedItems.length === 0) {
    return {
      winners: [],
      winnersCount: 0,
      emailsSent: 0,
      winnerRecipients: [],
      adminEmailsSent: 0,
      donationsCount: 0,
      donationsTotal: 0,
      message: 'No closed items found.',
    };
  }

  const winners = await getAllWinners(supabase, closedItems);

  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  const adminEmails = adminEmailsEnv
    ? adminEmailsEnv
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.length > 0)
    : [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const contactEmail = settings?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || null;
  const paymentInstructionsUrl =
    process.env.CHEDDARUP_PAYMENT_URL_WINNERS || `${siteUrl}/payment-instructions`;

  const { sendWinnerDigest } = await import('@/lib/notifications');

  const winnersByEmail = new Map();

  for (const winner of winners) {
    const emailKey = winner.email?.trim().toLowerCase();
    if (!emailKey) {
      console.warn(`sendClosingEmailsOnly:winner missing email for item ${winner.itemId}`);
      continue;
    }

    const existing = winnersByEmail.get(emailKey) || {
      email: winner.email.trim(),
      bidderName: winner.bidderName || '',
      items: [],
    };

    if (!existing.bidderName && winner.bidderName) {
      existing.bidderName = winner.bidderName;
    }

    existing.items.push({
      itemTitle: winner.itemTitle,
      winningBid: winner.winningBid,
      itemUrl: `${siteUrl}/i/${winner.itemSlug}`,
    });

    winnersByEmail.set(emailKey, existing);
  }

  const pickupContact = process.env.PICKUP_CONTACT || null;

  const winnerEmailPromises = Array.from(winnersByEmail.values()).map((entry) =>
    sendWinnerDigest({
      email: entry.email,
      bidderName: entry.bidderName,
      items: entry.items,
      paymentInstructions: settings?.payment_instructions || null,
      pickupInstructions: settings?.pickup_instructions || null,
      pickupContact,
      contactEmail,
      paymentInstructionsUrl,
    }),
  );

  const winnerEmailResults = await Promise.allSettled(winnerEmailPromises);
  const emailsSent = winnerEmailResults.filter((result) => result.status === 'fulfilled').length;

  let donors = [];
  try {
    const { data: allDonations, error: donationsError } = await supabase
      .from('donations')
      .select('donor_name, email, amount, message');

    if (donationsError) {
      console.error('sendClosingEmailsOnly:donations error', donationsError);
    } else if (allDonations && allDonations.length > 0) {
      donors = allDonations.map((d) => ({
        donorName: d.donor_name,
        email: d.email,
        amount: d.amount,
        message: d.message || null,
      }));
    }
  } catch (donationError) {
    console.error('sendClosingEmailsOnly:donations fetch error', donationError);
  }

  const donationsCount = donors.length;
  const donationsTotal = donors.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  let adminEmailsSent = 0;
  if (adminEmails.length > 0) {
    try {
      const { sendAdminWinnersList } = await import('./notifications.js');
      await sendAdminWinnersList({
        adminEmails,
        winners,
        donors,
        contactEmail,
        auctionClosedAt: now.toISOString(),
      });
      adminEmailsSent = adminEmails.length;
    } catch (adminEmailError) {
      console.error('Failed to send admin winners list:', adminEmailError);
    }
  }

  return {
    winners,
    winnersCount: winners.length,
    emailsSent,
    winnerRecipients: Array.from(winnersByEmail.values()).map((entry) => entry.email),
    adminEmailsSent,
    donationsCount,
    donationsTotal,
  };
}

export async function closeAuction({ force = false, triggeredBy = 'manual' } = {}) {
  const supabase = supabaseServer();
  const now = new Date();

  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('auction_deadline, payment_instructions, pickup_instructions, contact_email')
    .eq('id', 1)
    .maybeSingle();

  if (settingsError) {
    console.error('closeAuction:settings error', settingsError);
  }

  const deadlineISO = settings?.auction_deadline ?? null;
  const deadline = deadlineISO ? new Date(deadlineISO) : null;

  if (!force && deadline && deadline > now) {
    return {
      ok: true,
      state: 'before-deadline',
      message: 'Auction deadline has not passed yet.',
      triggeredBy,
      deadline: deadlineISO,
    };
  }

  const { data: openItems, error: openItemsError } = await supabase
    .from('items')
    .select('id, title, slug')
    .eq('is_closed', false)
    .neq('id', SENTINEL_ITEM_ID);

  if (openItemsError) {
    console.error('closeAuction:open items error', openItemsError);
    return {
      ok: false,
      state: 'error',
      message: 'Failed to inspect auction items.',
      triggeredBy,
      error: openItemsError.message,
    };
  }

  if (!openItems || openItems.length === 0) {
    // Items already closed — send closing emails anyway (recovery for missed sends)
    const emailResult = await sendClosingEmailsOnly({ triggeredBy });
    return {
      ok: true,
      state: 'already-closed',
      message: 'All items are already closed. Closing emails sent.',
      triggeredBy,
      deadline: deadlineISO,
      ...emailResult,
    };
  }

  const { error: closeError } = await supabase
    .from('items')
    .update({ is_closed: true })
    .eq('is_closed', false)
    .neq('id', SENTINEL_ITEM_ID);

  if (closeError) {
    console.error('closeAuction:update items error', closeError);
    return {
      ok: false,
      state: 'error',
      message: 'Failed to close all items.',
      triggeredBy,
      error: closeError.message,
    };
  }

  const winners = await getAllWinners(supabase, openItems);

  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  const adminEmails = adminEmailsEnv
    ? adminEmailsEnv
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email.length > 0)
    : [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const contactEmail = settings?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || null;
  const paymentInstructionsUrl =
    process.env.CHEDDARUP_PAYMENT_URL_WINNERS || `${siteUrl}/payment-instructions`;

  const { sendWinnerDigest } = await import('@/lib/notifications');

  const winnersByEmail = new Map();

  for (const winner of winners) {
    const emailKey = winner.email?.trim().toLowerCase();
    if (!emailKey) {
      console.warn(`closeAuction:winner missing email for item ${winner.itemId}`);
      continue;
    }

    const existing = winnersByEmail.get(emailKey) || {
      email: winner.email.trim(),
      bidderName: winner.bidderName || '',
      items: [],
    };

    if (!existing.bidderName && winner.bidderName) {
      existing.bidderName = winner.bidderName;
    }

    existing.items.push({
      itemTitle: winner.itemTitle,
      winningBid: winner.winningBid,
      itemUrl: `${siteUrl}/i/${winner.itemSlug}`,
    });

    winnersByEmail.set(emailKey, existing);
  }

  const pickupContact = process.env.PICKUP_CONTACT || null;

  const winnerEmailPromises = Array.from(winnersByEmail.values()).map((entry) =>
    sendWinnerDigest({
      email: entry.email,
      bidderName: entry.bidderName,
      items: entry.items,
      paymentInstructions: settings?.payment_instructions || null,
      pickupInstructions: settings?.pickup_instructions || null,
      pickupContact,
      contactEmail,
      paymentInstructionsUrl,
    }),
  );

  const winnerEmailResults = await Promise.allSettled(winnerEmailPromises);
  const emailsSent = winnerEmailResults.filter((result) => result.status === 'fulfilled').length;

  // Fetch donation pledges for admin summary (donor list)
  let donors = [];
  try {
    const { data: allDonations, error: donationsError } = await supabase
      .from('donations')
      .select('donor_name, email, amount, message');

    if (donationsError) {
      console.error('closeAuction:donations error', donationsError);
    } else if (allDonations && allDonations.length > 0) {
      donors = allDonations.map((d) => ({
        donorName: d.donor_name,
        email: d.email,
        amount: d.amount,
        message: d.message || null,
      }));
    }
  } catch (donationError) {
    console.error('closeAuction:donations fetch error', donationError);
  }

  const donationsCount = donors.length;
  const donationsTotal = donors.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  // Send admin winners list email
  let adminEmailsSent = 0;
  if (adminEmails.length > 0 && (winners.length > 0 || donors.length > 0)) {
    try {
      const { sendAdminWinnersList } = await import('./notifications.js');
      await sendAdminWinnersList({
        adminEmails,
        winners,
        donors,
        contactEmail,
        auctionClosedAt: now.toISOString(),
      });
      adminEmailsSent = adminEmails.length;
    } catch (adminEmailError) {
      console.error('Failed to send admin winners list:', adminEmailError);
    }
  }

  return {
    ok: true,
    state: 'closed',
    triggeredBy,
    deadline: deadlineISO,
    winners,
    winnersCount: winners.length,
    emailsSent,
    winnerRecipients: Array.from(winnersByEmail.values()).map((entry) => entry.email),
    adminEmailsSent,
    donationsCount,
    donationsTotal,
  };
}

