import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const PRICE_ENV: Record<string, string> = { pro: "STRIPE_PRICE_PRO", team: "STRIPE_PRICE_TEAM" };

type CheckoutBody = {
  plan?: "pro" | "team";
  billingMode?: "subscription" | "payment";
  email?: string;
  athleteId?: string;
  parentEmail?: string;
  parentName?: string;
  teamName?: string;
  memberCount?: string | number;
  returnPath?: string;
};

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "결제 시스템이 아직 연결되지 않았습니다. STRIPE_SECRET_KEY를 설정하세요." }, { status: 503 });

  const body = await request.json().catch(() => null) as CheckoutBody | null;
  const plan = body?.plan === "team" ? "team" : "pro";
  const isTeamPayment = plan === "team";
  const billingMode = isTeamPayment ? "payment" : "subscription";
  const priceId = process.env[PRICE_ENV[plan]];

  const configPath = path.join(process.cwd(), "data", "billing-prices.json");
  let configuredAmount = 0;
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(raw) as { pro?: number; team?: number };
    configuredAmount = Number(config[plan] || 0);
  } catch {}

  const useDynamicAmount = Number.isInteger(configuredAmount) && configuredAmount > 0;
  if (!priceId && !useDynamicAmount) {
    return NextResponse.json({ error: "선택한 결제 상품의 Stripe Price ID 또는 유효한 금액이 설정되지 않았습니다." }, { status: 400 });
  }

  if (isTeamPayment && !body?.teamName?.trim()) {
    return NextResponse.json({ error: "팀명을 입력하세요." }, { status: 400 });
  }
  if (isTeamPayment && !String(body?.memberCount ?? "").trim()) {
    return NextResponse.json({ error: "팀 인원을 입력하세요." }, { status: 400 });
  }

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const safeReturnPath = body?.returnPath === "/mobile/billing" ? "/mobile/billing" : body?.returnPath === "/team-billing" ? "/team-billing" : "/billing";
  const form = new URLSearchParams();

  // 선수는 월 구독, 팀 단체결제는 일시 결제입니다.
  form.set("mode", billingMode);
  // 모든 결제는 카드만 허용합니다.
  form.set("payment_method_types[0]", "card");

  if (isTeamPayment) {
    if (useDynamicAmount) {
      form.set("line_items[0][price_data][currency]", "krw");
      form.set("line_items[0][price_data][unit_amount]", String(configuredAmount));
      form.set("line_items[0][price_data][product_data][name]", "NOVA Sports AI Team");
    } else {
      form.set("line_items[0][price]", priceId as string);
    }
    // Stripe Checkout에서 카드 할부 선택을 허용합니다.
    form.set("payment_method_options[card][installments][enabled]", "true");
  } else if (useDynamicAmount) {
    form.set("line_items[0][price_data][currency]", "krw");
    form.set("line_items[0][price_data][unit_amount]", String(configuredAmount));
    form.set("line_items[0][price_data][recurring][interval]", "month");
    form.set("line_items[0][price_data][product_data][name]", "NOVA Sports AI Pro");
  } else {
    form.set("line_items[0][price]", priceId as string);
  }

  form.set("line_items[0][quantity]", "1");
  form.set("success_url", `${origin}${safeReturnPath}?billing=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${origin}${safeReturnPath}?billing=cancelled`);
  form.set("locale", "ko");
  if (body?.email) form.set("customer_email", body.email);
  form.set("metadata[plan]", plan);
  form.set("metadata[billingMode]", billingMode);
  if (body?.athleteId) form.set("metadata[athleteId]", body.athleteId);
  if (body?.parentEmail) form.set("metadata[parentEmail]", body.parentEmail.trim().toLowerCase());
  if (body?.parentName) form.set("metadata[parentName]", body.parentName.trim());
  if (isTeamPayment) {
    form.set("metadata[teamName]", body?.teamName?.trim() || "");
    form.set("metadata[memberCount]", String(body?.memberCount ?? "").trim());
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.url !== "string") {
    return NextResponse.json({ error: data?.error?.message || "결제 세션을 만들지 못했습니다." }, { status: 502 });
  }
  return NextResponse.json({ url: data.url, sessionId: data.id, billingMode });
}
