import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');

  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectUri = `${protocol}://${host}/api/auth/callback/google`;
  const loginRedirectUrl = `${protocol}://${host}/login`;
  const dashboardRedirectUrl = `${protocol}://${host}/`;

  if (errorParam || !code) {
    return NextResponse.redirect(`${loginRedirectUrl}?error=oauth_failed`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const authorizedEmail = process.env.AUTHORIZED_EMAIL;

  if (!clientId || !clientSecret || !authorizedEmail) {
    console.error("Missing Google Auth config in server environment:", { 
      clientId: !!clientId, 
      clientSecret: !!clientSecret, 
      authorizedEmail: !!authorizedEmail 
    });
    return NextResponse.redirect(`${loginRedirectUrl}?error=missing_config`);
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(`${loginRedirectUrl}?error=token_exchange_failed`);
    }

    // Fetch user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.email) {
      console.error("User info fetch failed:", userData);
      return NextResponse.redirect(`${loginRedirectUrl}?error=user_info_failed`);
    }

    const email = userData.email.toLowerCase().trim();
    const allowedEmail = authorizedEmail.toLowerCase().trim();

    if (email !== allowedEmail) {
      console.warn(`Unauthorized login attempt by: ${email}`);
      return NextResponse.redirect(`${loginRedirectUrl}?error=unauthorized_email`);
    }

    // Create session token
    const token = await createSessionToken({
      email,
      name: userData.name || userData.given_name,
    });

    // Set secure cookie
    const response = NextResponse.redirect(dashboardRedirectUrl);
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: true, // Always true on Vercel/HTTPS, lax/secure is best for cookies
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    console.error("Google Auth Callback Exception:", err);
    return NextResponse.redirect(`${loginRedirectUrl}?error=exception`);
  }
}
