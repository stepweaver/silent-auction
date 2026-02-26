import LandingViewportLock from '@/components/LandingViewportLock';

export const metadata = {
  title: 'Get Started - Join the Auction',
  description: 'Create your anonymous bidding alias and join the Mary Frank Elementary Silent Auction. Choose a fun color and emoji to represent you while bidding!',
  openGraph: {
    title: 'Get Started - Join the Auction',
    description: 'Create your anonymous bidding alias and join the Mary Frank Elementary Silent Auction. Choose a fun color and emoji to represent you while bidding!',
    images: ['/logo-with-glow.png'],
  },
  twitter: {
    title: 'Get Started - Join the Auction',
    description: 'Create your anonymous bidding alias and join the Mary Frank Elementary Silent Auction.',
  },
};

export default function LandingLayout({ children }) {
  return <LandingViewportLock>{children}</LandingViewportLock>;
}
