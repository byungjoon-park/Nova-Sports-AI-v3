"use client";

import { useEffect, useMemo, useState } from "react";

const defaultPrices = { pro: 49000, team: 129000 };
type PlanId = keyof typeof defaultPrices;
const planMeta: Record<PlanId, { name: string; desc: string }> = {
  pro: { name: "Pro", desc: "개인 선수 관리 · AI 분석" },
  team: { name: "Team", desc: "팀 선수 관리 · 분석 · 리포트" },
};
type PriceHistory = { pro: number; team: number; effectiveAt: string };
type BillingSummary = {
  currency: string;
  year: number;
  monthly: { gross: number; refunds: number; net: number };
  annual: { gross: number; refunds: number; net: number };
  months: Array<{ month: number; gross: number; refunds: number; net: number }>;
  annuals: Array<{ year: number; gross: number; refunds: number; net: number }>;
  transactionCount: number;
  updatedAt: string;
};

export default function BillingPanel() {
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [prices, setPrices] = useState(defaultPrices);
  const [pricesSaved, setPricesSaved] = useState(false);
  const [effectiveAt, setEffectiveAt] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [printMode, setPrintMode] = useState<"monthly" | "yearly" | "all" | null>(null);

  const loadSummary = async (year = selectedYear) => {
    setSummaryLoading(true);
    try {
      const response = await fetch(`/api/billing/summary?year=${year}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "매출 데이터를 불러오지 못했습니다.");
      setSummary(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "매출 데이터를 불러오지 못했습니다.");
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    void loadSummary();

    const loadPrices = async () => {
      try {
        const response = await fetch("/api/billing/prices", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        setPrices((current) => ({
          pro: Number(data.pro) || current.pro,
          team: Number(data.team) || current.team,
        }));
        setEffectiveAt(data.effectiveAt || null);
        setPriceHistory(Array.isArray(data.history) ? data.history : []);
      } catch {}
    };

    void loadPrices();
  }, []);

  useEffect(() => {
    if (selectedYear !== new Date().getFullYear()) void loadSummary(selectedYear);
  }, [selectedYear]);

  const money = useMemo(() => new Intl.NumberFormat("ko-KR", { style: "currency", currency: summary?.currency || "KRW", maximumFractionDigits: 0 }), [summary?.currency]);
  const printBilling = (mode: "monthly" | "yearly" | "all") => {
    setPrintMode(mode);
    document.documentElement.dataset.printBilling = mode;
    document.body.classList.add("nova-print-billing");
    window.setTimeout(() => {
      window.print();
      window.setTimeout(() => {
        delete document.documentElement.dataset.printBilling;
        document.body.classList.remove("nova-print-billing");
        setPrintMode(null);
      }, 300);
    }, 50);
  };

  const checkout = async (plan: PlanId) => {
    setLoading(plan); setError("");
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, amount: prices[plan] }) });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "결제 페이지를 열 수 없습니다.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제 연결에 실패했습니다."); setLoading("");
    }
  };

  return <section className="admin-billing-panel">
    <div className="admin-billing-head"><div><span>STRIPE BILLING</span><h3>구독 · 결제</h3><p>월별·년도별 실제 Stripe 거래 데이터를 조회합니다.</p></div><div className="admin-billing-actions"><select aria-label="매출 조회 연도" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>{Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => <option key={year} value={year}>{year}년</option>)}</select><button className="admin-secondary-button" onClick={() => void loadSummary()} disabled={summaryLoading}>새로고침</button><button className="admin-secondary-button admin-print-button" onClick={() => printBilling("all")} disabled={summaryLoading}>{printMode === "all" ? "인쇄 준비 중…" : "전체 출력"}</button></div></div>
    <div className="admin-billing-summary-grid">
      <article><span>선택 연도 매출</span><strong>{summaryLoading ? "—" : money.format(summary?.annual.gross || 0)}</strong><small>{selectedYear}년 총 결제액</small></article>
      <article><span>선택 연도 환불</span><strong>{summaryLoading ? "—" : money.format(summary?.annual.refunds || 0)}</strong><small>{selectedYear}년 환불액</small></article>
      <article><span>선택 연도 순매출</span><strong>{summaryLoading ? "—" : money.format(summary?.annual.net || 0)}</strong><small>{summary?.transactionCount || 0}건</small></article>
      <article><span>이번 달 매출</span><strong>{summaryLoading ? "—" : money.format(summary?.monthly.gross || 0)}</strong><small>현재 월</small></article>
      <article><span>이번 달 환불</span><strong>{summaryLoading ? "—" : money.format(summary?.monthly.refunds || 0)}</strong><small>현재 월</small></article>
      <article><span>이번 달 순매출</span><strong>{summaryLoading ? "—" : money.format(summary?.monthly.net || 0)}</strong><small>현재 월</small></article>
    </div>

    <div className="admin-billing-grid">
      <article className="admin-billing-card admin-billing-monthly" style={{ gridColumn: "1 / -1" }}>
        <div className="admin-billing-section-head"><div><span>MONTHLY REVENUE</span><h4>{selectedYear}년 월별 매출 · 환불</h4></div><button className="admin-secondary-button admin-print-button" onClick={() => printBilling("monthly")} disabled={summaryLoading}>{printMode === "monthly" ? "인쇄 준비 중…" : "월별 출력"}</button></div>
        <div className="admin-table-wrap"><table><thead><tr><th>월</th><th>매출</th><th>환불</th><th>순매출</th></tr></thead><tbody>{summary?.months.map((row) => <tr key={row.month}><td>{row.month}월</td><td>{money.format(row.gross)}</td><td>{money.format(row.refunds)}</td><td>{money.format(row.net)}</td></tr>)}</tbody></table></div>
      </article>
    </div>

    <div className="admin-billing-grid">
      <article className="admin-billing-card admin-billing-yearly" style={{ gridColumn: "1 / -1" }}>
        <div className="admin-billing-section-head"><div><span>YEARLY REVENUE</span><h4>년도별 매출 · 환불 내역</h4></div><button className="admin-secondary-button admin-print-button" onClick={() => printBilling("yearly")} disabled={summaryLoading}>{printMode === "yearly" ? "인쇄 준비 중…" : "년도별 출력"}</button></div>
        <div className="admin-table-wrap"><table><thead><tr><th>년도</th><th>매출</th><th>환불</th><th>순매출</th></tr></thead><tbody>{summary?.annuals.map((row) => <tr key={row.year}><td>{row.year}년</td><td>{money.format(row.gross)}</td><td>{money.format(row.refunds)}</td><td>{money.format(row.net)}</td></tr>)}</tbody></table></div>
      </article>
    </div>

    <div className="admin-billing-grid">
      {(Object.keys(defaultPrices) as PlanId[]).map((id) => <article key={id} className="admin-billing-card admin-billing-plan-card"><span>{planMeta[id].name}</span><strong>{money.format(prices[id])}<small>/월</small></strong><p>{planMeta[id].desc}</p><label className="admin-billing-price-field">월 금액<input type="number" min="0" step="1000" value={prices[id]} onChange={(event) => setPrices((current) => ({ ...current, [id]: Number(event.target.value) || 0 }))} /></label><button className="admin-primary-button" disabled={loading !== "" || prices[id] <= 0} onClick={() => void checkout(id)}>{loading === id ? "결제 준비 중…" : `${planMeta[id].name} 결제 테스트`}</button></article>)}
    </div>
    <div className="admin-billing-actions"><button className="admin-secondary-button" type="button" onClick={async () => {
      try {
        const response = await fetch("/api/billing/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prices) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "금액을 저장하지 못했습니다.");
        setEffectiveAt(data.effectiveAt || null);
        setPriceHistory(Array.isArray(data.history) ? data.history : []);
        setPricesSaved(true);
        window.setTimeout(() => setPricesSaved(false), 1600);
      } catch (err) {
        setError(err instanceof Error ? err.message : "금액을 저장하지 못했습니다.");
      }
    }}>{pricesSaved ? "금액 저장됨" : "월 금액 저장"}</button></div>
    {effectiveAt && <p className="admin-billing-note">현재 금액은 {new Date(effectiveAt).toLocaleString("ko-KR")} 저장 시점부터 신규 결제에 적용됩니다. 이미 결제된 구독에는 소급 적용되지 않습니다.</p>}
    <div className="admin-billing-card admin-billing-price-history" style={{ gridColumn: "1 / -1" }}><span>PRICE HISTORY</span><h4>월 금액 변경 이력</h4><div className="admin-table-wrap"><table><thead><tr><th>변경일시</th><th>Pro 월 금액</th><th>Team 월 금액</th><th>적용 기준</th></tr></thead><tbody>{priceHistory.length ? [...priceHistory].reverse().map((item) => <tr key={item.effectiveAt}><td>{new Date(item.effectiveAt).toLocaleString("ko-KR")}</td><td>{money.format(item.pro)}</td><td>{money.format(item.team)}</td><td>해당 시점 이후 신규 결제</td></tr>) : <tr><td colSpan={4}>아직 변경 이력이 없습니다.</td></tr>}</tbody></table></div></div>
    {error && <p className="admin-billing-error">{error}</p>}
    <div className="admin-billing-note">월별 매출·환불은 선택한 연도의 Stripe Balance Transaction을 기준으로 집계합니다. 실제 운영에서는 Stripe 웹훅 및 영구 DB 연동을 함께 구성해야 합니다.</div>
  </section>;
}
