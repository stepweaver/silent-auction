/**
 * Notification service for bid confirmations, winner notifications, and related emails
 * Email via Resend (required)
 */

import { logError, logWarn, logInfo, maskEmail, maskPhone } from '@/lib/logger';

// Shared helpers for email rendering
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function money(amount, fallback = '0.00') {
  const num = Number(amount);
  return Number.isFinite(num) ? num.toFixed(2) : fallback;
}

function renderLogo(logoUrl, { alt = 'Mary Frank PTO' } = {}) {
  if (!logoUrl) return '';
  return `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="${escapeHtml(
    alt,
  )}" style="max-height:48px"/></div>`;
}

function renderFooter({ contactEmail }) {
  const attribution =
    'Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.';
  return `
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        ${attribution}
        ${
          contactEmail
            ? `<br/>Questions? Contact <a href="mailto:${contactEmail}">${contactEmail}</a>.`
            : ''
        }
      </p>
    `;
}

function renderPreheader(text) {
  if (!text) return '';
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(
    text,
  )}</div>`;
}

// Normalize phone number to E.164 format for Plivo
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');

  // If it starts with 1 and has 11 digits, it's US format
  if (digits.length === 11 && digits[0] === '1') {
    return `+${digits}`;
  }

  // If it has 10 digits, assume US and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // Otherwise, add + and return
  return `+${digits}`;
}

// Send email via Resend
// Exported for use in opt-in rate monitoring
export async function sendEmail(to, subject, html, { fromName, replyTo, text } = {}) {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    logError('RESEND_API_KEY not set — cannot send email', { to: maskEmail(to) });
    return false;
  }

  try {
    let Resend;
    try {
      const resendModule = await import('resend');
      Resend = resendModule.Resend;
    } catch (importError) {
      logWarn('Resend package not found. Install with: npm install resend');
      return false;
    }

    const resend = new Resend(resendApiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'auction@example.com';

    const fromHeader = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

    const { data, error } = await resend.emails.send({
      from: fromHeader,
      to: [to],
      subject,
      html,
      text: text || undefined,
      reply_to: replyTo ? [replyTo] : undefined,
      headers: {
        Importance: 'high',
        'X-Priority': '1 (High)',
        'X-MSMail-Priority': 'High',
      },
    });

    if (error) {
      logError('Resend email error', { error: JSON.stringify(error), to: maskEmail(to), subject });
      return false;
    }

    logInfo('Email sent successfully via Resend', { id: data?.id, to: maskEmail(to) });
    return true;
  } catch (error) {
    logError('Email notification error', { error, to: maskEmail(to), subject });
    return false;
  }
}

// Send bid confirmation email
export async function sendBidConfirmation({ email, bidderName, itemTitle, bidAmount, itemUrl, contactEmail }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const safeName = escapeHtml(bidderName || 'there');
  const safeTitle = escapeHtml(itemTitle || 'your item');
  const preheader = `We’ve received your bid on “${itemTitle || 'your item'}”. You can increase it any time before close.`;
  const amountDisplay = money(bidAmount);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
      ${renderPreheader(preheader)}
      ${renderLogo(logoUrl)}
      <h2 style="color: #047857; margin-bottom: 8px;">Bid received 🎉</h2>
      <p style="margin-top: 0; font-size: 15px; line-height: 1.5;">Hi ${safeName},</p>
      <p style="font-size: 15px; line-height: 1.5;">Thank you so much for placing a bid in the Mary Frank PTO Silent Auction. Because of your generosity, our students and staff at Mary Frank Elementary will directly benefit.</p>
      <p style="font-size: 14px; line-height: 1.5;"><strong>Item:</strong> ${safeTitle}</p>
      <p style="font-size: 18px; font-weight: bold; color: #047857;">
        Your bid: $${amountDisplay}
      </p>
      <p style="font-size: 14px; line-height: 1.5; margin-top: 12px;">
        You can increase your bid any time before this item closes. You can always check your status on the item page or in your dashboard to see whether you&apos;re still the high bidder.
      </p>
      <p>
        <a href="${itemUrl}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          View item
        </a>
      </p>
      ${
        contactEmail
          ? `<p style="margin-top: 20px; font-size: 14px; color: #555;">If you did not place this bid, please contact the auction administrators immediately at <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>`
          : ''
      }
      ${renderFooter({ contactEmail })}
    </div>
  `;

  const text = [
    `Bid received for "${itemTitle}"`,
    '',
    `Hi ${bidderName || 'there'},`,
    '',
    'Thank you so much for placing a bid in the Mary Frank PTO Silent Auction. Because of your generosity, our students and staff at Mary Frank Elementary will directly benefit.',
    `Item: ${itemTitle}`,
    `Your bid: $${amountDisplay}`,
    '',
    'You can increase your bid any time before this item closes. You can always check your status on the item page or in your dashboard to see whether you\'re still the high bidder.',
    '',
    `View item: ${itemUrl}`,
    contactEmail
      ? `\nIf you did not place this bid, contact the auction administrators immediately at ${contactEmail}.`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  return sendEmail(email, `✅ Bid received: ${itemTitle}`, html, { fromName, replyTo, text });
}

// Send outbid notification email (opt-in, throttled to 1 per 30 min per item)
export async function sendOutbidEmail({ email, bidderName, itemTitle, newHighBid, itemUrl, contactEmail }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const safeName = escapeHtml(bidderName || 'there');
  const safeTitle = escapeHtml(itemTitle || 'your item');
  const preheader = `You've been outbid on "${itemTitle || 'your item'}". Current bid: $${money(newHighBid)}.`;
  const amountDisplay = money(newHighBid);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
      ${renderPreheader(preheader)}
      ${renderLogo(logoUrl)}
      <h2 style="color: #b45309; margin-bottom: 8px;">You've been outbid</h2>
      <p style="margin-top: 0; font-size: 15px; line-height: 1.5;">Hi ${safeName},</p>
      <p style="font-size: 15px; line-height: 1.5;">Someone has placed a higher bid on an item you were bidding on in the Mary Frank PTO Silent Auction.</p>
      <p style="font-size: 14px; line-height: 1.5;"><strong>Item:</strong> ${safeTitle}</p>
      <p style="font-size: 18px; font-weight: bold; color: #b45309;">
        Current high bid: $${amountDisplay}
      </p>
      <p style="font-size: 14px; line-height: 1.5; margin-top: 12px;">
        You can increase your bid any time before this item closes. Visit the item page or your dashboard to place a new bid.
      </p>
      <p>
        <a href="${itemUrl}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Place a higher bid
        </a>
      </p>
      ${renderFooter({ contactEmail })}
    </div>
  `;

  const text = [
    `You've been outbid on "${itemTitle}"`,
    '',
    `Hi ${bidderName || 'there'},`,
    '',
    'Someone has placed a higher bid on an item you were bidding on in the Mary Frank PTO Silent Auction.',
    `Item: ${itemTitle}`,
    `Current high bid: $${amountDisplay}`,
    '',
    'You can increase your bid any time before this item closes. Visit the item page or your dashboard to place a new bid.',
    '',
    `Place a higher bid: ${itemUrl}`,
  ].join('\n');

  return sendEmail(email, `You've been outbid: ${itemTitle}`, html, { fromName, replyTo, text });
}

// Send winner notification email
export async function sendWinnerNotification({
  email,
  bidderName,
  itemTitle,
  winningBid,
  paymentInstructions,
  pickupInstructions,
  pickupContact,
  contactEmail,
  itemUrl,
  paymentInstructionsUrl,
}) {
  return sendWinnerDigest({
    email,
    bidderName,
    items: [
      {
        itemTitle,
        winningBid,
        itemUrl,
      },
    ],
    paymentInstructions,
    pickupInstructions,
    pickupContact,
    contactEmail,
    paymentInstructionsUrl,
  });
}

export async function sendWinnerDigest({
  email,
  bidderName,
  items,
  paymentInstructions,
  pickupInstructions,
  pickupContact,
  contactEmail,
  paymentInstructionsUrl,
}) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const safeItems = Array.isArray(items) ? items.filter((item) => item && item.itemTitle) : [];

  if (safeItems.length === 0) {
    logWarn('sendWinnerDigest called with no items');
    return false;
  }

  const totalAmount = safeItems.reduce((sum, item) => sum + Number(item.winningBid || 0), 0);
  const recipientName = bidderName ? escapeHtml(bidderName) : 'there';
  const preheader = `Thank you for supporting Mary Frank PTO — here’s a summary of the item${
    safeItems.length > 1 ? 's' : ''
  } you won.`;
  const itemBulletsHtml = safeItems
    .map(
      (item) =>
        `<li style="margin-bottom: 6px;">${escapeHtml(item.itemTitle)} – $${money(item.winningBid)}</li>`,
    )
    .join('');

  const paymentSection =
    paymentInstructionsUrl
      ? `<p style="margin: 0 0 8px 0;">Please complete your payment online using this link: <a href="${paymentInstructionsUrl}" style="color: #047857; font-weight: 600;">${paymentInstructionsUrl}</a></p>
        <p style="margin: 0;">Payment is required within 24 hours of the auction closing and must be completed prior to item pickup.</p>`
      : paymentInstructions
        ? `<p style="margin: 0 0 8px 0;">${paymentInstructions}</p>
          <p style="margin: 0;">Payment is required within 24 hours of the auction closing and must be completed prior to item pickup.</p>`
        : `<p style="margin: 0;">Please complete your payment within 24 hours of the auction closing and before picking up your item${safeItems.length > 1 ? 's' : ''}. Payment is required prior to item pickup.</p>`;

  const pickupContactLine = pickupContact
    ? `If you are not able to come and pick up your item${safeItems.length > 1 ? 's' : ''} at the close of the auction please contact ${pickupContact}.`
    : contactEmail
      ? `If you are not able to come and pick up your item${safeItems.length > 1 ? 's' : ''} at the close of the auction please contact <a href="mailto:${contactEmail}" style="color: #047857;">${contactEmail}</a>.`
      : `If you are not able to come and pick up your item${safeItems.length > 1 ? 's' : ''} at the close of the auction please contact the auction administrators.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1f2937;">
      ${renderPreheader(preheader)}
      ${renderLogo(logoUrl)}
      <p style="margin-top: 0; font-size: 15px; line-height: 1.5;">Hi ${recipientName},</p>
      <p style="font-size: 16px; font-weight: 600; color: #047857; margin-bottom: 16px;">Congratulations, you're a winner! 🎉</p>
      <p style="font-size: 15px; line-height: 1.5;">
        Thank you so much for supporting Mary Frank PTO. Because of your generosity, our students and staff will directly benefit from the funds raised through this auction. We are truly grateful for your support.
      </p>
      <p style="font-size: 15px; line-height: 1.5; margin-bottom: 8px;">Here are the items you won:</p>
      <ul style="font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; padding-left: 24px;">
        ${itemBulletsHtml}
      </ul>
      <p style="font-size: 16px; font-weight: bold; margin: 20px 0;">Total Amount Due: $${money(totalAmount)}</p>
      <p style="font-size: 15px; font-weight: 600; margin: 24px 0 8px 0;">Payment:</p>
      <div style="margin-bottom: 20px;">
        ${paymentSection}
      </div>
      <p style="font-size: 15px; font-weight: 600; margin: 24px 0 8px 0;">Item Pickup:</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px 0;">${
        pickupInstructions
          ? pickupInstructions
          : 'Items may be picked up at the time and location specified by the auction organizers.'
      }</p>
      <p style="font-size: 14px; color: #4b5563; margin: 0 0 16px 0;">
        Please note: administrators will confirm payment before releasing items. Unpaid items after the 24-hour window may be offered to the next highest bidder.
      </p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0 0 24px 0;">${pickupContactLine}</p>
      <p style="font-size: 15px; line-height: 1.5; margin: 0;">We cannot thank you enough for supporting Mary Frank Elementary.</p>
      ${renderFooter({ contactEmail })}
    </div>
  `;

  const itemLines = safeItems
    .map((item) => `• ${item.itemTitle} – $${money(item.winningBid)}`)
    .join('\n');

  const paymentText = paymentInstructionsUrl
    ? `Please complete your payment online using this link: ${paymentInstructionsUrl}\n\nPayment is required within 24 hours of the auction closing and must be completed prior to item pickup.`
    : paymentInstructions
      ? `${paymentInstructions}\n\nPayment is required within 24 hours of the auction closing and must be completed prior to item pickup.`
      : `Please complete your payment within 24 hours of the auction closing and before picking up your item${safeItems.length > 1 ? 's' : ''}. Payment is required prior to item pickup.`;

  const pickupContactText = pickupContact
    ? `If you are not able to come and pick up your item${safeItems.length > 1 ? 's' : ''} at the close of the auction please contact ${pickupContact}.`
    : contactEmail
      ? `If you are not able to come and pick up your item${safeItems.length > 1 ? 's' : ''} at the close of the auction please contact ${contactEmail}.`
      : `If you are not able to come and pick up your item${safeItems.length > 1 ? 's' : ''} at the close of the auction please contact the auction administrators.`;

  const text = `Hi ${bidderName || 'there'},

Congratulations, you're a winner! 🎉

Thank you so much for supporting Mary Frank PTO. Because of your generosity, our students and staff will directly benefit from the funds raised through this auction. We are truly grateful for your support.

Here are the items you won:

${itemLines}

Total Amount Due: $${money(totalAmount)}

Payment:
${paymentText}

Item Pickup:
${pickupInstructions || 'Items may be picked up at the time and location specified by the auction organizers.'}

Please note: administrators will confirm payment before releasing items. Unpaid items after the 24-hour window may be offered to the next highest bidder.

${pickupContactText}

We cannot thank you enough for supporting Mary Frank Elementary.`;

  const subjectItems = safeItems.length === 1 ? safeItems[0].itemTitle : `${safeItems.length} items`;
  return sendEmail(email, `🎉 You won: ${subjectItems}`, html, { fromName, replyTo, text });
}

// Send admin email with list of all winners and donation summary
export async function sendAdminWinnersList({
  adminEmails,
  winners,
  contactEmail,
  donationsCount = 0,
  donationsTotal = 0,
  auctionClosedAt,
}) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;

  if (!adminEmails || adminEmails.length === 0) {
    logWarn('No admin emails provided for winners list');
    return false;
  }

  if (!winners || winners.length === 0) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${renderLogo(logoUrl)}
        <h2 style="color: #333;">Auction Closed - No Winners</h2>
        <p>The auction has been closed, but there were no winning bids.</p>
        ${
          auctionClosedAt
            ? `<p style="margin-top: 12px; font-size: 13px; color: #6b7280;">Closed at: ${auctionClosedAt}</p>`
            : ''
        }
        ${renderFooter({ contactEmail })}
      </div>
    `;

    const text = `Auction Closed - No Winners\n\nThe auction has been closed, but there were no winning bids.`;

    // Send to all admin emails
    const emailPromises = adminEmails.map(email => 
      sendEmail(email, 'Auction Closed - No Winners', html, { fromName, replyTo, text })
    );
    
    await Promise.all(emailPromises);
    return true;
  }

  // Build winners list HTML
  const winnersListHtml = winners.map((winner, index) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px; text-align: left;">${index + 1}</td>
      <td style="padding: 12px; text-align: left;">${escapeHtml(winner.itemTitle || 'N/A')}</td>
      <td style="padding: 12px; text-align: left;">${escapeHtml(winner.bidderName || 'N/A')}</td>
      <td style="padding: 12px; text-align: left;"><a href="mailto:${winner.email}">${winner.email}</a></td>
      <td style="padding: 12px; text-align: right;">$${money(winner.winningBid)}</td>
    </tr>
  `).join('');

  const totalAmount = winners.reduce((sum, winner) => sum + Number(winner.winningBid), 0);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      ${renderLogo(logoUrl)}
      <h2 style="color: #333;">Auction Closed - Winners List</h2>
      <p>The auction has been closed. Below is the complete list of winners:</p>
      ${
        auctionClosedAt
          ? `<p style="margin-top: 4px; font-size: 13px; color: #6b7280;">Closed at: ${auctionClosedAt}</p>`
          : ''
      }
      
      <div style="margin: 24px 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e5e7eb; border-radius: 8px;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #d1d5db;">#</th>
              <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #d1d5db;">Item</th>
              <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #d1d5db;">Winner Name</th>
              <th style="padding: 12px; text-align: left; font-weight: bold; border-bottom: 2px solid #d1d5db;">Email</th>
              <th style="padding: 12px; text-align: right; font-weight: bold; border-bottom: 2px solid #d1d5db;">Winning Bid</th>
            </tr>
          </thead>
          <tbody>
            ${winnersListHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f9fafb; font-weight: bold;">
              <td colspan="4" style="padding: 12px; text-align: right; border-top: 2px solid #d1d5db;">Total:</td>
              <td style="padding: 12px; text-align: right; border-top: 2px solid #d1d5db;">$${money(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <p style="margin-top: 20px; font-size: 14px; color: #555;">
        <strong>Total Winners:</strong> ${winners.length}<br/>
        <strong>Total Winning Bids:</strong> $${money(totalAmount)}
      </p>
      ${donationsCount > 0 ? `
      <div style="margin-top: 24px; padding: 16px; background: #ecfdf5; border-radius: 8px; border: 1px solid #d1fae5;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #047857;">Donation Pledges</h3>
        <p style="margin: 0; font-size: 14px; color: #555;">
          <strong>Total Pledges:</strong> ${donationsCount}<br/>
          <strong>Total Pledged:</strong> $${money(donationsTotal)}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #555;">
          <strong>Grand Total (bids + donations):</strong> $${money(totalAmount + donationsTotal)}
        </p>
      </div>
      ` : ''}
      
      ${renderFooter({ contactEmail })}
    </div>
  `;

  // Build text version
  const winnersListText = winners.map((winner, index) => 
    `${index + 1}. ${winner.itemTitle || 'N/A'} - ${winner.bidderName || 'N/A'} (${winner.email}) - $${money(winner.winningBid)}`
  ).join('\n');

  const donationText = donationsCount > 0
    ? `\n\nDonation Pledges: ${donationsCount}\nTotal Pledged: $${money(donationsTotal)}\nGrand Total (bids + donations): $${money(totalAmount + donationsTotal)}`
    : '';

  const text = `Auction Closed - Winners List\n\nThe auction has been closed. Below is the complete list of winners:\n\n${winnersListText}\n\nTotal Winners: ${winners.length}\nTotal Winning Bids: $${totalAmount.toFixed(2)}${donationText}`;

  // Send to all admin emails
  const emailPromises = adminEmails.map(email => 
    sendEmail(email, `Auction Closed - ${winners.length} Winner${winners.length !== 1 ? 's' : ''}`, html, { fromName, replyTo, text })
  );
  
  await Promise.all(emailPromises);
  return true;
}

// Send donation pledge confirmation email
export async function sendDonationConfirmation({
  email,
  donorName,
  amount,
  message,
  contactEmail,
  donationPaymentUrl,
}) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const safeName = escapeHtml(donorName || 'there');
  const safeMsg = message ? escapeHtml(message) : '';
  const amountDisplay = money(amount);

  const preheader = `Thank you for supporting Mary Frank PTO — pledge received for $${amountDisplay}.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937;">
      ${renderPreheader(preheader)}
      ${renderLogo(logoUrl)}

      <h2 style="color: #047857; margin-bottom: 8px;">Thank you, ${safeName}! 💚</h2>

      <p style="margin-top: 0; font-size: 15px; line-height: 1.5;">
        We just received your donation pledge, and it truly means a lot. Because of your generosity, our students and staff at Mary Frank Elementary will directly benefit. We are truly grateful for your support.
      </p>
      <p style="font-size: 15px; line-height: 1.5;">
        We cannot thank you enough for supporting Mary Frank Elementary.
      </p>

      <div style="margin: 16px 0; padding: 16px; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 12px;">
        <div style="font-size: 13px; color: #065f46; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px;">
          Donation pledge received
        </div>
        <div style="font-size: 22px; font-weight: 800; color: #047857;">
          $${amountDisplay}
        </div>
      </div>

      ${
        safeMsg
          ? `<div style="margin-top: 12px; padding: 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; color: #374151;">
              <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin-bottom: 6px;">Your note</div>
              <div style="font-style: italic;">“${safeMsg}”</div>
            </div>`
          : ''
      }

      ${
        donationPaymentUrl
          ? `<div style="margin: 20px 0; padding: 16px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #1e40af;">
                <strong>To complete your donation:</strong> Use the link below to pay your pledge online. You will see two options on the page — choose <strong>Donation to Mary Frank Silent Auction</strong> and click <strong>Enter Amount</strong> (do not use the “Silent Auction Item Payment” option; that is for winning bidders).
              </p>
              <a href="${donationPaymentUrl}" style="display: inline-block; padding: 12px 18px; background: #047857; color: white; text-decoration: none; border-radius: 10px; font-weight: 700; margin-top: 8px;">
                Pay your pledge online
              </a>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #64748b;">
                If you prefer to pay another way, the auction team can provide alternative payment details.
              </p>
            </div>`
          : `<div style="margin: 20px 0; padding: 16px; background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px;">
              <p style="margin: 0; font-size: 14px; color: #1e40af;">
                The auction team will follow up with instructions on how to pay your pledge. If you have questions before then, contact us using the email below.
              </p>
            </div>`
      }

      <p style="font-size: 14px; color: #4b5563; margin-top: 18px;">
        With gratitude,<br/>
        <strong>Mary Frank PTO</strong>
      </p>

      ${
        contactEmail
          ? `<p style="margin-top: 8px; font-size: 14px; color: #555;">Questions? Contact us at <a href="mailto:${contactEmail}" style="color:#047857;">${contactEmail}</a>.</p>`
          : ''
      }

      ${renderFooter({ contactEmail })}
    </div>
  `;

  const textLines = [
    `Thank you, ${donorName || 'there'}!`,
    '',
    'We received your donation pledge — and we genuinely appreciate it.',
    'Because of your generosity, our students and staff at Mary Frank Elementary will directly benefit. We are truly grateful for your support.',
    'We cannot thank you enough for supporting Mary Frank Elementary.',
    '',
    `Pledge amount: $${amountDisplay}`,
  ];

  if (message) textLines.push('', `Your note: "${message}"`);

  if (donationPaymentUrl) {
    textLines.push(
      '',
      'To complete your donation: Use the link below to pay your pledge online. On the page you will see two options. Choose "Donation to Mary Frank Silent Auction" and click "Enter Amount" — do not use the "Silent Auction Item Payment" option (that is for winning bidders).',
      '',
      donationPaymentUrl,
      '',
      'If you prefer to pay another way, the auction team can provide alternative payment details.',
    );
  } else {
    textLines.push(
      '',
      'The auction team will follow up with instructions on how to pay your pledge. If you have questions before then, contact us using the email below.',
    );
  }

  if (contactEmail) textLines.push('', `Questions? Contact ${contactEmail}`);

  textLines.push('', 'With gratitude,', 'Mary Frank PTO');

  const text = textLines.join('\n');

  return sendEmail(
    email,
    `💚 Thank you for your donation pledge — $${amountDisplay}`,
    html,
    { fromName, replyTo, text },
  );
}

// Send donor payment instructions email (sent when auction closes)
export async function sendDonorPaymentDigest({ email, donorName, donations, paymentInstructions, contactEmail, paymentInstructionsUrl }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const safeDonations = Array.isArray(donations) ? donations.filter((d) => d && d.amount) : [];

  if (safeDonations.length === 0) {
    logWarn('sendDonorPaymentDigest called with no donations');
    return false;
  }

  const totalAmount = safeDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);
  const safeName = donorName ? escapeHtml(donorName) : '';
  const preheader = `Thank you for your donation pledge${
    safeDonations.length > 1 ? 's' : ''
  } — total $${money(totalAmount)}.`;

  const donationRowsHtml = safeDonations
    .map(
      (d) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: left;">Donation Pledge</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; color: #047857;">
            $${money(d.amount)}
          </td>
          <td style="padding: 12px; text-align: left; font-size: 13px; color: #6b7280;">
            ${d.message ? `“${escapeHtml(d.message)}”` : ''}
          </td>
        </tr>
      `
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1f2937;">
      ${renderPreheader(preheader)}
      ${renderLogo(logoUrl)}
      <h2 style="color: #047857; margin-bottom: 8px;">Thank you for your donation${
        safeName ? `, ${safeName}` : ''
      }! 💚</h2>
      <p style="font-size: 15px; line-height: 1.5;">
        The auction has closed. Thank you again for your generous donation pledge${
          safeDonations.length > 1 ? 's' : ''
        } — your support directly benefits Mary Frank students and staff.
      </p>
      <div style="margin: 20px 0; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: #eff6ff;">
            <tr>
              <th style="padding: 12px; text-align: left; font-size: 13px; color: #1f2937;">Type</th>
              <th style="padding: 12px; text-align: right; font-size: 13px; color: #1f2937;">Amount</th>
              <th style="padding: 12px; text-align: left; font-size: 13px; color: #1f2937;">Note</th>
            </tr>
          </thead>
          <tbody>
            ${donationRowsHtml}
          </tbody>
          <tfoot style="background: #f3f4f6;">
            <tr>
              <td style="padding: 12px; text-align: right; font-weight: bold;" colspan="1">Total Due:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; color: #047857;">$${money(totalAmount)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="margin: 24px 0; padding: 20px; background: #ecfdf5; border-radius: 12px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #047857;">Payment Instructions</h3>
        ${paymentInstructions ? `<p style="margin: 0 0 12px 0;"><strong>Payment:</strong> ${paymentInstructions}</p>` : '<p style="margin: 0;">Payment instructions will be provided by the auction administrators.</p>'}
        ${paymentInstructionsUrl ? `<p style="margin: 16px 0 0 0;"><a href="${paymentInstructionsUrl}" style="display: inline-block; padding: 12px 20px; background: #047857; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">View Payment Instructions</a></p><p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563;">On that page, click <strong>Donation to Mary Frank Silent Auction</strong> (Enter Amount) to complete your donation.</p>` : ''}
      </div>
      <p style="font-size: 14px; color: #4b5563;">If you have any questions, ${contactEmail ? `please contact us at <a href="mailto:${contactEmail}" style="color: #047857;">${contactEmail}</a>.` : 'please reach out to the auction administrators.'}</p>
      ${renderFooter({ contactEmail })}
    </div>
  `;
  return true; // No-op: donor payment digest removed; only pledge confirmation is sent.
}

// Send SMS notification via Plivo
async function sendSMSNotification(to, itemTitle, currentBid, itemUrl) {
  const plivoAuthId = process.env.PLIVO_AUTH_ID;
  const plivoAuthToken = process.env.PLIVO_AUTH_TOKEN;
  const plivoFromNumber = process.env.PLIVO_FROM_NUMBER;

  if (!plivoAuthId || !plivoAuthToken || !plivoFromNumber) {
    logWarn('Plivo credentials not set, skipping SMS notification');
    return false;
  }

  try {
    let plivo;
    try {
      // Dynamically construct module name to prevent static analysis
      // Use array join to create the string at runtime
      const chars = String.fromCharCode(112, 108, 105, 118, 111); // 'plivo'
      // Use Function constructor to create import that can't be statically analyzed
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      plivo = await dynamicImport(chars);
    } catch (importError) {
      logWarn('Plivo package not found. Install with: npm install plivo');
      return false;
    }

    const client = new plivo.default.Client(plivoAuthId, plivoAuthToken);
    const phoneNumber = normalizePhone(to);

    const message = `You've been outbid on "${itemTitle}". Current bid: $${Number(currentBid).toFixed(2)}. Bid again: ${itemUrl}`;

    const result = await client.messages.create({
      src: plivoFromNumber,
      dst: phoneNumber,
      text: message,
    });

    if (result.messageUuid) {
      logInfo('SMS sent', { to: maskPhone(phoneNumber), messageUuid: result.messageUuid });
      return true;
    }

    return false;
  } catch (error) {
    logError('SMS notification error', error);
    return false;
  }
}

/** Throttle: max 1 outbid email per user per item per 30 minutes */
const OUTBID_EMAIL_THROTTLE_MINUTES = 30;

/**
 * Send outbid email notifications to opted-in users (email_bid_confirmations).
 * Throttled to 1 email per user per item per 30 minutes.
 * @param {object} options
 * @param {string} options.itemId - The item ID that was bid on
 * @param {number} options.newHighBid - The new high bid amount
 * @param {string} options.itemTitle - The item title
 * @param {string} options.itemUrl - Full URL to the item page
 * @param {string} options.excludeEmail - Email of the bidder who just placed the winning bid (do not notify)
 * @param {string} options.contactEmail - Contact email for reply-to
 */
export async function notifyOutbidUsersByEmail({
  itemId,
  newHighBid,
  itemTitle,
  itemUrl,
  excludeEmail,
  contactEmail,
}) {
  const { supabaseServer } = await import('@/lib/serverSupabase');
  const s = supabaseServer();

  try {
    // Get all bids that are now outbid (amount < newHighBid), excluding the new high bidder
    const { data: outbidBids, error } = await s
      .from('bids')
      .select('email, bidder_name')
      .eq('item_id', itemId)
      .lt('amount', newHighBid)
      .neq('email', excludeEmail || '');

    if (error) {
      logError('Error fetching outbid users', error);
      return;
    }

    if (!outbidBids || outbidBids.length === 0) {
      return;
    }

    // Dedupe by email (user may have multiple bids on same item), keep highest bidder_name
    const byEmail = new Map();
    for (const bid of outbidBids) {
      if (!byEmail.has(bid.email)) {
        byEmail.set(bid.email, bid.bidder_name);
      }
    }

    const candidateEmails = [...byEmail.keys()];
    if (candidateEmails.length === 0) return;

    // Filter to only users who opted in (email_bid_confirmations)
    const { data: optedIn } = await s
      .from('user_aliases')
      .select('email, name')
      .in('email', candidateEmails)
      .eq('email_bid_confirmations', true);

    if (!optedIn || optedIn.length === 0) return;

    const optedInSet = new Set(optedIn.map((r) => r.email));
    const optedInMap = Object.fromEntries(optedIn.map((r) => [r.email, r.name || r.email]));

    // Check throttle: skip if we sent an outbid email to this user+item in last 30 min
    const throttleCutoff = new Date(Date.now() - OUTBID_EMAIL_THROTTLE_MINUTES * 60 * 1000).toISOString();
    const { data: recentLogs } = await s
      .from('outbid_email_log')
      .select('email')
      .eq('item_id', itemId)
      .in('email', [...optedInSet])
      .gte('sent_at', throttleCutoff);

    const recentlyNotified = new Set((recentLogs || []).map((r) => r.email));
    const toNotify = [...optedInSet].filter((e) => !recentlyNotified.has(e));

    if (toNotify.length === 0) return;

    // Send emails and record in log (don't block bid response)
    const sendPromises = toNotify.map(async (email) => {
      try {
        const bidderName = optedInMap[email] || byEmail.get(email) || 'there';
        const sent = await sendOutbidEmail({
          email,
          bidderName,
          itemTitle,
          newHighBid,
          itemUrl,
          contactEmail,
        });
        if (sent) {
          await s.from('outbid_email_log').upsert(
            { email, item_id: itemId, sent_at: new Date().toISOString() },
            { onConflict: 'email,item_id' }
          );
        }
      } catch (err) {
        logError('Outbid email failed', { to: maskEmail(email), err });
      }
    });

    Promise.all(sendPromises).catch((err) => logError('Outbid notification error', err));
    logInfo('Outbid email notifications queued', { count: toNotify.length });
  } catch (error) {
    logError('Error in notifyOutbidUsersByEmail', error);
  }
}

// Send alias access security notification email
export async function sendAliasAccessNotification({ email, alias, contactEmail, siteUrl }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const siteUrlBase = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '';
  const preheader =
    'Someone just accessed your Mary Frank PTO Silent Auction alias from a new browser or device.';
  const safeAlias = escapeHtml(alias);
  const safeEmail = escapeHtml(email);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${renderPreheader(preheader)}
      ${renderLogo(logoUrl)}
      <h2 style="color: #dc2626;">Security Alert: Silent Auction Alias Access</h2>
      <p>Hello,</p>
      <p>Someone has accessed or attempted to access your Mary Frank PTO Silent Auction alias using this email address (<strong>${safeEmail}</strong>).</p>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #dc2626;">Your Alias: ${safeAlias}</p>
      </div>
      <p><strong>If this was you:</strong> You can safely ignore this message. You may have cleared your browser data, switched devices, or are accessing the auction from a new location.</p>
      <p style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <strong style="color: #d97706;">If this was NOT you:</strong> Please contact the auction administrators immediately at <a href="mailto:${replyTo || contactEmail || 'admin'}">${replyTo || contactEmail || 'the auction administrators'}</a> to report unauthorized access.
      </p>
      ${siteUrlBase ? `<p><a href="${siteUrlBase}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Auction</a></p>` : ''}
      ${renderFooter({ contactEmail: replyTo || contactEmail })}
    </div>
  `;

  const text = `Security Alert: Silent Auction Alias Access\n\nHello,\n\nSomeone has accessed or attempted to access your Mary Frank PTO Silent Auction alias using this email address (${email}).\n\nYour Alias: ${alias}\n\nIf this was you: You can safely ignore this message. You may have cleared your browser data, switched devices, or are accessing the auction from a new location.\n\nIf this was NOT you: Please contact the auction administrators immediately at ${replyTo || contactEmail || 'the auction administrators'} to report unauthorized access.\n${siteUrlBase ? `\nView Auction: ${siteUrlBase}` : ''}`;

  return sendEmail(email, 'Security Alert: Silent Auction Alias Access', html, { fromName, replyTo, text });
}

// Send vendor admin enrollment email
export async function sendVendorAdminEnrollmentEmail({ email, name, enrollmentLink, contactEmail }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  // Escape HTML in the enrollment link for display (but not in href)
  const escapedLink = escapeHtml(enrollmentLink);
  const safeName = escapeHtml(name || 'there');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${renderLogo(logoUrl)}
      <h2 style="color: #333;">Welcome as a Donor!</h2>
      <p>Hello ${safeName},</p>
      <p>Thank you so much for donating to the Mary Frank PTO Silent Auction! We're excited and grateful to have your support. Because of your generosity, our students and staff at Mary Frank Elementary will directly benefit.</p>
      <p>Your donor account has been set up. Click the link below to access your donor dashboard where you can add and manage your items.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 16px 0; font-weight: bold;">Click the button below to access your dashboard:</p>
        <a href="${enrollmentLink}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Access Dashboard</a>
      </div>
      <p style="font-size: 14px; color: #555;">Or copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #666; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 4px; font-family: monospace;">${escapedLink}</p>
      <p style="margin-top: 20px; font-size: 14px; color: #555;">You'll be able to:</p>
      <ul style="font-size: 14px; color: #555;">
        <li>Add your donated items with photos and descriptions</li>
        <li>Set starting prices</li>
        <li>View and manage all your items in one place</li>
      </ul>
      ${renderFooter({ contactEmail })}
    </div>
  `;

  const text = `Welcome as a Donor!\n\nHello ${name},\n\nThank you so much for donating to the Mary Frank PTO Silent Auction! We're excited to have your items in the auction.\n\nYour donor account has been set up. Click the link below to access your donor dashboard where you can add and manage your donated items:\n\n${enrollmentLink}\n\nYou'll be able to:\n- Add your donated items with photos and descriptions\n- Set starting prices\n- View and manage all your items in one place\n\n${contactEmail ? `Questions? Contact ${contactEmail}` : ''}`;

  return sendEmail(email, 'Welcome! Access Your Donor Dashboard', html, { fromName, replyTo, text });
}

// Send email verification email
export async function sendEmailVerification({ email, name, verificationLink, contactEmail }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const safeName = escapeHtml(name || 'there');
  const preheader = 'Confirm your email to start bidding in the Mary Frank PTO Silent Auction.';

  // Escape HTML in the verification link for display (but not in href)
  const escapedLink = escapeHtml(verificationLink);
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${renderPreheader(preheader)}
      ${renderLogo(logoUrl)}
      <h2 style="color: #333;">Verify Your Email Address</h2>
      <p>Hello ${safeName},</p>
      <p>Thank you for registering for the Mary Frank PTO Silent Auction! To complete your registration and start bidding, please verify your email address by clicking the button below.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 16px 0; font-weight: bold;">Click the button below to verify your email:</p>
        <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p style="font-size: 14px; color: #555;">Or copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #666; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 4px; font-family: monospace;">${escapedLink}</p>
      <p style="margin-top: 20px; font-size: 14px; color: #555;">This verification link will expire in 24 hours.</p>
      <p style="font-size: 14px; color: #555;">If you didn't register for this auction, you can safely ignore this email.</p>
      ${renderFooter({ contactEmail })}
    </div>
  `;

  const text = `Verify Your Email Address\n\nHello ${name || 'there'},\n\nThank you for registering for the Mary Frank PTO Silent Auction! To complete your registration and start bidding, please verify your email address by clicking the link below:\n\n${verificationLink}\n\nThis verification link will expire in 24 hours.\n\nIf you didn't register for this auction, you can safely ignore this email.\n\n${contactEmail ? `Questions? Contact ${contactEmail}` : ''}`;

  return sendEmail(email, 'Verify Your Email Address - Silent Auction', html, { fromName, replyTo, text });
}