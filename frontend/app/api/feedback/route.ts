import { NextRequest, NextResponse } from "next/server";

type FeedbackRow = {
  id: string;
  athlete_user_id: string;
  athlete_email: string;
  from_user_id: string;
  from_name: string;
  from_role: string;
  from_email: string;
  to_user_id: string;
  to_name: string;
  to_role: string;
  to_email: string;
  body: string;
  created_at: string;
  updated_at?: string | null;
};

function config() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function toFeedback(row: FeedbackRow) {
  return {
    id: row.id,
    athleteUserId: row.athlete_user_id,
    athleteEmail: row.athlete_email,
    fromUserId: row.from_user_id,
    fromName: row.from_name,
    fromRole: row.from_role,
    fromEmail: row.from_email,
    toUserId: row.to_user_id,
    toName: row.to_name,
    toRole: row.to_role,
    toEmail: row.to_email,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at || undefined,
  };
}

function supabaseHeaders(key: string) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function GET(request: NextRequest) {
  const { url, key } = config();
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!url || !key) return NextResponse.json({ error: "Feedback database is not configured." }, { status: 503 });
  if (!email) return NextResponse.json({ error: "email is required." }, { status: 400 });

  const query = new URLSearchParams({
    select: "*",
    or: `(from_email.eq.${email},to_email.eq.${email})`,
    order: "created_at.desc",
  });
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/nova_feedback?${query.toString()}`, {
    headers: supabaseHeaders(key),
    cache: "no-store",
  });
  if (!response.ok) {
    return NextResponse.json({ error: await response.text() }, { status: response.status });
  }
  const rows = await response.json() as FeedbackRow[];
  return NextResponse.json({ items: rows.map(toFeedback) });
}

export async function POST(request: NextRequest) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ error: "Feedback database is not configured." }, { status: 503 });
  const body = await request.json();
  const required = ["id", "athleteUserId", "athleteEmail", "fromUserId", "fromName", "fromRole", "fromEmail", "toUserId", "toName", "toRole", "toEmail", "body", "createdAt"];
  if (required.some((field) => typeof body[field] !== "string" || !body[field].trim())) {
    return NextResponse.json({ error: "Invalid feedback payload." }, { status: 400 });
  }

  const row = {
    id: body.id,
    athlete_user_id: body.athleteUserId,
    athlete_email: body.athleteEmail.trim().toLowerCase(),
    from_user_id: body.fromUserId,
    from_name: body.fromName,
    from_role: body.fromRole,
    from_email: body.fromEmail.trim().toLowerCase(),
    to_user_id: body.toUserId,
    to_name: body.toName,
    to_role: body.toRole,
    to_email: body.toEmail.trim().toLowerCase(),
    body: body.body.trim(),
    created_at: body.createdAt,
  };
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/nova_feedback`, {
    method: "POST",
    headers: { ...supabaseHeaders(key), Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
  if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: response.status });
  return NextResponse.json({ ok: true });
}
