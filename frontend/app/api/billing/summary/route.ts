import { NextResponse } from "next/server";

const stripeRequest = async (path: string) => {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY가 설정되지 않았습니다.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Stripe 데이터를 불러오지 못했습니다.");
  return data;
};

const sum = (items: Array<{ amount?: number; net?: number }>, key: "amount" | "net") =>
  items.reduce((total, item) => total + Number(item[key] || 0), 0);

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedYear = Number(url.searchParams.get("year"));
    const currentYear = new Date().getFullYear();
    const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= currentYear + 1 ? requestedYear : currentYear;
    const historyStartYear = Math.max(2000, currentYear - 4);
    const historyStartDate = new Date(historyStartYear, 0, 1);
    const historyEndDate = new Date(currentYear + 1, 0, 1);
    const yearStartDate = new Date(year, 0, 1);
    const yearEndDate = year === currentYear ? new Date() : new Date(year + 1, 0, 1);
    const historyStart = Math.floor(historyStartDate.getTime() / 1000);
    const historyEnd = Math.floor(historyEndDate.getTime() / 1000);
    const yearStart = Math.floor(yearStartDate.getTime() / 1000);
    const yearEnd = Math.floor(yearEndDate.getTime() / 1000);

    const loadTransactions = async (createdGte: number, createdLte: number) => {
      const items: Array<{ id?: string; amount?: number; net?: number; type?: string; created?: number; currency?: string }> = [];
      let startingAfter = "";
      for (let page = 0; page < 20; page += 1) {
        const params = new URLSearchParams({ limit: "100", "created[gte]": String(createdGte), "created[lte]": String(createdLte) });
        if (startingAfter) params.set("starting_after", startingAfter);
        const data = await stripeRequest(`balance_transactions?${params.toString()}`);
        items.push(...(data.data || []));
        if (!data.has_more || !data.data?.length) break;
        startingAfter = data.data[data.data.length - 1].id;
      }
      return items;
    };

    const transactions = await loadTransactions(historyStart, historyEnd);
    const revenueTypes = new Set(["charge", "payment"]);
    const refundTypes = new Set(["refund", "payment_refund"]);
    const gross = (items: typeof transactions) => sum(items.filter((item) => revenueTypes.has(item.type || "")), "amount");
    const refunds = (items: typeof transactions) => Math.abs(sum(items.filter((item) => refundTypes.has(item.type || "")), "amount"));
    const net = (items: typeof transactions) => sum(items, "net");

    const months = Array.from({ length: 12 }, (_, index) => {
      const monthStart = Math.floor(new Date(year, index, 1).getTime() / 1000);
      const monthEnd = Math.floor(new Date(year, index + 1, 1).getTime() / 1000);
      const monthTransactions = transactions.filter((item) => {
        const created = Number(item.created || 0);
        return created >= monthStart && created < monthEnd;
      });
      return {
        month: index + 1,
        gross: gross(monthTransactions),
        refunds: refunds(monthTransactions),
        net: net(monthTransactions),
      };
    });

    const annuals = Array.from({ length: 5 }, (_, index) => currentYear - 4 + index).map((annualYear) => {
      const start = Math.floor(new Date(annualYear, 0, 1).getTime() / 1000);
      const end = Math.floor(new Date(annualYear + 1, 0, 1).getTime() / 1000);
      const annualTransactions = transactions.filter((item) => {
        const created = Number(item.created || 0);
        return created >= start && created < end;
      });
      return {
        year: annualYear,
        gross: gross(annualTransactions),
        refunds: refunds(annualTransactions),
        net: net(annualTransactions),
      };
    }).reverse();

    const currency = transactions.find((item) => item.currency)?.currency?.toUpperCase() || "KRW";
    return NextResponse.json({
      year,
      currency,
      monthly: { gross: gross(transactions.filter((item) => { const created = Number(item.created || 0); const monthStart = Math.floor(new Date(year, new Date().getMonth(), 1).getTime() / 1000); const monthEnd = Math.floor(new Date(year, new Date().getMonth() + 1, 1).getTime() / 1000); return created >= monthStart && created < monthEnd; })), refunds: refunds(transactions.filter((item) => { const created = Number(item.created || 0); const monthStart = Math.floor(new Date(year, new Date().getMonth(), 1).getTime() / 1000); const monthEnd = Math.floor(new Date(year, new Date().getMonth() + 1, 1).getTime() / 1000); return created >= monthStart && created < monthEnd; })), net: net(transactions.filter((item) => { const created = Number(item.created || 0); const monthStart = Math.floor(new Date(year, new Date().getMonth(), 1).getTime() / 1000); const monthEnd = Math.floor(new Date(year, new Date().getMonth() + 1, 1).getTime() / 1000); return created >= monthStart && created < monthEnd; })) },
      annual: { gross: gross(transactions.filter((item) => { const created = Number(item.created || 0); return created >= yearStart && created < yearEnd; })), refunds: refunds(transactions.filter((item) => { const created = Number(item.created || 0); return created >= yearStart && created < yearEnd; })), net: net(transactions.filter((item) => { const created = Number(item.created || 0); return created >= yearStart && created < yearEnd; })) },
      months,
      annuals,
      transactionCount: transactions.filter((item) => { const created = Number(item.created || 0); return created >= yearStart && created < yearEnd; }).length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "결제 데이터를 불러오지 못했습니다." }, { status: 503 });
  }
}
