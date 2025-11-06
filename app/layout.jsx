import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BackgroundLogo from '@/components/BackgroundLogo';

export const metadata = {
  title: 'Silent Auction',
  description: 'PTO Silent Auction',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }) {
  return (
    <html lang='en' data-theme='auction' data-scroll-behavior='smooth' className='h-full'>
      <body className='bg-gray-50 min-h-screen flex flex-col relative h-full'>
        <BackgroundLogo />
        <SiteHeader />
        <div className='flex-1 relative z-0 min-w-0 min-h-0 overflow-auto'>
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
