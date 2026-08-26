import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state") === "login" ? "login" : "signup";
  const key = process.env.KAKAO_REST_API_KEY;
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/kakao/callback`;

  if (!code || !key) {
    return NextResponse.redirect(new URL("/signup?error=kakao_auth", request.url));
  }

  try {
    const tokenResponse = await fetch("https://kauth.kakao.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: key,
        redirect_uri: redirectUri,
        code,
        ...(process.env.KAKAO_CLIENT_SECRET ? { client_secret: process.env.KAKAO_CLIENT_SECRET } : {}),
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error("Kakao token exchange failed");
    const token = await tokenResponse.json();

    const profileResponse = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
      cache: "no-store",
    });
    if (!profileResponse.ok) throw new Error("Kakao profile request failed");
    const profile = await profileResponse.json();

    const email = profile?.kakao_account?.email || "";
    const name = profile?.kakao_account?.profile?.nickname || "카카오 사용자";
    if (!email) {
      return NextResponse.redirect(new URL("/signup?error=kakao_email", request.url));
    }

    // The current NOVA auth store is browser-local. The callback therefore
    // hands the verified Kakao profile to the signup screen for final role/terms consent.
    const target = new URL(state === "login" ? "/login" : "/signup", request.url);
    target.searchParams.set("kakao", "connected");
    target.searchParams.set("email", email);
    target.searchParams.set("name", name);
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(new URL("/signup?error=kakao_auth", request.url));
  }
}
