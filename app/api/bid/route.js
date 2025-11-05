import { supabaseServer } from '@/lib/serverSupabase';
import { BidSchema } from '@/lib/validation';

export async function POST(req) {
  try {
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
    const needed = hasBids ? (Number(current) + Number(item.min_increment)) : Number(item.start_price);

    if (Number(amount) < needed) {
      return new Response(`Minimum allowed bid: ${needed.toFixed(2)}`, { status: 400 });
    }

    // Get or create user alias
    let aliasId = null;
    const { data: existingAlias, error: aliasError } = await s
      .from('user_aliases')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (aliasError) {
      console.error('Error checking alias:', aliasError);
      // Continue without alias if check fails
    } else if (existingAlias) {
      aliasId = existingAlias.id;
    }

    // Insert bid
    const { error: insertError } = await s.from('bids').insert({
      item_id: item.id,
      bidder_name,
      email,
      alias_id: aliasId,
      amount: Number(amount),
    });

    if (insertError) {
      console.error('Insert error:', insertError);
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
      console.error('Confirmation email error:', e);
    }

    // Outbid SMS notifications removed for free tier (email-only)

    return Response.json({
      ok: true,
      next_min: needed + Number(item.min_increment),
    });
  } catch (error) {
    console.error('Bid route error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
