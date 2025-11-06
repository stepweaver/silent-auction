import { supabaseServer } from '@/lib/serverSupabase';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const s = supabaseServer();
  
  try {
    const { data: item, error } = await s
      .from('item_leaders')
      .select('title, description, photo_url, current_high_bid, start_price, is_closed')
      .eq('slug', slug)
      .maybeSingle();

    if (error || !item) {
      return {
        title: 'Item Not Found',
        description: 'The requested auction item could not be found.',
      };
    }

    const currentBid = Number(item.current_high_bid || item.start_price || 0);
    const status = item.is_closed ? 'Closed' : 'Open for Bidding';
    const bidInfo = currentBid > 0 ? `Current bid: $${currentBid.toFixed(2)}` : `Starting at $${Number(item.start_price || 0).toFixed(2)}`;

    const title = `${item.title} - Silent Auction Item`;
    const description = item.description 
      ? `${item.description} ${status}. ${bidInfo}.`
      : `${item.title} - ${status}. ${bidInfo}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: item.photo_url 
          ? [
              {
                url: item.photo_url,
                width: 1200,
                height: 630,
                alt: item.title,
              },
              {
                url: '/logo-with-glow.png',
                width: 1200,
                height: 1200,
                alt: 'Mary Frank Elementary Silent Auction Logo',
              },
            ]
          : ['/logo-with-glow.png'],
        type: 'website',
      },
      twitter: {
        card: item.photo_url ? 'summary_large_image' : 'summary',
        title,
        description,
        images: item.photo_url ? [item.photo_url] : ['/logo-with-glow.png'],
      },
    };
  } catch (error) {
    console.error('Error generating metadata for item:', error);
    return {
      title: 'Auction Item',
      description: 'View this item in the Mary Frank Elementary Silent Auction.',
    };
  }
}

export default function ItemLayout({ children }) {
  return children;
}
