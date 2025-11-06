import { headers } from 'next/headers';
import { supabaseServer } from '@/lib/serverSupabase';
import { checkBasicAuth } from '@/lib/auth';

// Get all winners from closed items
async function getAllWinners(s) {
  // Get all items that have bids
  const { data: itemsWithBids, error: itemsError } = await s
    .from('items')
    .select('id, title, slug')
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (itemsError) {
    console.error('Error fetching items:', itemsError);
    return [];
  }

  if (!itemsWithBids || itemsWithBids.length === 0) {
    return [];
  }

  const winners = [];

  // For each item, get the highest bid
  for (const item of itemsWithBids) {
    const { data: topBid, error: bidError } = await s
      .from('bids')
      .select('bidder_name, email, amount')
      .eq('item_id', item.id)
      .order('amount', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bidError) {
      console.error(`Error fetching top bid for item ${item.id}:`, bidError);
      continue;
    }

    // Only include items that have bids
    if (topBid) {
      winners.push({
        itemId: item.id,
        itemTitle: item.title,
        itemSlug: item.slug,
        bidderName: topBid.bidder_name,
        email: topBid.email,
        winningBid: topBid.amount,
      });
    }
  }

  return winners;
}

export async function POST(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const s = supabaseServer();

    // Close all items
    const { error } = await s.from('items').update({ is_closed: true }).neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Close all error:', error);
      return new Response('Failed to close all items', { status: 500 });
    }

    // Get settings for payment/pickup instructions and contact email
    const { data: settings, error: settingsError } = await s
      .from('settings')
      .select('payment_instructions, pickup_instructions, contact_email')
      .eq('id', 1)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
    }

    // Get all winners
    const winners = await getAllWinners(s);

    // Get admin emails from environment variable
    const adminEmailsEnv = process.env.ADMIN_EMAILS;
    const adminEmails = adminEmailsEnv 
      ? adminEmailsEnv.split(',').map(email => email.trim()).filter(email => email.length > 0)
      : [];

    // Send emails to winners
    const { sendWinnerNotification } = await import('@/lib/notifications');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const contactEmail = settings?.contact_email || process.env.AUCTION_CONTACT_EMAIL || null;
    const paymentInstructionsUrl = `${siteUrl}/payment-instructions`;

    const winnerEmailPromises = winners.map(winner => {
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
      }).catch(err => {
        console.error(`Error sending winner email to ${winner.email}:`, err);
      });
    });

    // Send admin email with winners list
    if (adminEmails.length > 0) {
      const { sendAdminWinnersList } = await import('@/lib/notifications');
      sendAdminWinnersList({
        adminEmails,
        winners: winners.map(w => ({
          itemTitle: w.itemTitle,
          bidderName: w.bidderName,
          email: w.email,
          winningBid: w.winningBid,
        })),
        contactEmail,
      }).catch(err => {
        console.error('Error sending admin winners list:', err);
      });
    } else {
      console.warn('ADMIN_EMAILS not set in environment variables. Skipping admin notification.');
    }

    // Wait for winner emails to complete (but don't fail if some fail)
    await Promise.allSettled(winnerEmailPromises);

    return Response.json({ 
      ok: true, 
      winnersCount: winners.length,
      emailsSent: winners.length,
      adminEmailsSent: adminEmails.length > 0 ? adminEmails.length : 0,
    });
  } catch (error) {
    console.error('Close all error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
