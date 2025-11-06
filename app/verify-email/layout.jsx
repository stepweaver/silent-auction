export const metadata = {
  title: 'Verify Your Email',
  description: 'Email verification for the Mary Frank Elementary Silent Auction. Verify your email address to create your bidding alias and start participating.',
  openGraph: {
    title: 'Verify Your Email',
    description: 'Email verification for the Mary Frank Elementary Silent Auction.',
    images: ['/logo-with-glow.png'],
  },
  twitter: {
    title: 'Verify Your Email',
    description: 'Complete email verification to start bidding.',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function VerifyEmailLayout({ children }) {
  return children;
}
