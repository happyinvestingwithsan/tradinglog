import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return new NextResponse('Google Client ID is not configured in environment variables (GOOGLE_CLIENT_ID).', { status: 500 });
  }

  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/callback/google`;

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
  }).toString();

  return NextResponse.redirect(googleAuthUrl);
}
