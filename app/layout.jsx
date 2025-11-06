import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BackgroundLogo from '@/components/BackgroundLogo';

export const metadata = {
  title: 'Silent Auction',
  description: 'PTO Silent Auction',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="auction" className="h-full">
      <body className="bg-base-300 min-h-screen flex flex-col relative h-full">
        <BackgroundLogo />
        <SiteHeader />
        <div className="flex-1 relative z-0 min-w-0 min-h-0 overflow-auto">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
