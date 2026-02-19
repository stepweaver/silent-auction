import { NextResponse } from 'next/server';

const decodeBase64 = (value) => {
  try {
    return atob(value);
  } catch {
    return '';
  }
};

const isAuthorized = (request) => {
  const authHeader = request.headers.get('authorization') || '';
  const [scheme, encoded] = authHeader.split(' ');

  if (scheme !== 'Basic' || !encoded) {
    return false;
  }

  const decoded = decodeBase64(encoded);
  if (!decoded) {
    return false;
  }

  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    return false;
  }

  const username = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  return (
    username === process.env.BASIC_AUTH_USER &&
    password === process.env.BASIC_AUTH_PASS
  );
};

export function proxy(request) {
  const pathname = request.nextUrl.pathname;
  const requiresAuth =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

  if (!requiresAuth) {
    return NextResponse.next();
  }

  if (!isAuthorized(request)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Area"',
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};


