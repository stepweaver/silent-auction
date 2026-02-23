import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BackgroundLogo from '@/components/BackgroundLogo';
import SiteBanner from '@/components/SiteBanner';
import { supabaseServer } from '@/lib/serverSupabase';

export const dynamic = 'force-dynamic';

async function getAuctionDeadline() {
  try {
    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('settings')
      .select('auction_deadline')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      console.error('Failed to load settings for banner:', error);
      return null;
    }

    return data?.auction_deadline ?? null;
  } catch (error) {
    console.error('Unexpected error loading banner settings:', error);
    return null;
  }
}

const getMetadataBase = () => {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return new URL(siteUrl);
  } catch {
    return new URL('http://localhost:3000');
  }
};

export const metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: 'Mary Frank Elementary Silent Auction',
    template: '%s | Mary Frank Elementary Silent Auction',
  },
  description:
    'Join the fun and support our PTO! Browse items, place bids, and win amazing prizes at the Mary Frank Elementary Silent Auction.',
  keywords: [
    'silent auction',
    'elementary school',
    'PTO',
    'fundraiser',
    'bidding',
    'Mary Frank Elementary',
  ],
  authors: [{ name: 'Mary Frank PTO' }],
  creator: 'Mary Frank PTO',
  publisher: 'Mary Frank PTO',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Mary Frank Elementary Silent Auction',
    title: 'Mary Frank Elementary Silent Auction',
    description:
      'Join the fun and support our PTO! Browse items, place bids, and win amazing prizes.',
    images: [
      {
        url: '/logo-with-glow.png',
        width: 1200,
        height: 1200,
        alt: 'Mary Frank Elementary Silent Auction Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mary Frank Elementary Silent Auction',
    description:
      'Join the fun and support our PTO! Browse items, place bids, and win amazing prizes.',
    images: ['/logo-with-glow.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo-with-glow.png',
    apple: '/logo-with-glow.png',
  },
  manifest: '/manifest.webmanifest',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({ children }) {
  const auctionDeadline = await getAuctionDeadline();

  return (
    <html
      lang='en'
      data-theme='auction'
      data-scroll-behavior='smooth'
      className='h-full'
    >
      <body className='bg-gray-50 min-h-screen flex flex-col relative h-full'>
        <a href='#main-content' className='skip-link'>Skip to main content</a>
        <BackgroundLogo />
        <SiteHeader />
        <div
          id='main-content'
          className='flex-1 relative z-0 min-w-0 min-h-0 overflow-auto'
        >
          <SiteBanner deadlineISO={auctionDeadline} />
          {children}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
