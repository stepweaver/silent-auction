'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function TermsPage() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleClearData = () => {
    // Clear all auction-related localStorage data
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auction_bidder_info');
      localStorage.removeItem('auction_enrolled');
      localStorage.removeItem('auction_pending_name');
      localStorage.removeItem('auction_alias_data');
      // Clear any other auction-related items
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('auction_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    setCleared(true);
    setShowConfirm(false);
    // Redirect to landing page after a short delay
    setTimeout(() => {
      router.push('/landing');
    }, 2000);
  };

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
              <h3 className='font-semibold text-gray-900 mb-2'>Payment &amp; Pickup Obligation</h3>
              <p>
                Winning bidders are legally obligated to pay the full amount of their winning bid. Payment must be made using the official payment methods and links provided by the auction administrator, and
                completed within the stated payment window (typically within 24 hours of the auction closing).
              </p>
              <p className='mt-2'>
                <strong>Items may be picked up on Thursday immediately following the close of the auction at 7:30pm in the LGI room across from the gym.</strong> Administrators will confirm payment before releasing items. Unpaid items after the 24-hour window may be offered to the next highest bidder and the original winning bid considered forfeited.
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
                and sending auction-related notifications. This is not an account creation—we 
                simply need this information to track your bids and contact you about auction results.
              </p>
              <p className='mt-2'>
                <strong>Email Preferences:</strong> Bid confirmation emails are optional and require your 
                explicit opt-in. You can enable or disable bid confirmation emails at any time through 
                your dashboard. Winner notifications and other essential emails are sent automatically 
                and cannot be opted out of, as they are required for auction operations.
              </p>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>How We Use Your Information</h3>
              <ul className='list-disc list-inside ml-4 space-y-1'>
                <li>To send bid confirmation emails when you place a bid (opt-in only)</li>
                <li>To notify you if you win an item</li>
                <li>To track your bids and display them on your dashboard</li>
                <li>To display your anonymous alias (color + emoji/icon) on public bid lists</li>
                <li>To contact you regarding auction-related matters</li>
                <li>To send email verification during registration</li>
                <li>To send security alerts if your alias is accessed from a new device or location</li>
              </ul>
            </div>
            <div>
              <h3 className='font-semibold text-gray-900 mb-2'>Email Communications & Opt-In System</h3>
              <p className='mb-3'>
                We use an opt-in email system powered by Resend to send you notifications about your auction activity. 
                You have full control over which emails you receive.
              </p>
              <div className='space-y-3'>
                <div>
                  <h4 className='font-semibold text-gray-900 mb-1'>Opt-In Email Notifications (Bid Confirmations & Outbid Alerts)</h4>
                  <p className='mb-2'>
                    <strong>Bid confirmation and outbid alert emails are optional and require your explicit opt-in.</strong> By default, 
                    these emails are disabled. You can enable or disable them at any time through your 
                    dashboard (accessible via the avatar/profile icon).
                  </p>
                  <ul className='list-disc list-inside ml-4 space-y-1 text-sm'>
                    <li>Bid confirmations are sent only for your <strong>initial bid on each item</strong> (not for subsequent bids on the same item)</li>
                    <li>Outbid alerts are sent when someone outbids you on an item, limited to <strong>at most one per item every 30 minutes</strong> to avoid spam during active bidding</li>
                    <li>Each email includes the item name, current bid amount, and a link to view or bid on the item</li>
                    <li>You can opt-in or opt-out at any time through your dashboard</li>
                    <li>If you opt-out, you can still view all your bids in your dashboard</li>
                  </ul>
                </div>
                <div>
                  <h4 className='font-semibold text-gray-900 mb-1'>Required Email Notifications</h4>
                  <p className='mb-2'>
                    The following emails are sent automatically and cannot be opted out of, as they are essential 
                    for auction operations:
                  </p>
                  <ul className='list-disc list-inside ml-4 space-y-1 text-sm'>
                    <li><strong>Winner Notifications:</strong> Sent automatically when the auction closes if you are a winning bidder. These emails include payment and pickup instructions.</li>
                    <li><strong>Email Verification:</strong> Sent during registration to verify your email address and prevent fraud.</li>
                    <li><strong>Security Alerts:</strong> Sent if your alias is accessed from a new device or location to help protect your account.</li>
                  </ul>
                </div>
                <div>
                  <h4 className='font-semibold text-gray-900 mb-1'>Managing Your Email Preferences</h4>
                  <p className='mb-2'>
                    You can manage your email preferences at any time by:
                  </p>
                  <ul className='list-disc list-inside ml-4 space-y-1 text-sm'>
                    <li>Accessing your dashboard (click the avatar/profile icon)</li>
                    <li>Using the "Email Preferences" section to enable or disable bid confirmations and outbid alerts</li>
                    <li>Your preference is saved immediately and applies to all future bids</li>
                  </ul>
                </div>
                <div>
                  <h4 className='font-semibold text-gray-900 mb-1'>Email Service Provider</h4>
                  <p className='text-sm'>
                    We use Resend (resend.com) as our email service provider to deliver emails securely and reliably. 
                    Resend is a trusted email delivery service that complies with industry standards for email security 
                    and deliverability. Your email address is shared with Resend solely for the purpose of sending you 
                    auction-related emails.
                  </p>
                </div>
              </div>
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

        {/* Clear My Data */}
        <section className='rounded-xl border border-red-200 bg-red-50 p-6'>
          <h2 className='text-2xl font-semibold text-red-900 mb-4'>
            Clear My Local Data
          </h2>
          <p className='text-red-700 leading-relaxed mb-4'>
            This will clear your bidding alias and enrollment data from this device. You will need to 
            re-verify your email to bid again. <strong>Note:</strong> This does not delete your bids or 
            account from our servers—it only clears your local session.
          </p>
          {cleared ? (
            <div className='p-4 bg-green-100 border border-green-300 rounded-lg text-green-800'>
              ✓ Local data cleared! Redirecting to registration...
            </div>
          ) : showConfirm ? (
            <div className='flex flex-col sm:flex-row gap-3'>
              <button
                onClick={handleClearData}
                className='px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium'
              >
                Yes, Clear My Data
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className='px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium'
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className='px-6 py-2 bg-red-100 text-red-700 border border-red-300 rounded-lg hover:bg-red-200 font-medium'
            >
              Clear Local Data
            </button>
          )}
        </section>

        {/* Back to Catalog */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold text-white hover:opacity-90 transition-opacity shadow-lg"
            style={{ backgroundColor: 'var(--primary-500)' }}
          >
            <span>←</span>
            <span>Back to Catalog</span>
          </Link>
        </div>
      </div>
    </main>
  );
}

