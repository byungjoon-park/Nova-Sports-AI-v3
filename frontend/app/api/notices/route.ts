import { NextResponse } from "next/server";

type Notice = {
  id: string;
  title: string;
  body: string;
  type: "manual" | "update";
  createdAt: string;
};

const globalNotices: Notice[] = [];

export async function GET() {
  return NextResponse.json({ notices: globalNotices }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Partial<Notice> | null;
  if (!body?.title?.trim() || !body?.body?.trim()) {
    return NextResponse.json({ error: "제목과 내용을 입력하세요." }, { status: 400 });
  }
  const notice: Notice = {
    id: `NOTICE-${Date.now()}`,
    title: body.title.trim(),
    body: body.body.trim(),
    type: body.type === "update" ? "update" : "manual",
    createdAt: new Date().toISOString(),
  };
  globalNotices.unshift(notice);
  return NextResponse.json(notice, { status: 201 });
}
