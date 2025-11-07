import { closeAuction } from '@/lib/closeAuction';

function isAuthorized(req) {
  const cronSecret = process.env.AUCTION_CRON_SECRET;
  if (!cronSecret) {
    console.warn('close-check: AUCTION_CRON_SECRET not configured.');
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
    console.error('close-check: failed to parse request url', error);
  }

  return false;
}

async function handleRequest(req) {
  if (!isAuthorized(req)) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await closeAuction({ triggeredBy: 'scheduler' });

    if (!result.ok) {
      const status = result.state === 'error' ? 500 : 400;
      return Response.json(result, { status });
    }

    return Response.json(result);
  } catch (error) {
    console.error('close-check: unexpected error', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(req) {
  return handleRequest(req);
}

export async function GET(req) {
  return handleRequest(req);
}

