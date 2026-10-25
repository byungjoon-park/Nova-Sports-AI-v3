import { NextRequest, NextResponse } from "next/server";

function config() {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { url, key } = config();
  if (!url || !key) return NextResponse.json({ error: "Feedback database is not configured." }, { status: 503 });
  const { id } = await params;
  const body = await request.json();
  const fromEmail = typeof body.fromEmail === "string" ? body.fromEmail.trim().toLowerCase() : "";
  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!id || !fromEmail || !text) return NextResponse.json({ error: "Invalid feedback update." }, { status: 400 });

  const query = new URLSearchParams({
    from_email: `eq.${fromEmail}`,
  });
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/nova_feedback?id=eq.${encodeURIComponent(id)}&${query.toString()}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ body: text, updated_at: body.updatedAt || new Date().toISOString() }),
  });
  if (!response.ok) return NextResponse.json({ error: await response.text() }, { status: response.status });
  return NextResponse.json({ ok: true });
}
