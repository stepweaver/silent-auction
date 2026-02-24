import { NextResponse } from 'next/server';
import { hasEnrollmentCookie } from '@/lib/enrollmentCookie';

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

const ENROLLMENT_PROTECTED_PATHS = [
  '/',
  '/leaderboard',
  '/donate',
  '/avatar',
  '/payment-instructions',
];

function isEnrollmentProtectedPath(pathname) {
  if (ENROLLMENT_PROTECTED_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/i/') || pathname === '/i') return true;
  return false;
}

export function proxy(request) {
  const pathname = request.nextUrl.pathname;

  if (isEnrollmentProtectedPath(pathname) && !hasEnrollmentCookie(request)) {
    return NextResponse.redirect(new URL('/landing', request.url));
  }

  const requiresAuth =
    pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  if (requiresAuth && !isAuthorized(request)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Admin Area"',
      },
    });
  }

  return NextResponse.next();
}

