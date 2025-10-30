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
async function sendEmail(to, subject, html, { fromName, replyTo, text } = {}) {
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
        'Importance': 'normal',
        'X-Priority': '3 (Normal)',
        'X-MSMail-Priority': 'Normal'
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
  const replyTo = contactEmail || process.env.AUCTION_CONTACT_EMAIL || undefined;

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
      <h2 style="color: #333;">Bid Confirmation</h2>
      <p>Hello ${bidderName},</p>
      <p>Thank you for placing your bid!</p>
      <p><strong>Item:</strong> ${itemTitle}</p>
      <p style="font-size: 18px; font-weight: bold; color: #2563eb;">
        Your bid: $${Number(bidAmount).toFixed(2)}
      </p>
      <p><a href="${itemUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Item</a></p>
      ${contactEmail ? `<p style=\"margin-top: 20px; font-size: 14px; color: #555;\">If you did not place this bid, please contact the auction admins immediately at <a href=\"mailto:${contactEmail}\">${contactEmail}</a>.</p>` : ''}
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const text = `Bid Confirmation\n\nHello ${bidderName},\n\nThank you for placing your bid!\nItem: ${itemTitle}\nYour bid: $${Number(bidAmount).toFixed(2)}\n\nView Item: ${itemUrl}\n${contactEmail ? `\nIf you did not place this bid, contact the auction admins at ${contactEmail}.` : ''}`;

  return sendEmail(email, `Bid confirmation: ${itemTitle}`, html, { fromName, replyTo, text });
}

// Send winner notification email
export async function sendWinnerNotification({ email, bidderName, itemTitle, winningBid, paymentInstructions, pickupInstructions, contactEmail, itemUrl }) {
  const logoUrl = process.env.NEXT_PUBLIC_AUCTION_LOGO_URL || '';
  const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
  const replyTo = contactEmail || process.env.AUCTION_CONTACT_EMAIL || undefined;

  function emailFooter({ contactEmail }) {
    const attribution = 'Built, donated, and administered by λstepweaver on behalf of the Mary Frank PTO.';
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
      <h2 style="color: #2563eb;">Congratulations! You Won!</h2>
      <p>Hello ${bidderName},</p>
      <p>Congratulations! You are the winning bidder for:</p>
      <p style="font-size: 18px; font-weight: bold;">
        ${itemTitle}
      </p>
      <p style="font-size: 20px; font-weight: bold; color: #2563eb; margin: 20px 0;">
        Winning Bid: $${Number(winningBid).toFixed(2)}
      </p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Next Steps:</h3>
        ${paymentInstructions ? `<p><strong>Payment:</strong> ${paymentInstructions}</p>` : ''}
        ${pickupInstructions ? `<p><strong>Pickup:</strong> ${pickupInstructions}</p>` : ''}
      </div>
      
      <p><a href="${itemUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Item Details</a></p>
      
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const text = `Winner Notification\n\nHello ${bidderName},\n\nYou won: ${itemTitle}\nWinning bid: $${Number(winningBid).toFixed(2)}\n\n${paymentInstructions ? `Payment: ${paymentInstructions}\n` : ''}${pickupInstructions ? `Pickup: ${pickupInstructions}\n` : ''}View Item: ${itemUrl}\n${contactEmail ? `\nQuestions: ${contactEmail}` : ''}`;

  return sendEmail(email, `You won: ${itemTitle}`, html, { fromName, replyTo, text });
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
      plivo = await import('plivo');
    } catch (importError) {
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
