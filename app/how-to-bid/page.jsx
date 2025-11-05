export default function HowToBidPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-2xl sm:text-3xl font-semibold">How to bid</h1>
      <p className="mt-2 text-gray-700">Bidding is simple and fast—no account required.</p>
      <ol className="mt-6 list-decimal list-inside space-y-3 text-gray-800">
        <li>Open an item from the catalog.</li>
        <li>Enter your name, email, and your bid amount.</li>
        <li>Submit. We’ll email a confirmation and updates if you’re outbid.</li>
      </ol>
      <div className="mt-6 rounded-2xl border bg-indigo-50 p-4">
        <p className="text-sm text-indigo-900">
          Tip: Bids must be at least the displayed minimum. Higher bids help your PTO even more!
        </p>
      </div>
    </main>
  );
}


