export const metadata = {
  title: 'Donor Dashboard',
  description: 'Donor dashboard for the Mary Frank Elementary Silent Auction. Manage your donated items, view bid activity, and generate QR codes.',
  openGraph: {
    title: 'Donor Dashboard',
    description: 'Manage your donated items for the Mary Frank Elementary Silent Auction.',
    images: ['/logo-with-glow.png'],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function VendorLayout({ children }) {
  return children;
}
