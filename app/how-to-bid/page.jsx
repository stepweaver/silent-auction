export default function HowToBidPage() {
  return (
    <main className='max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
      <h1 className='text-2xl sm:text-3xl font-semibold'>How to bid</h1>
      <p className='mt-2 text-gray-700'>
        Bidding is simple and fast—no account required. You'll need to provide
        your name and email for bid confirmations and winner notifications only.
      </p>
      <ol className='mt-6 list-decimal list-inside space-y-3 text-gray-800'>
        <li>Create your bidding alias (choose a color and animal).</li>
        <li>Open an item from the catalog.</li>
        <li>Enter your bid amount.</li>
        <li>
          Submit. We'll email a confirmation. Monitor your dashboard for live
          updates on items you've bid on.
        </li>
      </ol>
      <div className='mt-6 rounded-2xl border bg-indigo-50 p-4'>
        <p className='text-sm text-indigo-900'>
          Tip: Bids must be at least the displayed minimum. Higher bids help
          your PTO even more!
        </p>
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
