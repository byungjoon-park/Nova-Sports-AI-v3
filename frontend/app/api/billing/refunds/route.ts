import { NextResponse } from "next/server";

const stripe = async (path: string, init?: RequestInit) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY가 설정되지 않았습니다.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Stripe 요청에 실패했습니다.");
  return data;
};

export async function GET() {
  try {
    const data = await stripe("refunds?limit=20");
    return NextResponse.json({
      refunds: (data.data || []).map((item: any) => ({
        id: item.id,
        amount: item.amount,
        currency: String(item.currency || "krw").toUpperCase(),
        status: item.status || "unknown",
        reason: item.reason || "-",
        created: item.created,
        charge: item.charge || "-",
        paymentIntent: item.payment_intent || "-",
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "환불 데이터를 불러오지 못했습니다." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as { paymentIntent?: string; charge?: string; amount?: number; reason?: string } | null;
    const target = body?.paymentIntent || body?.charge;
    if (!target) return NextResponse.json({ error: "PaymentIntent 또는 Charge ID가 필요합니다." }, { status: 400 });

    const form = new URLSearchParams();
    if (body.paymentIntent) form.set("payment_intent", body.paymentIntent);
    if (body.charge) form.set("charge", body.charge);
    if (typeof body.amount === "number" && body.amount > 0) form.set("amount", String(Math.round(body.amount)));
    if (body.reason) form.set("reason", body.reason);

    const refund = await stripe("refunds", { method: "POST", body: form.toString() });
    return NextResponse.json({
      refund: {
        id: refund.id,
        amount: refund.amount,
        currency: String(refund.currency || "krw").toUpperCase(),
        status: refund.status || "unknown",
        created: refund.created,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "환불 처리에 실패했습니다." }, { status: 503 });
  }
}
