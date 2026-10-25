import { NextResponse } from "next/server";

const stripe = async (subscriptionId: string, init?: RequestInit) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY가 설정되지 않았습니다.");

  const response = await fetch(
    `https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        ...(init?.headers || {}),
      },
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Stripe 구독 요청에 실패했습니다.");
  }
  return data;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as {
      subscriptionId?: string;
    } | null;

    const subscriptionId = body?.subscriptionId?.trim();
    if (!subscriptionId) {
      return NextResponse.json({ error: "Stripe Subscription ID가 필요합니다." }, { status: 400 });
    }

    const subscription = await stripe(subscriptionId, {
      method: "POST",
      body: "cancel_at_period_end=true",
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      currentPeriodEnd:
        typeof subscription.current_period_end === "number"
          ? subscription.current_period_end
          : null,
      status: subscription.status || "unknown",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "월 구독 취소 신청에 실패했습니다." },
      { status: 503 },
    );
  }
}
