/**
 * Notification service for bid confirmations, outbid alerts, and winner notifications
 * Email via Resend (required)
 * SMS via Plivo (optional, opt-in only)
 */

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
    console.warn('RESEND_API_KEY not set, skipping email');
    return false;
  }

  try {
    let Resend;
    try {
      const resendModule = await import('resend');
      Resend = resendModule.Resend;
    } catch (importError) {
      console.warn('Resend package not found. Install with: npm install resend');
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
        'Importance': 'high',
        'X-Priority': '1 (High)',
        'X-MSMail-Priority': 'High',
        'Priority': 'urgent',
      }
    });

    if (error) {
      console.error('Resend email error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email notification error:', error);
    return false;
  }
}

// Send bid confirmation email
export async function sendBidConfirmation({ email, bidderName, itemTitle, bidAmount, itemUrl, contactEmail }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;

  function emailFooter({ contactEmail }) {
    const attribution = 'Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.';
    return `
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        ${attribution}
        ${contactEmail ? `<br/>Questions? Contact <a href="mailto:${contactEmail}">${contactEmail}</a>.` : ''}
      </p>
    `;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="Mary Frank PTO" style="max-height:48px"/></div>` : ''}
      <h2 style="color: #047857;">Bid Confirmation 🎉</h2>
      <p>Hello ${bidderName},</p>
      <p>Thank you for placing your bid!</p>
      <p><strong>Item:</strong> ${itemTitle}</p>
      <p style="font-size: 18px; font-weight: bold; color: #047857;">
        Your bid: $${Number(bidAmount).toFixed(2)}
      </p>
      <p><a href="${itemUrl}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Item</a></p>
      ${contactEmail ? `<p style=\"margin-top: 20px; font-size: 14px; color: #555;\">If you did not place this bid, please contact the auction admins immediately at <a href=\"mailto:${contactEmail}\">${contactEmail}</a>.</p>` : ''}
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const text = `Bid Confirmation\n\nHello ${bidderName},\n\nThank you for placing your bid!\nItem: ${itemTitle}\nYour bid: $${Number(bidAmount).toFixed(2)}\n\nView Item: ${itemUrl}\n${contactEmail ? `\nIf you did not place this bid, contact the auction admins at ${contactEmail}.` : ''}`;

  return sendEmail(email, `Bid confirmation: ${itemTitle}`, html, { fromName, replyTo, text });
}

// Send winner notification email
export async function sendWinnerNotification({ email, bidderName, itemTitle, winningBid, paymentInstructions, pickupInstructions, contactEmail, itemUrl, paymentInstructionsUrl }) {
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
    contactEmail,
    paymentInstructionsUrl,
  });
}

export async function sendWinnerDigest({ email, bidderName, items, paymentInstructions, pickupInstructions, contactEmail, paymentInstructionsUrl }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const safeItems = Array.isArray(items) ? items.filter((item) => item && item.itemTitle) : [];

  if (safeItems.length === 0) {
    console.warn('sendWinnerDigest called with no items');
    return false;
  }

  function emailFooter({ contactEmail }) {
    const attribution = 'Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.';
    return `
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        ${attribution}
        ${contactEmail ? `<br/>Questions? Contact <a href="mailto:${contactEmail}">${contactEmail}</a>.` : ''}
      </p>
    `;
  }

  const totalAmount = safeItems.reduce((sum, item) => sum + Number(item.winningBid || 0), 0);
  const itemRowsHtml = safeItems
    .map(
      (item) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: left;">${item.itemTitle}</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; color: #047857;">
            $${Number(item.winningBid).toFixed(2)}
          </td>
          <td style="padding: 12px; text-align: right;">
            ${item.itemUrl ? `<a href="${item.itemUrl}" style="color: #047857; text-decoration: none; font-weight: 600;">View item →</a>` : ''}
          </td>
        </tr>
      `,
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1f2937;">
      ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="" style="max-height:48px"/></div>` : ''}
      <h2 style="color: #047857; margin-bottom: 8px;">You won${bidderName ? `, ${bidderName}` : ''}! 🎉</h2>
      <p style="font-size: 15px; line-height: 1.5;">
        Thanks for supporting Mary Frank—our kids thank you! You won the following item${safeItems.length > 1 ? 's' : ''}:
      </p>
      <div style="margin: 20px 0; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead style="background: #eff6ff;">
            <tr>
              <th style="padding: 12px; text-align: left; font-size: 13px; color: #1f2937;">Item</th>
              <th style="padding: 12px; text-align: right; font-size: 13px; color: #1f2937;">Winning Bid</th>
              <th style="padding: 12px; text-align: right; font-size: 13px; color: #1f2937;">Details</th>
            </tr>
          </thead>
          <tbody>
            ${itemRowsHtml}
          </tbody>
          <tfoot style="background: #f3f4f6;">
            <tr>
              <td style="padding: 12px; text-align: right; font-weight: bold;" colspan="2">Total Due:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; color: #047857;">$${totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="margin: 24px 0; padding: 20px; background: #ecfdf5; border-radius: 12px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #047857;">Next Steps</h3>
        ${paymentInstructions ? `<p style="margin: 0 0 12px 0;"><strong>Payment:</strong> ${paymentInstructions}</p>` : ''}
        ${pickupInstructions ? `<p style="margin: 0;"><strong>Pickup:</strong> ${pickupInstructions}</p>` : ''}
        ${paymentInstructionsUrl ? `<p style="margin: 16px 0 0 0;"><a href="${paymentInstructionsUrl}" style="display: inline-block; padding: 12px 20px; background: #047857; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">View Payment Instructions</a></p>` : ''}
      </div>
      <p style="font-size: 14px; color: #4b5563;">If you have any questions, ${contactEmail ? `please contact us at <a href="mailto:${contactEmail}" style="color: #047857;">${contactEmail}</a>.` : 'please reach out to the auction administrators.'}</p>
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const itemLines = safeItems
    .map((item) => `• ${item.itemTitle}: $${Number(item.winningBid).toFixed(2)}${item.itemUrl ? ` (${item.itemUrl})` : ''}`)
    .join('\n');

  const text = `You won${bidderName ? `, ${bidderName}` : ''}!\n\nThanks for supporting Mary Frank—our kids thank you! You won the following item${safeItems.length > 1 ? 's' : ''}:\n${itemLines}\n\nTotal Due: $${totalAmount.toFixed(2)}\n${paymentInstructions ? `\nPayment: ${paymentInstructions}\n` : ''}${pickupInstructions ? `Pickup: ${pickupInstructions}\n` : ''}${paymentInstructionsUrl ? `\nView Payment Instructions: ${paymentInstructionsUrl}\n` : ''}${contactEmail ? `\nQuestions? Contact ${contactEmail}` : ''}`;

  const subjectItems = safeItems.length === 1 ? safeItems[0].itemTitle : `${safeItems.length} items`;
  return sendEmail(email, `You won ${subjectItems}!`, html, { fromName, replyTo, text });
}

// Send admin email with list of all winners and donation summary
export async function sendAdminWinnersList({ adminEmails, winners, contactEmail, donationsCount = 0, donationsTotal = 0 }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;

  function emailFooter({ contactEmail }) {
    const attribution = 'Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.';
    return `
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        ${attribution}
        ${contactEmail ? `<br/>Questions? Contact <a href="mailto:${contactEmail}">${contactEmail}</a>.` : ''}
      </p>
    `;
  }

  if (!adminEmails || adminEmails.length === 0) {
    console.warn('No admin emails provided for winners list');
    return false;
  }

  if (!winners || winners.length === 0) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="" style="max-height:48px"/></div>` : ''}
        <h2 style="color: #333;">Auction Closed - No Winners</h2>
        <p>The auction has been closed, but there were no winning bids.</p>
        ${emailFooter({ contactEmail })}
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
      <td style="padding: 12px; text-align: left;">${winner.itemTitle || 'N/A'}</td>
      <td style="padding: 12px; text-align: left;">${winner.bidderName || 'N/A'}</td>
      <td style="padding: 12px; text-align: left;"><a href="mailto:${winner.email}">${winner.email}</a></td>
      <td style="padding: 12px; text-align: right;">$${Number(winner.winningBid).toFixed(2)}</td>
    </tr>
  `).join('');

  const totalAmount = winners.reduce((sum, winner) => sum + Number(winner.winningBid), 0);

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
      ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="" style="max-height:48px"/></div>` : ''}
      <h2 style="color: #333;">Auction Closed - Winners List</h2>
      <p>The auction has been closed. Below is the complete list of winners:</p>
      
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
              <td style="padding: 12px; text-align: right; border-top: 2px solid #d1d5db;">$${totalAmount.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      
      <p style="margin-top: 20px; font-size: 14px; color: #555;">
        <strong>Total Winners:</strong> ${winners.length}<br/>
        <strong>Total Winning Bids:</strong> $${totalAmount.toFixed(2)}
      </p>
      ${donationsCount > 0 ? `
      <div style="margin-top: 24px; padding: 16px; background: #ecfdf5; border-radius: 8px; border: 1px solid #d1fae5;">
        <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #047857;">Donation Pledges</h3>
        <p style="margin: 0; font-size: 14px; color: #555;">
          <strong>Total Pledges:</strong> ${donationsCount}<br/>
          <strong>Total Pledged:</strong> $${donationsTotal.toFixed(2)}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #555;">
          <strong>Grand Total (bids + donations):</strong> $${(totalAmount + donationsTotal).toFixed(2)}
        </p>
      </div>
      ` : ''}
      
      ${emailFooter({ contactEmail })}
    </div>
  `;

  // Build text version
  const winnersListText = winners.map((winner, index) => 
    `${index + 1}. ${winner.itemTitle || 'N/A'} - ${winner.bidderName || 'N/A'} (${winner.email}) - $${Number(winner.winningBid).toFixed(2)}`
  ).join('\n');

  const donationText = donationsCount > 0
    ? `\n\nDonation Pledges: ${donationsCount}\nTotal Pledged: $${donationsTotal.toFixed(2)}\nGrand Total (bids + donations): $${(totalAmount + donationsTotal).toFixed(2)}`
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
export async function sendDonationConfirmation({ email, donorName, amount, message, contactEmail }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;

  function emailFooter({ contactEmail }) {
    const attribution = 'Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.';
    return `
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        ${attribution}
        ${contactEmail ? `<br/>Questions? Contact <a href="mailto:${contactEmail}">${contactEmail}</a>.` : ''}
      </p>
    `;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="Mary Frank PTO" style="max-height:48px"/></div>` : ''}
      <h2 style="color: #047857;">Donation Pledge Received 🎉</h2>
      <p>Hello ${donorName},</p>
      <p>Thank you for your generous donation pledge!</p>
      <p style="font-size: 18px; font-weight: bold; color: #047857;">
        Your pledge: $${Number(amount).toFixed(2)}
      </p>
      ${message ? `<p style="margin-top: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; font-style: italic; color: #4b5563;">"${message}"</p>` : ''}
      <div style="margin: 20px 0; padding: 16px; background: #eff6ff; border-radius: 8px; font-size: 14px; color: #1e40af;">
        <strong>What happens next?</strong> When the auction closes, you'll receive an email with payment instructions for your pledged donation.
      </div>
      ${contactEmail ? `<p style="margin-top: 20px; font-size: 14px; color: #555;">Questions? Contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>` : ''}
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const text = `Donation Pledge Received\n\nHello ${donorName},\n\nThank you for your generous donation pledge!\nYour pledge: $${Number(amount).toFixed(2)}\n${message ? `\nYour message: "${message}"\n` : ''}\nWhat happens next? When the auction closes, you'll receive an email with payment instructions for your pledged donation.\n${contactEmail ? `\nQuestions? Contact ${contactEmail}` : ''}`;

  return sendEmail(email, `Donation pledge received: $${Number(amount).toFixed(2)}`, html, { fromName, replyTo, text });
}

// Send donor payment instructions email (sent when auction closes)
export async function sendDonorPaymentDigest({ email, donorName, donations, paymentInstructions, contactEmail, paymentInstructionsUrl }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const safeDonations = Array.isArray(donations) ? donations.filter((d) => d && d.amount) : [];

  if (safeDonations.length === 0) {
    console.warn('sendDonorPaymentDigest called with no donations');
    return false;
  }

  function emailFooter({ contactEmail }) {
    const attribution = 'Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.';
    return `
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        ${attribution}
        ${contactEmail ? `<br/>Questions? Contact <a href="mailto:${contactEmail}">${contactEmail}</a>.` : ''}
      </p>
    `;
  }

  const totalAmount = safeDonations.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const donationRowsHtml = safeDonations
    .map(
      (d) => `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px; text-align: left;">Donation Pledge</td>
          <td style="padding: 12px; text-align: right; font-weight: bold; color: #047857;">
            $${Number(d.amount).toFixed(2)}
          </td>
          <td style="padding: 12px; text-align: left; font-size: 13px; color: #6b7280;">
            ${d.message ? `"${d.message}"` : ''}
          </td>
        </tr>
      `
    )
    .join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 20px; color: #1f2937;">
      ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="" style="max-height:48px"/></div>` : ''}
      <h2 style="color: #047857; margin-bottom: 8px;">Thank you for your donation${donorName ? `, ${donorName}` : ''}! 🎉</h2>
      <p style="font-size: 15px; line-height: 1.5;">
        The auction has closed. Thank you for your generous donation pledge${safeDonations.length > 1 ? 's' : ''}! Here's a summary:
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
              <td style="padding: 12px; text-align: right; font-weight: bold; color: #047857;">$${totalAmount.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div style="margin: 24px 0; padding: 20px; background: #ecfdf5; border-radius: 12px;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 16px; color: #047857;">Payment Instructions</h3>
        ${paymentInstructions ? `<p style="margin: 0 0 12px 0;"><strong>Payment:</strong> ${paymentInstructions}</p>` : '<p style="margin: 0;">Payment instructions will be provided by the auction administrators.</p>'}
        ${paymentInstructionsUrl ? `<p style="margin: 16px 0 0 0;"><a href="${paymentInstructionsUrl}" style="display: inline-block; padding: 12px 20px; background: #047857; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">View Payment Instructions</a></p>` : ''}
      </div>
      <p style="font-size: 14px; color: #4b5563;">If you have any questions, ${contactEmail ? `please contact us at <a href="mailto:${contactEmail}" style="color: #047857;">${contactEmail}</a>.` : 'please reach out to the auction administrators.'}</p>
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const donationLines = safeDonations
    .map((d) => `• Donation Pledge: $${Number(d.amount).toFixed(2)}${d.message ? ` ("${d.message}")` : ''}`)
    .join('\n');

  const text = `Thank you for your donation${donorName ? `, ${donorName}` : ''}!\n\nThe auction has closed. Thank you for your generous donation pledge${safeDonations.length > 1 ? 's' : ''}!\n${donationLines}\n\nTotal Due: $${totalAmount.toFixed(2)}\n${paymentInstructions ? `\nPayment: ${paymentInstructions}\n` : ''}${paymentInstructionsUrl ? `\nView Payment Instructions: ${paymentInstructionsUrl}\n` : ''}${contactEmail ? `\nQuestions? Contact ${contactEmail}` : ''}`;

  return sendEmail(email, `Donation payment instructions — $${totalAmount.toFixed(2)}`, html, { fromName, replyTo, text });
}

// Send SMS notification via Plivo
async function sendSMSNotification(to, itemTitle, currentBid, itemUrl) {
  const plivoAuthId = process.env.PLIVO_AUTH_ID;
  const plivoAuthToken = process.env.PLIVO_AUTH_TOKEN;
  const plivoFromNumber = process.env.PLIVO_FROM_NUMBER;

  if (!plivoAuthId || !plivoAuthToken || !plivoFromNumber) {
    console.warn('Plivo credentials not set, skipping SMS notification');
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
      // Plivo is an optional dependency - gracefully handle if not installed
      console.warn('Plivo package not found. Install with: npm install plivo');
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
      console.log(`SMS sent to ${phoneNumber}: ${result.messageUuid}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error('SMS notification error:', error);
    return false;
  }
}

/**
 * Send outbid SMS notifications to opted-in users
 * @param {object} options
 * @param {string} options.itemId - The item ID that was bid on
 * @param {number} options.newHighBid - The new high bid amount
 * @param {string} options.itemTitle - The item title
 * @param {string} options.itemUrl - Full URL to the item page
 */
export async function notifyOutbidUsers({ itemId, newHighBid, itemTitle, itemUrl }) {
  const { supabaseServer } = await import('@/lib/serverSupabase');
  const s = supabaseServer();

  try {
    // Get all bids that are now outbid AND opted in for SMS
    const { data: outbidBids, error } = await s
      .from('bids')
      .select('phone, sms_opt_in')
      .eq('item_id', itemId)
      .eq('sms_opt_in', true)
      .lt('amount', newHighBid)
      .not('phone', 'is', null);

    if (error) {
      console.error('Error fetching outbid users:', error);
      return;
    }

    if (!outbidBids || outbidBids.length === 0) {
      return;
    }

    // Send SMS notifications (don't wait for all to complete)
    const notificationPromises = outbidBids.map(bid =>
      sendSMSNotification(bid.phone, itemTitle, newHighBid, itemUrl)
        .catch(err => console.error(`SMS notification failed for ${bid.phone}:`, err))
    );

    // Fire and forget - don't wait for notifications to complete
    Promise.all(notificationPromises).catch(err => {
      console.error('Notification sending error:', err);
    });

    console.log(`Sent ${notificationPromises.length} outbid SMS notifications`);
  } catch (error) {
    console.error('Error in notifyOutbidUsers:', error);
  }
}

// Send alias access security notification email
export async function sendAliasAccessNotification({ email, alias, contactEmail, siteUrl }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;
  const siteUrlBase = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || '';

  function emailFooter({ contactEmail }) {
    const attribution = 'Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.';
    return `
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        ${attribution}
        ${contactEmail ? `<br/>Questions? Contact <a href="mailto:${contactEmail}">${contactEmail}</a>.` : ''}
      </p>
    `;
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="" style="max-height:48px"/></div>` : ''}
      <h2 style="color: #dc2626;">Security Alert: Silent Auction Alias Access</h2>
      <p>Hello,</p>
      <p>Someone has accessed or attempted to access your Silent Auction alias using this email address (<strong>${email}</strong>).</p>
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0; font-weight: bold; color: #dc2626;">Your Alias: ${alias}</p>
      </div>
      <p><strong>If this was you:</strong> You can safely ignore this message. You may have cleared your browser data, switched devices, or are accessing the auction from a new location.</p>
      <p style="background: #fff7ed; border-left: 4px solid var(--accent-warm-500); padding: 16px; margin: 20px 0; border-radius: 4px;">
        <strong style="color: #d97706;">If this was NOT you:</strong> Please contact the auction administrators immediately at <a href="mailto:${replyTo || contactEmail || 'admin'}">${replyTo || contactEmail || 'the auction administrators'}</a> to report unauthorized access.
      </p>
      ${siteUrlBase ? `<p><a href="${siteUrlBase}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Auction</a></p>` : ''}
      ${emailFooter({ contactEmail: replyTo || contactEmail })}
    </div>
  `;

  const text = `Security Alert: Silent Auction Alias Access\n\nHello,\n\nSomeone has accessed or attempted to access your Silent Auction alias using this email address (${email}).\n\nYour Alias: ${alias}\n\nIf this was you: You can safely ignore this message. You may have cleared your browser data, switched devices, or are accessing the auction from a new location.\n\nIf this was NOT you: Please contact the auction administrators immediately at ${replyTo || contactEmail || 'the auction administrators'} to report unauthorized access.\n${siteUrlBase ? `\nView Auction: ${siteUrlBase}` : ''}`;

  return sendEmail(email, 'Security Alert: Silent Auction Alias Access', html, { fromName, replyTo, text });
}

// Send vendor admin enrollment email
export async function sendVendorAdminEnrollmentEmail({ email, name, enrollmentLink, contactEmail }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;

  function emailFooter({ contactEmail }) {
    const attribution = 'Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.';
    return `
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        ${attribution}
        ${contactEmail ? `<br/>Questions? Contact <a href="mailto:${contactEmail}">${contactEmail}</a>.` : ''}
      </p>
    `;
  }

  // Escape HTML in the enrollment link for display (but not in href)
  const escapedLink = enrollmentLink.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="" style="max-height:48px"/></div>` : ''}
      <h2 style="color: #333;">Welcome as a Donor!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for donating to the Mary Frank PTO Silent Auction! We're excited and grateful to have your support.</p>
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
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const text = `Welcome as a Donor!\n\nHello ${name},\n\nThank you for donating to our silent auction! We're excited to have your items in the auction.\n\nYour donor account has been set up. Click the link below to access your donor dashboard where you can add and manage your donated items:\n\n${enrollmentLink}\n\nYou'll be able to:\n- Add your donated items with photos and descriptions\n- Set starting prices\n- View and manage all your items in one place\n\n${contactEmail ? `Questions? Contact ${contactEmail}` : ''}`;

  return sendEmail(email, 'Welcome! Access Your Donor Dashboard', html, { fromName, replyTo, text });
}

// Send email verification email
export async function sendEmailVerification({ email, name, verificationLink, contactEmail }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.NEXT_PUBLIC_CONTACT_EMAIL || process.env.AUCTION_CONTACT_EMAIL || undefined;

  function emailFooter({ contactEmail }) {
    const attribution = 'Built, donated, and administered by λstepweaver LLC on behalf of the Mary Frank PTO.';
    return `
      <p style="margin-top: 24px; font-size: 12px; color: #666;">
        ${attribution}
        ${contactEmail ? `<br/>Questions? Contact <a href="mailto:${contactEmail}">${contactEmail}</a>.` : ''}
      </p>
    `;
  }

  // Escape HTML in the verification link for display (but not in href)
  const escapedLink = verificationLink.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="" style="max-height:48px"/></div>` : ''}
      <h2 style="color: #333;">Verify Your Email Address</h2>
      <p>Hello ${name || 'there'},</p>
      <p>Thank you for registering for the silent auction! To complete your registration and start bidding, please verify your email address by clicking the button below.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 16px 0; font-weight: bold;">Click the button below to verify your email:</p>
        <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #047857; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
      </div>
      <p style="font-size: 14px; color: #555;">Or copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #666; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 4px; font-family: monospace;">${escapedLink}</p>
      <p style="margin-top: 20px; font-size: 14px; color: #555;">This verification link will expire in 24 hours.</p>
      <p style="font-size: 14px; color: #555;">If you didn't register for this auction, you can safely ignore this email.</p>
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const text = `Verify Your Email Address\n\nHello ${name || 'there'},\n\nThank you for registering for the silent auction! To complete your registration and start bidding, please verify your email address by clicking the link below:\n\n${verificationLink}\n\nThis verification link will expire in 24 hours.\n\nIf you didn't register for this auction, you can safely ignore this email.\n\n${contactEmail ? `Questions? Contact ${contactEmail}` : ''}`;

  return sendEmail(email, 'Verify Your Email Address - Silent Auction', html, { fromName, replyTo, text });
}