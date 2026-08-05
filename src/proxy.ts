import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken } from './lib/auth';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Exclude login and auth APIs from checks
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const verified = await verifySessionToken(token);

  if (!verified) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    // Clear invalid cookie
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      expires: new Date(0),
      path: '/',
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on all routes except static files & specific paths
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
