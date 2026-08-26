import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

type Notice = {
  title: string;
  body: string;
  updatedAt: string;
  publishedBy: string;
  audience: string[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "nova-notice.json");

async function readNotice(): Promise<Notice | null> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as Notice;
  } catch {
    return null;
  }
}

export async function GET() {
  const notice = await readNotice();
  return NextResponse.json({ notice });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const title = String(payload?.title || "").trim();
    const body = String(payload?.body || "").trim();

    if (!title || !body) {
      return NextResponse.json({ error: "공지 제목과 내용을 입력하세요." }, { status: 400 });
    }

    const notice: Notice = {
      title,
      body,
      updatedAt: new Date().toISOString(),
      publishedBy: String(payload?.publishedBy || "admin"),
      audience: ["director", "coach", "athlete", "parent"],
    };

    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(notice, null, 2), "utf8");

    return NextResponse.json({ notice });
  } catch {
    return NextResponse.json({ error: "공지 저장에 실패했습니다." }, { status: 500 });
  }
}
