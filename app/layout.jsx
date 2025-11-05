import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'Silent Auction',
  description: 'PTO Silent Auction',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="auction">
      <body className="bg-base-200 min-h-screen flex flex-col">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 grid place-items-center">
          <img
            src="/logo-with-glow.png"
            alt=""
            className="opacity-10 object-contain"
            style={{
              maxWidth: 'min(88vw, 1100px)',
              maxHeight: '70vh',
              width: '100%',
              height: '100%',
              transform: 'translateY(8vh)'
            }}
          />
        </div>
        <SiteHeader />
        <div className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
