import { headers } from 'next/headers';
import { checkBasicAuth } from '@/lib/auth';
import { sendClosingEmailsOnly } from '@/lib/closeAuction';
import { jsonError, jsonUnauthorized } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

/**
 * POST /api/admin/send-closing-emails
 * Sends closing emails (winner digest + admin winners list) to real recipients.
 * Use when items are already closed but emails were never sent.
 * Does NOT close items — only sends emails.
 */
export async function POST(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' });
  }

  try {
    const result = await sendClosingEmailsOnly({ triggeredBy: 'manual-resend' });

    if (result.error) {
      return Response.json({ ok: false, error: result.error }, {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return Response.json({
      ok: true,
      ...result,
      message: `Sent ${result.emailsSent} winner email(s) and ${result.adminEmailsSent} admin email(s).`,
    });
  } catch (error) {
    logError('Send closing emails error', error);
    return jsonError('Internal server error', 500);
  }
}
