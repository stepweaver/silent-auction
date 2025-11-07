import { supabaseServer } from '@/lib/serverSupabase';
import PrintToolbar from './PrintToolbar';

export const metadata = {
  title: 'Printable QR Codes',
  description:
    'Printable QR codes for each auction item. Generated for on-site signage and bidder access.',
  robots: {
    index: false,
    follow: false,
    noindex: true,
    nofollow: true,
  },
};

export const dynamic = 'force-dynamic';

const getSiteUrl = () => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configured || configured.trim() === '') {
    return 'http://localhost:3000';
  }
  return configured.replace(/\/$/, '');
};

export default async function PrintableQrCodesPage() {
  const supabase = supabaseServer();
  const { data: items, error } = await supabase
    .from('items')
    .select('id, title, slug, description, start_price')
    .order('title', { ascending: true });

  if (error) {
    console.error('Failed to fetch items for QR codes:', error);
    throw new Error('Unable to load items. Please try again later.');
  }

  const siteUrl = getSiteUrl();

  return (
    <div className='bg-white min-h-screen text-gray-900'>
      <style>{`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background: #ffffff !important;
            }
            .qr-page {
              width: 8.5in;
              min-height: 11in;
              margin: 0 auto;
              border: none !important;
              break-after: page;
              page-break-after: always;
            }
            .qr-page:last-of-type {
              break-after: avoid;
              page-break-after: auto;
            }
          }
        `}</style>

      <PrintToolbar />

      <div className='mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:py-10'>
        {items?.length ? (
          items.map((item) => {
            const itemUrl = `${siteUrl}/i/${item.slug}`;
            const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&data=${encodeURIComponent(
              itemUrl,
            )}`;

            return (
              <section
                key={item.id}
                className='qr-page flex min-h-[9.5in] flex-col items-center justify-center gap-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'
              >
                <div className='text-center'>
                  <p className='text-sm font-semibold uppercase tracking-wide text-emerald-600'>Mary Frank Elementary PTO Silent Auction</p>
                  <h2 className='mt-2 text-3xl font-bold text-gray-900 sm:text-4xl'>{item.title}</h2>
                </div>

                <img
                  src={qrSrc}
                  alt={`QR code for ${item.title}`}
                  className='w-full max-w-[6.5in] rounded-xl border border-gray-100 shadow-lg'
                />

                <div className='w-full max-w-2xl text-center text-gray-700'>
                  <p className='text-base font-semibold'>Scan to view item &amp; place bids</p>
                  <p className='mt-1 break-all text-sm text-gray-500'>{itemUrl}</p>
                  {item.start_price && (
                    <p className='mt-3 text-sm text-gray-600'>Starting bid: ${Number(item.start_price).toFixed(2)}</p>
                  )}
                  {item.description && (
                    <p className='mt-2 text-sm leading-relaxed text-gray-600'>{item.description}</p>
                  )}
                </div>
              </section>
            );
          })
        ) : (
          <div className='rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center'>
            <h2 className='text-xl font-semibold text-gray-800'>No items found</h2>
            <p className='mt-2 text-sm text-gray-600'>Add items in the admin dashboard and then reload this page to generate QR codes.</p>
          </div>
        )}
      </div>
    </div>
  );
}

