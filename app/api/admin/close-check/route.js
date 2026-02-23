import { closeAuction } from '@/lib/closeAuction';
import { jsonError } from '@/lib/apiResponses';
import { logError, logWarn } from '@/lib/logger';

// Prefer x-auction-cron-secret header over query params so the secret doesn't appear in server logs or referrers.
function isAuthorized(req) {
  const cronSecret = process.env.AUCTION_CRON_SECRET;
  if (!cronSecret) {
    logWarn('close-check: AUCTION_CRON_SECRET not configured.');
    return false;
  }

  const headerValue = req.headers.get('x-auction-cron-secret');
  if (headerValue && headerValue === cronSecret) {
    return true;
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token') || url.searchParams.get('secret');
    if (token && token === cronSecret) {
      return true;
    }
  } catch (error) {
    logError('close-check: failed to parse request url', error);
  }

  return false;
}

async function handleRequest(req) {
  if (!isAuthorized(req)) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const result = await closeAuction({ triggeredBy: 'scheduler' });

    if (!result.ok) {
      const status = result.state === 'error' ? 500 : 400;
      return Response.json(result, { status, headers: { 'Content-Type': 'application/json' } });
    }

    return Response.json(result);
  } catch (error) {
    logError('close-check: unexpected error', error);
    return jsonError('Internal server error', 500);
  }
}

export async function POST(req) {
  return handleRequest(req);
}

export async function GET(req) {
  return handleRequest(req);
}

