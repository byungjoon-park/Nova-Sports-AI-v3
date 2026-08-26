"use client";

import { useEffect, useMemo, useState } from "react";

type Refund = { id: string; amount: number; currency: string; status: string; reason: string; created: number; charge: string; paymentIntent: string };
type RequestRow = { id: string; user: string; product: string; amount: number; status: string; received: string; reason: string; paymentIntent?: string };
const seedRequests: RequestRow[] = [
  { id: "RF-260824-003", user: "김민수", product: "Pro 월 구독", amount: 49000, status: "환불 대기", received: "오늘 09:42", reason: "고객 요청" },
  { id: "RF-260823-018", user: "박지훈", product: "Team 월 구독", amount: 129000, status: "환불 검토", received: "어제 17:18", reason: "중복 결제" },
  { id: "RF-260822-011", user: "이서연", product: "Pro 월 구독", amount: 49000, status: "환불 대기", received: "08/22 14:06", reason: "서비스 불만" },
];

export default function RefundPanel() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>(() => { try { const r=localStorage.getItem("nova-refund-requests"); return r ? JSON.parse(r) : seedRequests; } catch { return seedRequests; } });
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [paymentIntent, setPaymentIntent] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("requested_by_customer");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = async () => { try { const r=await fetch("/api/billing/refunds",{cache:"no-store"}); const d=await r.json(); if(!r.ok) throw new Error(d.error||"환불 데이터를 불러오지 못했습니다."); setRefunds(d.refunds||[]); setError(""); } catch(e){ setError(e instanceof Error?e.message:"환불 데이터를 불러오지 못했습니다."); } };
  useEffect(()=>{void load();},[]);
  const [requestSort, setRequestSort] = useState("newest");
  const [refundSort, setRefundSort] = useState("newest");
  const reasonStats = useMemo(() => Array.from(new Set(requests.map(r=>r.reason))).map(reason=>({reason,count:requests.filter(r=>r.reason===reason).length})).sort((a,b)=>b.count-a.count || a.reason.localeCompare(b.reason,"ko")),[requests]);
  const sortedRequests = useMemo(() => {
    const next = [...requests];
    if (requestSort === "amount-desc") return next.sort((a,b)=>b.amount-a.amount);
    if (requestSort === "amount-asc") return next.sort((a,b)=>a.amount-b.amount);
    if (requestSort === "status") return next.sort((a,b)=>a.status.localeCompare(b.status,"ko") || a.id.localeCompare(b.id,"ko"));
    if (requestSort === "reason") return next.sort((a,b)=>a.reason.localeCompare(b.reason,"ko") || a.id.localeCompare(b.id,"ko"));
    if (requestSort === "product") return next.sort((a,b)=>a.product.localeCompare(b.product,"ko") || a.id.localeCompare(b.id,"ko"));
    return next;
  }, [requests, requestSort]);
  const sortedRefunds = useMemo(() => {
    const next = [...refunds];
    if (refundSort === "amount-desc") return next.sort((a,b)=>b.amount-a.amount);
    if (refundSort === "amount-asc") return next.sort((a,b)=>a.amount-b.amount);
    if (refundSort === "status") return next.sort((a,b)=>a.status.localeCompare(b.status,"ko") || b.created-a.created);
    if (refundSort === "reason") return next.sort((a,b)=>a.reason.localeCompare(b.reason,"ko") || b.created-a.created);
    return next.sort((a,b)=>b.created-a.created);
  }, [refunds, refundSort]);
  const money = useMemo(()=>new Intl.NumberFormat("ko-KR",{style:"currency",currency:refunds[0]?.currency||"KRW",maximumFractionDigits:0}),[refunds]);
  const date=(t:number)=>new Intl.DateTimeFormat("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(t*1000);
  const openRequest=(r:RequestRow)=>{setSelected(r);setPaymentIntent(r.paymentIntent||"");setAmount(String(r.amount));setConfirmed(false);setReason(r.reason==="중복 결제"?"duplicate":r.reason==="부정 결제"?"fraudulent":"requested_by_customer");};
  const refund=async()=>{if(!selected||!paymentIntent.trim()||!confirmed)return;setLoading(true);setError("");try{const r=await fetch("/api/billing/refunds",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({paymentIntent:paymentIntent.trim(),amount:amount?Number(amount):undefined,reason})});const d=await r.json();if(!r.ok)throw new Error(d.error||"환불 처리에 실패했습니다.");const next=requests.map(x=>x.id===selected.id?{...x,status:"환불 완료"}:x);setRequests(next);localStorage.setItem("nova-refund-requests",JSON.stringify(next));setSelected(null);setPaymentIntent("");setAmount("");setConfirmed(false);await load();}catch(e){setError(e instanceof Error?e.message:"환불 처리에 실패했습니다.");}finally{setLoading(false);}};
  return <section className="admin-panel"><div className="admin-panel-head"><div><span>STRIPE REFUNDS</span><h2>환불 관리</h2><p>환불 요청을 확인한 뒤 승인하여 실제 환불을 처리합니다.</p></div><button className="admin-secondary-button" onClick={()=>void load()}>새로고침</button></div>
    <div className="admin-refund-stats">{reasonStats.map(s=><article key={s.reason}><span>{s.reason}</span><strong>{s.count}</strong><small>건</small></article>)}</div>
    <div className="admin-research-filters"><label>요청 정렬<select value={requestSort} onChange={e=>setRequestSort(e.target.value)}><option value="newest">최신 요청순</option><option value="amount-desc">금액 높은순</option><option value="amount-asc">금액 낮은순</option><option value="status">상태순</option><option value="reason">사유순</option><option value="product">상품순</option></select></label></div>
    <div className="admin-table-wrap"><table><thead><tr><th>요청 번호</th><th>사용자</th><th>상품</th><th>금액</th><th>사유</th><th>상태</th><th>확인</th></tr></thead><tbody>{sortedRequests.map(r=><tr key={r.id}><td>{r.id}</td><td>{r.user}</td><td>{r.product}</td><td>{money.format(r.amount)}</td><td>{r.reason}</td><td><span className="admin-status">{r.status}</span></td><td><button className="admin-primary-button" disabled={r.status==="환불 완료"} onClick={()=>openRequest(r)}>{r.status==="환불 완료"?"완료":"확인 후 환불"}</button></td></tr>)}</tbody></table></div>
    {selected&&<div className="admin-refund-form"><div className="admin-panel-head"><div><span>REFUND REVIEW</span><h3>{selected.user} · {selected.product}</h3></div></div><label className="admin-field">PaymentIntent ID<input value={paymentIntent} onChange={e=>setPaymentIntent(e.target.value)} placeholder="pi_..." /></label><label className="admin-field">환불 금액<input value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9]/g,""))}/></label><label className="admin-field">처리 사유<select value={reason} onChange={e=>setReason(e.target.value)}><option value="requested_by_customer">고객 요청</option><option value="duplicate">중복 결제</option><option value="fraudulent">부정 결제</option></select></label><label className="admin-field admin-refund-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> 요청 내용과 금액을 확인했으며 환불 처리에 동의합니다.</label><div className="admin-billing-actions"><button className="admin-secondary-button" onClick={()=>setSelected(null)}>취소</button><button className="admin-primary-button" disabled={loading||!confirmed||!paymentIntent.trim()} onClick={()=>void refund()}>{loading?"환불 처리 중…":"실제 환불 처리"}</button></div></div>}
    {error&&<p className="admin-billing-error">{error}</p>}
    <div className="admin-research-filters"><label>환불 내역 정렬<select value={refundSort} onChange={e=>setRefundSort(e.target.value)}><option value="newest">최신 처리순</option><option value="amount-desc">금액 높은순</option><option value="amount-asc">금액 낮은순</option><option value="status">상태순</option><option value="reason">사유순</option></select></label></div>
    <div className="admin-table-wrap" style={{marginTop:18}}><table><thead><tr><th>환불 ID</th><th>금액</th><th>상태</th><th>사유</th><th>처리일</th></tr></thead><tbody>{sortedRefunds.length?sortedRefunds.map(i=><tr key={i.id}><td>{i.id}</td><td>{money.format(i.amount)}</td><td><span className="admin-status">{i.status}</span></td><td>{i.reason}</td><td>{date(i.created)}</td></tr>):<tr><td colSpan={5}>{error?"Stripe 연결을 확인하세요.":"실제 환불 내역이 없습니다."}</td></tr>}</tbody></table></div>
  </section>;
}
