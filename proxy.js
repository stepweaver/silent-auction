import { NextResponse } from 'next/server';

export function proxy(request) {
  // Only protect /admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization') || '';
    const [scheme, encoded] = authHeader.split(' ');

    let isAuthorized = false;

    if (scheme === 'Basic' && encoded) {
      try {
        const decoded = Buffer.from(encoded, 'base64').toString();
        const [username, password] = decoded.split(':');

        isAuthorized =
          username === process.env.BASIC_AUTH_USER &&
          password === process.env.BASIC_AUTH_PASS;
      } catch {
        // Invalid encoding
      }
    }

    if (!isAuthorized) {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Area"',
        },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};

