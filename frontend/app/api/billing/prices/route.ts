import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const defaultPrices = { pro: 49000, team: 129000 };
type PriceHistory = { pro: number; team: number; effectiveAt: string };
const filePath = path.join(process.cwd(), "data", "billing-prices.json");

async function readConfig() {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const config = JSON.parse(raw);
    return { ...defaultPrices, ...config, history: Array.isArray(config.history) ? config.history : [] };
  } catch {
    return { ...defaultPrices, effectiveAt: null as string | null, history: [] as PriceHistory[] };
  }
}

export async function GET() {
  return NextResponse.json(await readConfig(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { pro?: number; team?: number };
    const pro = Number(body.pro);
    const team = Number(body.team);
    if (!Number.isInteger(pro) || pro <= 0 || !Number.isInteger(team) || team <= 0) {
      return NextResponse.json({ error: "유효한 월 금액을 입력하세요." }, { status: 400 });
    }
    const effectiveAt = new Date().toISOString();
    const previous = await readConfig();
    const history = Array.isArray(previous.history) ? previous.history : [];
    const config = { pro, team, effectiveAt, history: [...history, { pro, team, effectiveAt }] };
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf8");
    return NextResponse.json(config, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "금액을 저장하지 못했습니다." }, { status: 500 });
  }
}
