import { supabaseServer } from '@/lib/serverSupabase';

// Store last alert timestamp to prevent spam (only alert once per hour)
let lastOptInAlertTime = 0;
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

async function checkOptInRate(supabase) {
  try {
    const { data: allUsers, error } = await supabase
      .from('user_aliases')
      .select('email_bid_confirmations');

    if (error) {
      console.error('Error fetching users for opt-in rate:', error);
      return null;
    }

    if (!allUsers || allUsers.length === 0) {
      return null;
    }

    const totalUsers = allUsers.length;
    const optedIn = allUsers.filter(u => u.email_bid_confirmations === true).length;
    const optInRate = totalUsers > 0 ? (optedIn / totalUsers) * 100 : 0;

    return {
      totalUsers,
      optedIn,
      optInRate,
    };
  } catch (error) {
    console.error('Error calculating opt-in rate:', error);
    return null;
  }
}

async function sendOptInAlert(rateData) {
  const now = Date.now();
  
  // Check cooldown
  if (now - lastOptInAlertTime < ALERT_COOLDOWN_MS) {
    return; // Still in cooldown
  }

  lastOptInAlertTime = now;

  // Always log to console
  console.warn(
    `⚠️ Opt-in rate exceeded 50%: ${rateData.optInRate.toFixed(1)}% ` +
    `(${rateData.optedIn}/${rateData.totalUsers} users)`
  );

  // Send email to STEPWEAVER if configured
  const stepweaverEmail = process.env.STEPWEAVER;
  if (stepweaverEmail) {
    try {
      const { sendEmail } = await import('@/lib/notifications');
      const fromName = process.env.NEXT_PUBLIC_AUCTION_FROM_NAME || 'Mary Frank PTO Auction';
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #dc2626;">⚠️ Opt-In Rate Alert</h2>
          <p>The email bid confirmation opt-in rate has exceeded 50%.</p>
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #dc2626;">
              Current Rate: ${rateData.optInRate.toFixed(1)}%
            </p>
            <p style="margin: 8px 0 0 0; color: #1f2937;">
              <strong>Opted In:</strong> ${rateData.optedIn} users<br/>
              <strong>Total Users:</strong> ${rateData.totalUsers} users
            </p>
          </div>
          <p style="color: #4b5563; font-size: 14px;">
            This alert is sent when the opt-in rate exceeds 50% to help monitor email usage. 
            Users who opt in will receive emails for their initial bids on each item.
          </p>
          <div style="margin: 24px 0; padding: 16px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
            <p style="margin: 0 0 12px 0; font-weight: bold; color: #1e40af;">Quick Actions:</p>
            <p style="margin: 0 0 8px 0;">
              <a href="https://resend.com/pricing" style="color: #2563eb; text-decoration: none; font-weight: 600;">📧 Upgrade Resend Plan</a> - Increase email limits if needed
            </p>
            <p style="margin: 0;">
              <a href="${siteUrl}/admin" style="color: #2563eb; text-decoration: none; font-weight: 600;">📊 View Admin Dashboard</a> - Monitor auction activity
            </p>
          </div>
        </div>
      `;

      const text = `Opt-In Rate Alert\n\nThe email bid confirmation opt-in rate has exceeded 50%.\n\nCurrent Rate: ${rateData.optInRate.toFixed(1)}%\nOpted In: ${rateData.optedIn} users\nTotal Users: ${rateData.totalUsers} users\n\nThis alert is sent when the opt-in rate exceeds 50% to help monitor email usage. Users who opt in will receive emails for their initial bids on each item.\n\nQuick Actions:\n📧 Upgrade Resend Plan: https://resend.com/pricing\n📊 View Admin Dashboard: ${siteUrl}/admin`;

      await sendEmail(
        stepweaverEmail.trim(),
        `⚠️ Opt-In Rate Alert: ${rateData.optInRate.toFixed(1)}%`,
        html,
        { fromName, text }
      );
    } catch (err) {
      console.error('Error sending opt-in rate alert email:', err);
      // Don't fail the request if email fails
    }
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, email_bid_confirmations } = body;

    if (!email || typeof email !== 'string') {
      return Response.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (typeof email_bid_confirmations !== 'boolean') {
      return Response.json(
        { error: 'email_bid_confirmations must be a boolean' },
        { status: 400 }
      );
    }

    const s = supabaseServer();

    // Update the user's email preference
    const { data, error } = await s
      .from('user_aliases')
      .update({ email_bid_confirmations })
      .eq('email', email.trim().toLowerCase())
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating email preference:', error);
      return Response.json(
        { error: 'Failed to update email preference' },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { error: 'User alias not found' },
        { status: 404 }
      );
    }

    // Check opt-in rate after update
    const rateData = await checkOptInRate(s);
    if (rateData && rateData.optInRate > 50) {
      // Alert if rate exceeds 50% (asynchronously, don't block response)
      sendOptInAlert(rateData).catch((err) => {
        console.error('Error sending opt-in alert:', err);
      });
    }

    return Response.json({
      success: true,
      email_bid_confirmations: data.email_bid_confirmations,
    });
  } catch (error) {
    console.error('Update email preference error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

