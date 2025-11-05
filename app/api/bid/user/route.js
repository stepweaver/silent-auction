import { supabaseServer } from '@/lib/serverSupabase';

export async function POST(req) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const s = supabaseServer();

    // Get settings to check deadline
    const { data: settings } = await s
      .from('settings')
      .select('auction_deadline')
      .eq('id', 1)
      .maybeSingle();
    
    const deadline = settings?.auction_deadline ? new Date(settings.auction_deadline) : null;
    const now = new Date();
    const deadlinePassed = deadline && now >= deadline;

    // Get user's bids with item information
    const { data: bids, error: bidsError } = await s
      .from('bids')
      .select(`
        *,
        items (
          id,
          slug,
          title,
          photo_url,
          start_price,
          min_increment,
          is_closed
        )
      `)
      .eq('email', email)
      .order('created_at', { ascending: false });

    if (bidsError) {
      console.error('Error fetching user bids:', bidsError);
      return Response.json(
        { error: 'Error fetching bids', bids: [] },
        { status: 500 }
      );
    }

    // For each bid, check if it's been outbid
    const bidsWithStatus = await Promise.all(
      (bids || []).map(async (bid) => {
        // Get current high bid for this item
        const { data: topBid, error: topBidError } = await s
          .from('bids')
          .select('amount')
          .eq('item_id', bid.item_id)
          .order('amount', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (topBidError) {
          console.error('Error checking top bid:', topBidError);
          return { ...bid, is_outbid: false };
        }

        const currentHigh = topBid ? Number(topBid.amount) : Number(bid.items?.start_price || 0);
        const isOutbid = Number(bid.amount) < currentHigh;
        
        // Check if item is closed (either manually or by deadline)
        const itemClosed = bid.items?.is_closed || false;
        const actuallyClosed = itemClosed || deadlinePassed;

        return {
          ...bid,
          is_outbid: isOutbid,
          current_high_bid: currentHigh,
          items: bid.items ? {
            ...bid.items,
            current_high_bid: currentHigh,
            is_closed: actuallyClosed, // Include deadline status
          } : null,
        };
      })
    );

    return Response.json({ bids: bidsWithStatus });
  } catch (error) {
    console.error('Get user bids error:', error);
    return Response.json(
      { error: 'Internal server error', bids: [] },
      { status: 500 }
    );
  }
}

