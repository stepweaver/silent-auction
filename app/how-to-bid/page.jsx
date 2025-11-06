'use client';

import Link from 'next/link';

export default function HowToBidPage() {
  return (
    <main className='max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
      <div className="mb-6">
        <h1 className='text-2xl sm:text-3xl font-semibold mb-2'>How to Bid</h1>
        <p className='text-gray-700'>
          Bidding is simple and fast. You'll need to provide
          your name and email for bid confirmations and winner notifications only.
        </p>
      </div>

      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-base font-semibold text-white hover:opacity-90 transition-opacity shadow-lg"
          style={{ backgroundColor: '#00b140' }}
        >
          <span>🛍️</span>
          <span>Browse Catalog</span>
        </Link>
      </div>

      <ol className='mt-6 list-decimal list-inside space-y-4 text-gray-800'>
        <li className="pl-2">
          <strong>Create your bidding alias</strong> - Choose a color and emoji to represent you anonymously. This is how others will see your bids.
        </li>
        <li className="pl-2">
          <strong>Browse the catalog</strong> - Explore all available items with photos, descriptions, and current bid amounts.
        </li>
        <li className="pl-2">
          <strong>Open an item</strong> - Click on any item to see details and place a bid.
        </li>
        <li className="pl-2">
          <strong>Enter your bid amount</strong> - Your bid must be at least the minimum shown. Higher bids help your PTO even more!
        </li>
        <li className="pl-2">
          <strong>Submit your bid</strong> - We'll email you a confirmation. Monitor your dashboard for live updates on items you've bid on.
        </li>
      </ol>

      <div className='mt-6 rounded-xl border-2 p-5' style={{ backgroundColor: 'rgba(0, 177, 64, 0.05)', borderColor: 'rgba(0, 177, 64, 0.2)' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className='font-semibold text-gray-900 mb-1'>Pro Tips:</p>
            <ul className='text-sm text-gray-700 space-y-1 list-disc list-inside'>
              <li>Bids must be at least the displayed minimum amount</li>
              <li>Check your dashboard regularly to see if you've been outbid</li>
              <li>You can increase your bid at any time before the auction closes</li>
              <li>Winners will receive payment and pickup instructions via email</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legal Disclaimer & Usage Policy */}
      <div className='mt-8 rounded-xl border border-gray-200 bg-white p-6'>
        <h2 className='text-lg font-semibold text-gray-900 mb-3'>
          Privacy & Usage Policy
        </h2>
        <div className='space-y-3 text-sm text-gray-700 leading-relaxed'>
          <p>
            <strong>Data Collection:</strong> We only collect your name and
            email address for the sole purpose of managing your bids and sending
            bid confirmations and winner notifications. This is not an account
            creation—we simply need this information to track your bids and
            contact you about auction results.
          </p>
          <p>
            <strong>How We Use Your Information:</strong>
          </p>
          <ul className='list-disc list-inside ml-4 space-y-1'>
            <li>To send bid confirmation emails when you place a bid</li>
            <li>To notify you if you win an item</li>
            <li>To track your bids and display them on your dashboard</li>
            <li>
              To display your anonymous alias (color + animal) on public bid
              lists
            </li>
          </ul>
          <p>
            <strong>Data Storage:</strong> Your name and email are stored
            securely and are only accessible to auction administrators for the
            purpose of managing the auction and contacting winners. Your
            information will not be sold, shared, or used for any other purpose
            beyond this auction.
          </p>
          <p>
            <strong>Bidding Agreement:</strong> By placing a bid, you agree to
            honor your bid commitment if you are the winning bidder. All bids
            are final and binding. Payment and pickup instructions will be
            provided to winners via email.
          </p>
          <p className='text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200'>
            Questions about our privacy practices? Contact the auction
            administrator using the contact information provided on winning bid
            notifications.
          </p>
        </div>
      </div>
    </main>
  );
}
