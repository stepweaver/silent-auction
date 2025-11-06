import { supabaseServer } from '@/lib/serverSupabase';
import { BidSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyCSRFToken } from '@/lib/csrf';

export async function POST(req) {
  try {
    // Rate limiting: 20 bids per minute per IP
    const rateLimitResult = await checkRateLimit(req, 20, 60 * 1000);
    if (rateLimitResult) {
      return new Response(
        JSON.stringify({ 
          error: 'Too many bid requests. Please slow down.',
          retryAfter: Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
        }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString()
          }
        }
      );
    }

    // CSRF protection for state-changing operations
    const csrfValid = await verifyCSRFToken(req);
    if (!csrfValid) {
      return new Response('Invalid or missing CSRF token', { status: 403 });
    }

    const body = await req.json();
    const parsed = BidSchema.safeParse(body);

    if (!parsed.success) {
      return new Response('Invalid request data', { status: 400 });
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
      return new Response('Settings not found', { status: 500 });
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
        return new Response('Item not found', { status: 404 });
      }
      item = itemData;
    } else if (slug) {
      const { data: itemData, error: itemError } = await s
        .from('items')
        .select('*')
        .eq('slug', slug)
        .single();

      if (itemError || !itemData) {
        return new Response('Item not found', { status: 404 });
      }
      item = itemData;
    } else {
      return new Response('Either slug or item_id required', { status: 400 });
    }

    // Deadline & closed checks
    const now = new Date();
    const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;

    if (deadline && now >= deadline) {
      return new Response('Bidding closed - deadline passed', { status: 400 });
    }

    if (item.is_closed) {
      return new Response('Bidding closed - item is closed', { status: 400 });
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
      return new Response('Error checking current bids', { status: 500 });
    }

    const hasBids = topBid && typeof topBid.amount !== 'undefined';
    const current = hasBids ? Number(topBid.amount) : Number(item.start_price);
    const needed = hasBids ? (Number(current) + 1) : Number(item.start_price); // Fixed $1 increment

    if (Number(amount) < needed) {
      return new Response(`Minimum allowed bid: ${needed.toFixed(2)}`, { status: 400 });
    }

    // Require existing user alias with email and name
    const { data: existingAlias, error: aliasError } = await s
      .from('user_aliases')
      .select('id, email, name')
      .eq('email', email)
      .maybeSingle();

    if (aliasError) {
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Error checking alias:', aliasError);
      }
      return new Response('Error checking avatar. Please try again.', { status: 500 });
    }

    if (!existingAlias) {
      return new Response('You must create an avatar before placing a bid. Please create your avatar first.', { status: 400 });
    }

    // BEST PRACTICE: Check verified_emails table to ensure email was verified
    // Since we only create aliases for verified emails, this is a double-check
    const { data: verifiedEmail } = await s
      .from('verified_emails')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (!verifiedEmail) {
      return new Response('Please verify your email address before placing bids. Check your email for the verification link.', { status: 400 });
    }

    // Ensure the alias has a name (required for bids)
    if (!existingAlias.name || existingAlias.name.trim() === '') {
      return new Response('Your avatar must have a name before placing bids. Please update your avatar with your name.', { status: 400 });
    }

    const aliasId = existingAlias.id;

    // Insert bid
    const { error: insertError } = await s.from('bids').insert({
      item_id: item.id,
      bidder_name,
      email,
      alias_id: aliasId,
      amount: Number(amount),
    });

    if (insertError) {
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Insert error:', insertError);
      }
      return new Response('Failed to place bid', { status: 500 });
    }

    const itemUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/i/${item.slug}`;

    // Send bid confirmation email (await to ensure it fires reliably)
    const { sendBidConfirmation } = await import('@/lib/notifications');
    try {
      await sendBidConfirmation({
        email,
        bidderName: bidder_name,
        itemTitle: item.title,
        bidAmount: Number(amount),
        itemUrl,
        contactEmail: settings?.contact_email || process.env.AUCTION_CONTACT_EMAIL || null,
      });
    } catch (e) {
      // Log error server-side only, don't expose details to client
      if (process.env.NODE_ENV === 'development') {
        console.error('Confirmation email error:', e);
      }
      // Continue even if email fails - bid was already placed
    }

    // Outbid SMS notifications removed for free tier (email-only)

    return Response.json({
      ok: true,
      next_min: needed + 1, // Fixed $1 increment
    });
  } catch (error) {
    // Log error server-side only, don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error('Bid route error:', error);
    }
    return new Response('Internal server error', { status: 500 });
  }
}
