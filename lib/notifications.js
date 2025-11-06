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
export async function sendWinnerNotification({ email, bidderName, itemTitle, winningBid, paymentInstructions, pickupInstructions, contactEmail, itemUrl, paymentInstructionsUrl }) {
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
      <p>Thank you for participating in our auction! You are the winning bidder for:</p>
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
        ${paymentInstructionsUrl ? `<p style="margin-top: 16px;"><a href="${paymentInstructionsUrl}" style="display: inline-block; padding: 10px 20px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Payment Instructions →</a></p>` : ''}
      </div>
      
      <p><a href="${itemUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Item Details</a></p>
      
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const text = `Winner Notification\n\nHello ${bidderName},\n\nThank you for participating in our auction! You won: ${itemTitle}\nWinning bid: $${Number(winningBid).toFixed(2)}\n\n${paymentInstructions ? `Payment: ${paymentInstructions}\n` : ''}${pickupInstructions ? `Pickup: ${pickupInstructions}\n` : ''}${paymentInstructionsUrl ? `\nView Payment Instructions: ${paymentInstructionsUrl}\n` : ''}View Item: ${itemUrl}\n${contactEmail ? `\nQuestions: ${contactEmail}` : ''}`;

  return sendEmail(email, `You won: ${itemTitle}`, html, { fromName, replyTo, text });
}

// Send admin email with list of all winners
export async function sendAdminWinnersList({ adminEmails, winners, contactEmail }) {
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
        <strong>Total Amount:</strong> $${totalAmount.toFixed(2)}
      </p>
      
      ${emailFooter({ contactEmail })}
    </div>
  `;

  // Build text version
  const winnersListText = winners.map((winner, index) => 
    `${index + 1}. ${winner.itemTitle || 'N/A'} - ${winner.bidderName || 'N/A'} (${winner.email}) - $${Number(winner.winningBid).toFixed(2)}`
  ).join('\n');

  const text = `Auction Closed - Winners List\n\nThe auction has been closed. Below is the complete list of winners:\n\n${winnersListText}\n\nTotal Winners: ${winners.length}\nTotal Amount: $${totalAmount.toFixed(2)}`;

  // Send to all admin emails
  const emailPromises = adminEmails.map(email => 
    sendEmail(email, `Auction Closed - ${winners.length} Winner${winners.length !== 1 ? 's' : ''}`, html, { fromName, replyTo, text })
  );
  
  await Promise.all(emailPromises);
  return true;
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
  const replyTo = contactEmail || process.env.AUCTION_CONTACT_EMAIL || undefined;
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
      <p style="background: #fff7ed; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <strong style="color: #d97706;">If this was NOT you:</strong> Please contact the auction administrators immediately at <a href="mailto:${replyTo || contactEmail || 'admin'}">${replyTo || contactEmail || 'the auction administrators'}</a> to report unauthorized access.
      </p>
      ${siteUrlBase ? `<p><a href="${siteUrlBase}" style="display: inline-block; padding: 12px 24px; background: #00b140; color: white; text-decoration: none; border-radius: 6px; margin-top: 16px;">View Auction</a></p>` : ''}
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

  // Escape HTML in the enrollment link for display (but not in href)
  const escapedLink = enrollmentLink.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${logoUrl ? `<div style="text-align:center;margin-bottom:12px;"><img src="${logoUrl}" alt="" style="max-height:48px"/></div>` : ''}
      <h2 style="color: #333;">Welcome as a Donor!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for donating to our silent auction! We're excited to have your items in the auction.</p>
      <p>To get started, please use the link below to enroll and access your donor dashboard where you can add your donated items.</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 16px 0; font-weight: bold;">Click the button below to enroll and add your items:</p>
        <a href="${enrollmentLink}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Enroll & Add Items</a>
      </div>
      <p style="font-size: 14px; color: #555;">Or copy and paste this link into your browser:</p>
      <p style="font-size: 12px; color: #666; word-break: break-all; background: #f9fafb; padding: 12px; border-radius: 4px; font-family: monospace;">${escapedLink}</p>
      <p style="margin-top: 20px; font-size: 14px; color: #555;">Once you enroll, you'll be able to:</p>
      <ul style="font-size: 14px; color: #555;">
        <li>Add your donated items with photos and descriptions</li>
        <li>Set starting prices</li>
        <li>View and manage all your items in one place</li>
      </ul>
      ${emailFooter({ contactEmail })}
    </div>
  `;

  const text = `Welcome as a Donor!\n\nHello ${name},\n\nThank you for donating to our silent auction! We're excited to have your items in the auction.\n\nTo get started, please use the link below to enroll and access your donor dashboard where you can add your donated items:\n\n${enrollmentLink}\n\nOnce you enroll, you'll be able to:\n- Add your donated items with photos and descriptions\n- Set starting prices\n- View and manage all your items in one place\n\n${contactEmail ? `Questions? Contact ${contactEmail}` : ''}`;

  return sendEmail(email, 'Welcome! Enroll to Add Your Donated Items', html, { fromName, replyTo, text });
}

// Send email verification email
export async function sendEmailVerification({ email, name, verificationLink, contactEmail }) {
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
        <a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background: #00b140; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Email Address</a>
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