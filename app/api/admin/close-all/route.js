import { headers } from 'next/headers';
import { checkBasicAuth } from '@/lib/auth';
import { closeAuction } from '@/lib/closeAuction';

export async function POST(req) {
  const headersList = await headers();
  if (!checkBasicAuth(headersList)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Admin Area"' },
    });
  }

  try {
    const result = await closeAuction({ force: true, triggeredBy: 'manual' });

    if (!result.ok) {
      return Response.json(result, { status: 500 });
    }

    return Response.json(result);
  } catch (error) {
    console.error('Close all error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
