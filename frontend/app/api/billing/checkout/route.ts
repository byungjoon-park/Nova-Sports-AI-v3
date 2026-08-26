import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const PRICE_ENV: Record<string, string> = {
  pro: "STRIPE_PRICE_PRO",
  team: "STRIPE_PRICE_TEAM",
};

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "결제 시스템이 아직 연결되지 않았습니다. STRIPE_SECRET_KEY를 설정하세요." }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { plan?: string; email?: string } | null;
  const plan = body?.plan && PRICE_ENV[body.plan] ? body.plan : "";
  const priceId = plan ? process.env[PRICE_ENV[plan]] : undefined;
  const configPath = path.join(process.cwd(), "data", "billing-prices.json");
  let configuredAmount = 0;
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(raw) as { pro?: number; team?: number };
    configuredAmount = Number(config[plan as "pro" | "team"] || 0);
  } catch {}
  const useDynamicAmount = Number.isInteger(configuredAmount) && configuredAmount > 0;
  if (!priceId && !useDynamicAmount) return NextResponse.json({ error: "선택한 구독 플랜의 Stripe Price ID 또는 유효한 월 금액이 설정되지 않았습니다." }, { status: 400 });
  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const form = new URLSearchParams();
  form.set("mode", "subscription");
  if (useDynamicAmount) {
    const productName = plan === "team" ? "NOVA Sports AI Team" : "NOVA Sports AI Pro";
    form.set("line_items[0][price_data][currency]", "krw");
    form.set("line_items[0][price_data][unit_amount]", String(configuredAmount));
    form.set("line_items[0][price_data][recurring][interval]", "month");
    form.set("line_items[0][price_data][product_data][name]", productName);
  } else {
    form.set("line_items[0][price]", priceId as string);
  }
  form.set("line_items[0][quantity]", "1");
  form.set("success_url", `${origin}/dashboard?billing=success`);
  form.set("cancel_url", `${origin}/dashboard?billing=cancelled`);
  form.set("locale", "ko");
  if (body?.email) form.set("customer_email", body.email);
  form.set("metadata[plan]", plan);
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
  return NextResponse.json({ url: data.url, sessionId: data.id });
}
