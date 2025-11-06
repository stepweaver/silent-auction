'use client';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className='max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8'>
      <div className="mb-6">
        <h1 className='text-3xl sm:text-4xl font-bold mb-2'>Terms of Use & Privacy Policy</h1>
        <p className='text-gray-700 text-lg'>
          Please read these terms carefully before participating in the auction.
        </p>
      </div>

      <div className='space-y-8'>
        {/* Bidding Agreement */}
        <section className='rounded-xl border border-gray-200 bg-white p-6'>
          <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
            Bidding Agreement & Terms
          </h2>
          <div className='space-y-4 text-gray-700 leading-relaxed'>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Binding Bids</h3>
              <p>
                By placing a bid, you agree to honor your bid commitment if you are the winning bidder. 
                All bids are final and binding. Once a bid is placed, it cannot be withdrawn or modified 
                except at the sole discretion of the auction administrator.
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Payment Obligation</h3>
              <p>
                Winning bidders are legally obligated to pay the full amount of their winning bid. 
                Payment must be made according to the instructions provided in the winner notification email. 
                Failure to pay may result in legal action to recover the bid amount.
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Item Condition & Descriptions</h3>
              <p>
                All items are sold "as is" without warranty of any kind, express or implied. 
                Item descriptions and photos are provided for informational purposes only. 
                The auction organizer makes no representations or warranties regarding the condition, 
                quality, or fitness for a particular purpose of any item.
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Auction Disputes</h3>
              <p>
                In the event of any dispute regarding bids, winners, or items, the decision of the 
                auction administrator is final. The auction administrator reserves the right to reject 
                any bid, cancel any item, or modify auction rules at any time.
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Limitation of Liability</h3>
              <p>
                The auction organizer, its agents, and volunteers shall not be liable for any direct, 
                indirect, incidental, special, or consequential damages arising from participation in 
                this auction, including but not limited to errors in bidding, technical failures, or 
                issues with item delivery or condition.
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Refund Policy</h3>
              <p>
                All sales are final. No refunds or exchanges will be provided except at the sole 
                discretion of the auction administrator. If an item is unavailable or cannot be 
                delivered as described, the auction administrator may, at their discretion, offer 
                a refund or alternative resolution.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Policy */}
        <section className='rounded-xl border border-gray-200 bg-white p-6'>
          <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
            Privacy Policy
          </h2>
          <div className='space-y-4 text-gray-700 leading-relaxed'>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Data Collection</h3>
              <p>
                We only collect your name and email address for the sole purpose of managing your bids 
                and sending bid confirmations and winner notifications. This is not an account creation—we 
                simply need this information to track your bids and contact you about auction results.
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>How We Use Your Information</h3>
              <ul className='list-disc list-inside ml-4 space-y-1'>
                <li>To send bid confirmation emails when you place a bid</li>
                <li>To notify you if you win an item</li>
                <li>To track your bids and display them on your dashboard</li>
                <li>To display your anonymous alias (color + emoji/icon) on public bid lists</li>
                <li>To contact you regarding auction-related matters</li>
              </ul>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Data Storage & Security</h3>
              <p>
                Your name and email are stored securely using industry-standard security practices. 
                Your information is only accessible to auction administrators for the purpose of managing 
                the auction and contacting winners. We use secure, encrypted connections (HTTPS) for all 
                data transmission.
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Data Sharing</h3>
              <p>
                Your information will not be sold, shared with third parties, or used for any purpose 
                beyond this auction. We do not share your personal information except as required by law 
                or as necessary to fulfill your winning bid obligations (e.g., providing your contact 
                information to item donors for pickup arrangements).
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Data Retention</h3>
              <p>
                Your information will be retained for the duration of the auction and for a reasonable 
                period thereafter to facilitate payment, pickup, and any necessary follow-up communications. 
                After the auction concludes and all obligations are fulfilled, we may retain minimal 
                records as required for accounting or legal purposes.
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Your Rights</h3>
              <p>
                You have the right to request access to your personal information, request corrections, 
                or request deletion of your information (subject to our legal obligations to retain 
                certain records). To exercise these rights, contact the auction administrator using the 
                contact information provided in winner notifications.
              </p>
            </div>
          </div>
        </section>

        {/* Contact & Questions */}
        <section className='rounded-xl border border-gray-200 bg-white p-6'>
          <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
            Questions or Concerns?
          </h2>
          <p className='text-gray-700 leading-relaxed'>
            If you have any questions about these terms, our privacy practices, or the auction in general, 
            please contact the auction administrator using the contact information provided in winner 
            notification emails or on the auction website.
          </p>
        </section>

        {/* Back to Catalog */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold text-white hover:opacity-90 transition-opacity shadow-lg"
            style={{ backgroundColor: '#00b140' }}
          >
            <span>←</span>
            <span>Back to Catalog</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

