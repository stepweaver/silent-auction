import { supabaseServer } from '@/lib/serverSupabase';
import { BidSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyCSRFToken } from '@/lib/csrf';
import { jsonError } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

export async function POST(req) {
  try {
    // Rate limiting: 20 bids per minute per IP
    const rateLimitResult = await checkRateLimit(req, 20, 60 * 1000);
    if (rateLimitResult) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Too many bid requests. Please slow down.',
          retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
          },
        }
      );
    }

    // CSRF required for state-changing operations
    const csrfValid = await verifyCSRFToken(req);
    if (!csrfValid) {
      return jsonError('Invalid or missing CSRF token', 403);
    }

    const body = await req.json();
    const parsed = BidSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError('Invalid request data', 400);
    }

    const { slug, item_id, bidder_name, email, amount } = parsed.data;
    const s = supabaseServer();

    // Load settings
    const { data: settings, error: settingsError } = await s
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (settingsError) {
      return jsonError('Settings not found', 500);
    }

    // Load item
    let item;
    if (item_id) {
      const { data: itemData, error: itemError } = await s
        .from('items')
        .select('*')
        .eq('id', item_id)
        .single();

      if (itemError || !itemData) {
        return jsonError('Item not found', 404);
      }
      item = itemData;
    } else if (slug) {
      const { data: itemData, error: itemError } = await s
        .from('items')
        .select('*')
        .eq('slug', slug)
        .single();

      if (itemError || !itemData) {
        return jsonError('Item not found', 404);
      }
      item = itemData;
    } else {
      return jsonError('Either slug or item_id required', 400);
    }

    // Deadline & closed checks
    const now = new Date();
    const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;

    // Check if auction is manually closed
    if (settings?.auction_closed) {
      return jsonError('Bidding closed - auction is manually closed', 400);
    }

    const auctionStart = settings?.auction_start ? new Date(settings.auction_start) : null;
    if (auctionStart && now < auctionStart) {
      const formatted = auctionStart.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      return jsonError(`Bidding not yet open. Auction opens ${formatted}.`, 400);
    }

    if (deadline && now >= deadline) {
      return jsonError('Bidding closed - deadline passed', 400);
    }

    if (item.is_closed) {
      return jsonError('Bidding closed - item is closed', 400);
    }

    // Get current high bid
    const { data: topBid, error: bidError } = await s
      .from('bids')
      .select('amount')
      .eq('item_id', item.id)
      .order('amount', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bidError) {
      return jsonError('Error checking current bids', 500);
    }

    const hasBids = topBid && typeof topBid.amount !== 'undefined';
    const current = hasBids ? Number(topBid.amount) : Number(item.start_price);
    // Enforce a fixed $5 bid increment across all items
    const minIncrement = 5;
    const needed = hasBids ? (Number(current) + minIncrement) : Number(item.start_price);
    const bidAmount = Number(amount);

    // Basic range check
    if (bidAmount < needed) {
      return jsonError(`Minimum allowed bid: ${needed.toFixed(2)}`, 400);
    }

    // Enforce whole-dollar bids in fixed $5 increments
    const cents = Math.round(bidAmount * 100);
    if (!Number.isFinite(bidAmount) || cents <= 0) {
      return jsonError('Invalid bid amount', 400);
    }

    if (cents % 500 !== 0) {
      return jsonError('Bids must be in $5 increments (e.g., $5, $10, $15).', 400);
    }

    // Require existing user alias with email and name
    const { data: existingAlias, error: aliasError } = await s
      .from('user_aliases')
      .select('id, email, name, email_bid_confirmations')
      .eq('email', email)
      .maybeSingle();

    if (aliasError) {
      logError('Error checking alias', aliasError);
      return jsonError('Error checking avatar. Please try again.', 500);
    }

    if (!existingAlias) {
      return jsonError('You must create an avatar before placing a bid. Please create your avatar first.', 400);
    }

    // BEST PRACTICE: Check verified_emails table to ensure email was verified
    const { data: verifiedEmail } = await s
      .from('verified_emails')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (!verifiedEmail) {
      return jsonError('Please verify your email address before placing bids. Check your email for the verification link.', 400);
    }

    // Ensure the alias has a name (required for bids)
    if (!existingAlias.name || existingAlias.name.trim() === '') {
      return jsonError('Your avatar must have a name before placing bids. Please update your avatar with your name.', 400);
    }

    const aliasId = existingAlias.id;

    // Validate that alias_id exists (defensive programming)
    if (!aliasId) {
      logError('[BID] Alias ID missing for email', email);
      return jsonError('Error: Alias ID is missing. Please contact support.', 500);
    }

    // Check if this is user's first bid on this item (before inserting)
    const { data: previousBids } = await s
      .from('bids')
      .select('id')
      .eq('item_id', item.id)
      .eq('email', email)
      .limit(1);

    const isInitialBid = !previousBids || previousBids.length === 0;

    // Insert bid
    const { error: insertError } = await s.from('bids').insert({
      item_id: item.id,
      bidder_name,
      email,
      alias_id: aliasId,
      amount: Number(amount),
    });

    if (insertError) {
      logError('Bid insert error', insertError);
      return jsonError('Failed to place bid', 500);
    }

    // Send email only if user opted in AND this is their initial bid on this item
    if (existingAlias?.email_bid_confirmations === true && isInitialBid) {
      const itemUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/i/${item.slug}`;
      const { sendBidConfirmation } = await import('@/lib/notifications');
      try {
        await sendBidConfirmation({
          email,
          bidderName: bidder_name,
          itemTitle: item.title,
          bidAmount: Number(amount),
          itemUrl,
          contactEmail: settings?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || null,
        });
      } catch (e) {
        logError('Initial bid confirmation email error', e);
        // Continue even if email fails - bid was already placed
      }
    }

    // Notify opted-in users who were outbid (throttled to 1 per 30 min per item)
    try {
      const itemUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/i/${item.slug}`;
      const { notifyOutbidUsersByEmail } = await import('@/lib/notifications');
      await notifyOutbidUsersByEmail({
        itemId: item.id,
        newHighBid: Number(amount),
        itemTitle: item.title,
        itemUrl,
        excludeEmail: email,
        contactEmail: settings?.contact_email || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || null,
      });
    } catch (e) {
      logError('Outbid notification error', e);
    }

    const nextMinAfterBid = Number(amount) + minIncrement;
    return Response.json({
      ok: true,
      next_min: nextMinAfterBid,
    });
  } catch (error) {
    logError('Bid route error', error);
    return jsonError('Internal server error', 500);
  }
}
