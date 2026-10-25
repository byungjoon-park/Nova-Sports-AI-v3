import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Stripe 결제 설정이 필요합니다." }, { status: 503 });
  }

  const sessionId = new URL(request.url).searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id가 필요합니다." }, { status: 400 });
  }

  const response = await fetch(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`,
    {
      headers: { Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}` },
      cache: "no-store",
    },
  );

  const session = await response.json();
  if (!response.ok) {
    return NextResponse.json(
      { error: session?.error?.message || "결제 확인에 실패했습니다." },
      { status: 502 },
    );
  }

  const paid = session.payment_status === "paid" && session.status === "complete";
  const metadata = session.metadata || {};
  const subscription =
    session.subscription && typeof session.subscription === "object"
      ? session.subscription
      : null;

  return NextResponse.json(
    {
      paid,
      athleteId: metadata.athleteId || session.client_reference_id || "",
      parentEmail: metadata.parentEmail || "",
      parentName: metadata.parentName || "",
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : undefined,
      stripeSubscriptionId:
        typeof session.subscription === "string"
          ? session.subscription
          : subscription?.id,
      currentPeriodEnd:
        typeof subscription?.current_period_end === "number"
          ? subscription.current_period_end
          : null,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
    },
    { status: paid ? 200 : 402 },
  );
}
