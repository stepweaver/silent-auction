import { headers } from 'next/headers';
import { checkBasicAuth } from '@/lib/auth';
import { closeAuction } from '@/lib/closeAuction';
import { jsonError, jsonUnauthorized } from '@/lib/apiResponses';
import { logError } from '@/lib/logger';

export async function POST(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return jsonUnauthorized('Unauthorized', { basicRealm: 'Admin Area' });
  }

  try {
    const result = await closeAuction({ force: true, triggeredBy: 'manual' });

    if (!result.ok) {
      return Response.json({ ok: false, error: result.error || 'Close failed' }, {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return Response.json(result);
  } catch (error) {
    logError('Close all error', error);
    return jsonError('Internal server error', 500);
  }
}
