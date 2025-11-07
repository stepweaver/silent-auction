import { supabaseServer } from '@/lib/serverSupabase';

const SENTINEL_ITEM_ID = '00000000-0000-0000-0000-000000000000';

async function getAllWinners(supabase, items) {
  if (!items || items.length === 0) {
    return [];
  }

  const itemIds = items.map((item) => item.id);

  const { data: bidRows, error: bidError } = await supabase
    .from('bids')
    .select('item_id, bidder_name, email, amount')
    .in('item_id', itemIds)
    .order('item_id', { ascending: true })
    .order('amount', { ascending: false });

  if (bidError) {
    console.error('closeAuction:getAllWinners bid query error', bidError);
    return [];
  }

  const winnersByItem = new Map();
  if (bidRows) {
    for (const row of bidRows) {
      if (!winnersByItem.has(row.item_id)) {
        winnersByItem.set(row.item_id, row);
      }
    }
  }

  return items
    .map((item) => {
      const winner = winnersByItem.get(item.id);
      if (!winner) {
        return null;
      }

      return {
        itemId: item.id,
        itemTitle: item.title,
        itemSlug: item.slug,
        bidderName: winner.bidder_name,
        email: winner.email,
        winningBid: winner.amount,
      };
    })
    .filter(Boolean);
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
    return {
      ok: true,
      state: 'already-closed',
      message: 'All items are already closed.',
      triggeredBy,
      deadline: deadlineISO,
      winners: [],
      emailsSent: 0,
      adminEmailsSent: 0,
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
  const contactEmail = settings?.contact_email || process.env.AUCTION_CONTACT_EMAIL || null;
  const paymentInstructionsUrl = `${siteUrl}/payment-instructions`;

  const { sendWinnerNotification } = await import('@/lib/notifications');

  const winnerEmailPromises = winners.map((winner) => {
    const itemUrl = `${siteUrl}/i/${winner.itemSlug}`;
    return sendWinnerNotification({
      email: winner.email,
      bidderName: winner.bidderName,
      itemTitle: winner.itemTitle,
      winningBid: winner.winningBid,
      paymentInstructions: settings?.payment_instructions || null,
      pickupInstructions: settings?.pickup_instructions || null,
      contactEmail,
      itemUrl,
      paymentInstructionsUrl,
    });
  });

  const winnerEmailResults = await Promise.allSettled(winnerEmailPromises);
  const emailsSent = winnerEmailResults.filter((result) => result.status === 'fulfilled').length;

  const adminSummary = {
    adminEmailsSent: 0,
  };

  if (adminEmails.length > 0) {
    const { sendAdminWinnersList } = await import('@/lib/notifications');
    try {
      await sendAdminWinnersList({
        adminEmails,
        winners: winners.map((winner) => ({
          itemTitle: winner.itemTitle,
          bidderName: winner.bidderName,
          email: winner.email,
          winningBid: winner.winningBid,
        })),
        contactEmail,
      });
      adminSummary.adminEmailsSent = adminEmails.length;
    } catch (error) {
      console.error('closeAuction:admin winners list error', error);
    }
  } else {
    console.warn('closeAuction: ADMIN_EMAILS not configured; skipping admin notifications.');
  }

  return {
    ok: true,
    state: 'closed',
    triggeredBy,
    deadline: deadlineISO,
    winners,
    winnersCount: winners.length,
    emailsSent,
    adminEmailsSent: adminSummary.adminEmailsSent,
  };
}

