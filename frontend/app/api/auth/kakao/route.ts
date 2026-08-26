import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const key = process.env.KAKAO_REST_API_KEY;
  const redirectUri = process.env.KAKAO_REDIRECT_URI || `${request.nextUrl.origin}/api/auth/kakao/callback`;
  if (!key) {
    return NextResponse.redirect(new URL("/signup?error=kakao_config", request.url));
  }

  const mode = request.nextUrl.searchParams.get("mode") === "login" ? "login" : "signup";
  const authorize = new URL("https://kauth.kakao.com/oauth/authorize");
  authorize.searchParams.set("client_id", key);
  authorize.searchParams.set("redirect_uri", redirectUri);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "profile_nickname,account_email");
  authorize.searchParams.set("state", mode);
  return NextResponse.redirect(authorize);
}
