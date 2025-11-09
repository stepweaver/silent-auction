export const metadata = {
  title: 'Admin Dashboard',
  description:
    'Administrative dashboard for managing the Mary Frank Elementary Silent Auction. Manage items, settings, and auction operations.',
  openGraph: {
    title: 'Admin Dashboard',
    description:
      'Administrative dashboard for managing the Mary Frank Elementary Silent Auction.',
    images: ['/logo-with-glow.png'],
  },
  robots: {
    index: false,
    follow: false,
    noindex: true,
    nofollow: true,
  },
};

export default function AdminLayout({ children }) {
  return (
    <div className='px-4 py-5 sm:px-6 lg:px-8'>
      <div className='mx-auto w-full max-w-5xl'>{children}</div>
    </div>
  );
}
