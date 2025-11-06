export const metadata = {
  title: 'Your Dashboard',
  description: 'Manage your bidding avatar and track all your bids in the Mary Frank Elementary Silent Auction. View your bidding history and see which items you\'re winning.',
  openGraph: {
    title: 'Your Dashboard',
    description: 'Manage your bidding avatar and track all your bids in the Mary Frank Elementary Silent Auction.',
    images: ['/logo-with-glow.png'],
  },
  twitter: {
    title: 'Your Dashboard',
    description: 'Track your bids and manage your auction activity.',
  },
};

export default function AvatarLayout({ children }) {
  return children;
}
