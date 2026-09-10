/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  activatePersonalSubscription, findUserByEmail, getAthleteSubscription,
  getAuthStore, getCurrentUser, type NovaUser,
} from "../../lib/nova-auth";
import { useNovaSettings } from "../settings-context";
import "./billing.css";

const PENDING_KEY = "nova-pending-parent-billing-v1";
const REFUND_KEY = "nova-refund-requests-v1";
const DEFAULT_PRICE = 49000;

type PendingBilling = { athleteUserId: string; parentEmail: string; parentName: string };
type RefundRequest = { id: string; userId: string; email: string; reason: string; createdAt: string; status: "requested" };

export default function BillingPage() {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [price, setPrice] = useState(DEFAULT_PRICE);
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundRequested, setRefundRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
    const current = getCurrentUser();
    if (!current || (current.role !== "athlete" && current.role !== "parent")) { router.replace("/dashboard"); return; }
    setUser(current);
    fetch("/api/billing/prices",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(Number.isInteger(d?.pro)&&d.pro>0)setPrice(d.pro)}).catch(()=>{});
    if (current.role === "athlete") {
      const raw = localStorage.getItem(REFUND_KEY);
      if (raw) try { setRefundRequested((JSON.parse(raw) as RefundRequest[]).some(x=>x.userId===current.id&&x.status==="requested")); } catch {}
      const query = new URLSearchParams(window.location.search);
      if (query.get("billing")==="success") {
        const sessionId=query.get("session_id");
        const pendingRaw=localStorage.getItem(PENDING_KEY);
        if(pendingRaw) try {
          const pending=JSON.parse(pendingRaw) as PendingBilling;
          if(pending.athleteUserId===current.id) {
            if(sessionId){
              const verify=await fetch(`/api/billing/verify?session_id=${encodeURIComponent(sessionId)}`,{cache:"no-store"});
              const verified=await verify.json().catch(()=>({}));
              if(!verify.ok||!verified.paid) throw new Error(verified.error||"결제 확인에 실패했습니다.");
              if(activatePersonalSubscription({athleteUserId:verified.athleteId||pending.athleteUserId,parentEmail:verified.parentEmail||pending.parentEmail,parentName:verified.parentName||pending.parentName,stripeCustomerId:verified.stripeCustomerId,stripeSubscriptionId:verified.stripeSubscriptionId})) setMessage(`결제가 완료되었습니다. ${verified.parentEmail||pending.parentEmail} 학부모 계정이 자동 등록·연결되었습니다.`);
            }else if(activatePersonalSubscription(pending)) setMessage(`결제가 완료되었습니다. ${pending.parentEmail} 학부모 계정이 자동 등록·연결되었습니다.`);
            localStorage.removeItem(PENDING_KEY);
          }
        } catch {}
      }
      if(query.get("billing")==="cancelled") setMessage("결제가 취소되었습니다. 다시 결제하려면 결제 정보를 확인해 주세요.");
    }
    };
    void run();
  }, [router]);

  const startCheckout=async(e:FormEvent)=>{
    e.preventDefault();
    if(!user||user.role!=="athlete")return;
    const email=parentEmail.trim().toLowerCase();
    if(!email){setMessage("학부모 이메일을 입력하세요.");return;}
    if(email===user.email){setMessage("선수 본인 이메일과 다른 학부모 이메일을 입력하세요.");return;}
    const existing=findUserByEmail(email);
    if(existing&&existing.role!=="parent"){setMessage("입력한 이메일은 다른 역할의 계정으로 사용 중입니다.");return;}
    localStorage.setItem(PENDING_KEY,JSON.stringify({athleteUserId:user.id,parentEmail:email,parentName:parentName.trim()} satisfies PendingBilling));
    setLoading(true);setMessage("");
    try{
      const r=await fetch("/api/billing/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan:"pro",athleteId:user.id,parentEmail:email,parentName:parentName.trim(),returnPath:"/billing"})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data.url)throw new Error(data.error||"결제 페이지를 만들 수 없습니다.");
      window.location.href=data.url;
    }catch(err){localStorage.removeItem(PENDING_KEY);setMessage(err instanceof Error?err.message:"결제를 시작할 수 없습니다.");setLoading(false);}
  };

  const requestRefund=()=>{
    if(!user||user.role!=="athlete")return;
    const reason=refundReason.trim();
    if(!reason){setMessage("환불 사유를 입력하세요.");return;}
    const item:RefundRequest={id:`refund-${Date.now()}`,userId:user.id,email:user.email,reason,createdAt:new Date().toISOString(),status:"requested"};
    try{
      const raw=localStorage.getItem(REFUND_KEY);const list=raw?JSON.parse(raw) as RefundRequest[]:[];
      localStorage.setItem(REFUND_KEY,JSON.stringify([...list,item]));
      setRefundRequested(true);setRefundReason("");setMessage("환불 신청이 접수되었습니다. 결제 확인 후 처리됩니다.");
    }catch{setMessage("환불 신청 정보를 저장하지 못했습니다. 다시 시도하세요.");}
  };

  if(!user)return null;
  const active=Boolean(getAthleteSubscription(user.id));

  return <main className={`billing-page theme-${theme}`} data-theme={theme}>
    <div className="billing-shell">
      <header className="billing-header">
        <button className="billing-back" type="button" onClick={()=>router.push("/dashboard")}>←</button>
        <div><span>PREMIUM BILLING</span><h1>개인 구독</h1><p>선수 개인 Premium 1건에 학부모 이용 권한이 포함됩니다.</p></div>
      </header>
      <section className="billing-card">
        <div className="billing-card-top"><div><span>PERSONAL PREMIUM</span><h2>{active?"Premium 이용 중":"개인 Premium"}</h2></div><strong>{price.toLocaleString("ko-KR")}원 <small>/ 월</small></strong></div>
        <div className="billing-grid">
          <div>
            <h3>구독 혜택</h3>
            <ul><li>선수 1명 기준 월 구독</li><li>결제 완료 후 입력한 학부모 계정 자동 등록·연결</li><li>연결된 학부모는 추가 결제 없이 이용</li></ul>
          </div>
          {user.role==="parent"?<div className="billing-info"><h3>학부모 이용 권한</h3><p>자녀의 Premium에 포함된 계정입니다. 별도 결제는 필요하지 않습니다.</p></div>
          :active?<div className="billing-info"><h3>현재 구독 상태</h3><p>Premium 구독이 활성 상태입니다.</p><button onClick={()=>router.push("/dashboard")}>대시보드로 이동</button></div>
          :<form onSubmit={startCheckout}><label>학부모 이름<input value={parentName} onChange={e=>setParentName(e.target.value)} placeholder="홍길동 보호자"/></label><label>학부모 이메일<input required type="email" value={parentEmail} onChange={e=>setParentEmail(e.target.value)} placeholder="parent@example.com"/></label><button className="billing-primary" disabled={loading}>{loading?"결제 페이지 준비 중…":`${price.toLocaleString("ko-KR")}원 결제하기`}</button></form>}
        </div>
        {user.role==="athlete"&&active&&<div className="billing-refund"><h3>환불 신청</h3><p>환불 사유를 입력하면 신청이 접수되고 결제 확인 후 처리됩니다.</p><textarea value={refundReason} onChange={e=>setRefundReason(e.target.value)} disabled={refundRequested} placeholder="환불 사유"/><button onClick={requestRefund} disabled={refundRequested}>{refundRequested?"환불 신청 접수됨":"환불 신청"}</button></div>}
        {message&&<p className="billing-message" role="status">{message}</p>}
      </section>
    </div>
    <style jsx global>{`
      .billing-page{min-height:100vh;background:#f7f4ec;color:#101827}.billing-shell{width:min(100% - 48px,1000px);margin:0 auto;padding:48px 0 80px}.billing-header{display:flex;gap:18px;align-items:center;margin-bottom:24px}.billing-back{width:42px;height:42px;border:1px solid #d7d1c6;border-radius:10px;background:#fffdf8;font-size:21px}.billing-header span,.billing-card-top>div>span{font-size:10px;letter-spacing:.14em;color:#2563eb;font-weight:800}.billing-header h1{margin:6px 0;font-size:32px}.billing-header p{margin:0;color:#64748b;font-size:13px}.billing-card{padding:30px;border:1px solid #dedbd2;border-radius:18px;background:#fffdf8;box-shadow:0 12px 35px rgba(15,23,42,.06)}.billing-card-top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding-bottom:22px;border-bottom:1px solid #e5e0d7}.billing-card-top h2{margin:7px 0 0;font-size:22px}.billing-card-top>strong{font-size:28px}.billing-card-top small{font-size:12px;color:#64748b}.billing-grid{display:grid;grid-template-columns:.9fr 1.1fr;gap:32px;padding-top:24px}.billing-grid h3,.billing-refund h3{margin:0 0 10px;font-size:15px}.billing-grid ul{margin:0;padding-left:18px;color:#64748b;font-size:13px;line-height:2}.billing-grid label{display:grid;gap:7px;margin-bottom:14px;font-size:12px;font-weight:700}.billing-grid input,.billing-refund textarea{width:100%;box-sizing:border-box;padding:12px;border:1px solid #d6d1c6;border-radius:9px;background:#fff;color:#111827;font:inherit}.billing-grid form button,.billing-primary,.billing-info button,.billing-refund button{min-height:44px;border:0;border-radius:9px;padding:0 18px;background:#2563eb;color:white;font-weight:800;cursor:pointer}.billing-info{padding:18px;border-radius:12px;background:#f7f4ec}.billing-info p{margin:0 0 14px;color:#64748b;font-size:13px;line-height:1.7}.billing-refund{margin-top:28px;padding-top:24px;border-top:1px solid #e5e0d7}.billing-refund p{color:#64748b;font-size:12px}.billing-refund textarea{min-height:90px;resize:vertical}.billing-refund button{margin-top:10px;background:#fff;border:1px solid #cfc9bd;color:#111827}.billing-message{margin:18px 0 0;padding:12px;border-radius:9px;background:#f1f4f8;color:#475569;font-size:12px}@media(max-width:700px){.billing-shell{width:calc(100% - 28px);padding:20px 0 70px}.billing-header h1{font-size:27px}.billing-card{padding:20px}.billing-card-top{display:block}.billing-card-top>strong{display:block;margin-top:12px;font-size:25px}.billing-grid{grid-template-columns:1fr;gap:18px}}
      .theme-dark.billing-page{background:#070b12;color:#f3f6fb}.theme-dark .billing-card,.theme-dark .billing-back{background:#0d1420;border-color:#243247;color:#f3f6fb}.theme-dark .billing-header p,.theme-dark .billing-grid ul,.theme-dark .billing-info p,.theme-dark .billing-refund p{color:#94a3b8}.theme-dark .billing-info{background:#111a28}.theme-dark .billing-grid input,.theme-dark .billing-refund textarea{background:#111a28;border-color:#334155;color:#f3f6fb}
    `}</style>
  </main>;
}
