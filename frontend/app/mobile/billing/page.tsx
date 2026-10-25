"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NovaTopBar from "../../../components/NovaTopBar";
import {
  activatePersonalSubscription,
  findUserByEmail,
  getAthleteSubscription,
  getCurrentUser,
  type NovaUser,
} from "../../../lib/nova-auth";
import "../mobile.css";

const PENDING_KEY = "nova-pending-parent-billing-v1";
const REFUND_KEY = "nova-refund-requests-v1";
const SUBSCRIPTION_KEY = "nova-athlete-subscription-v1";
const DEFAULT_PRICE = 49000;

type PendingBilling = { athleteUserId: string; parentEmail: string; parentName: string };
type RefundRequest = {
  id: string;
  userId: string;
  email: string;
  reason: string;
  createdAt: string;
  status: "requested";
};
type StoredSubscription = {
  athleteUserId: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: number | null;
  cancelAtPeriodEnd?: boolean;
};

export default function MobileBillingPage() {
  const router = useRouter();
  const [user, setUser] = useState<NovaUser | null>(null);
  const [price, setPrice] = useState(DEFAULT_PRICE);
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundRequested, setRefundRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [nextBillingDate, setNextBillingDate] = useState<number | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const formatBillingDate = (timestamp: number | null) => {
    if (!timestamp) return "확인 중";
    return new Date(timestamp * 1000).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    const run = async () => {
      const current = getCurrentUser();
      if (!current) {
        router.replace("/mobile/login");
        return;
      }
      if (current.role !== "athlete" && current.role !== "parent") {
        router.replace("/mobile");
        return;
      }
      setUser(current);
      setActive(Boolean(getAthleteSubscription(current.id)));

      fetch("/api/billing/prices", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          if (Number.isInteger(data?.pro) && data.pro > 0) setPrice(data.pro);
        })
        .catch(() => {});

      if (current.role === "athlete") {
        const raw = localStorage.getItem(REFUND_KEY);
        if (raw) {
          try {
            setRefundRequested(
              (JSON.parse(raw) as RefundRequest[]).some(
                (item) => item.userId === current.id && item.status === "requested",
              ),
            );
          } catch {}
        }

        const storedRaw = localStorage.getItem(SUBSCRIPTION_KEY);
        if (storedRaw) {
          try {
            const stored = JSON.parse(storedRaw) as StoredSubscription;
            if (stored.athleteUserId === current.id) {
              setNextBillingDate(stored.currentPeriodEnd ?? null);
              setCancelAtPeriodEnd(Boolean(stored.cancelAtPeriodEnd));
            }
          } catch {}
        }

        const query = new URLSearchParams(window.location.search);
        if (query.get("billing") === "success") {
          const sessionId = query.get("session_id");
          const pendingRaw = localStorage.getItem(PENDING_KEY);

          if (pendingRaw) {
            try {
              const pending = JSON.parse(pendingRaw) as PendingBilling;
              if (pending.athleteUserId === current.id) {
                if (sessionId) {
                  const verify = await fetch(
                    `/api/billing/verify?session_id=${encodeURIComponent(sessionId)}`,
                    { cache: "no-store" },
                  );
                  const verified = await verify.json().catch(() => ({}));
                  if (!verify.ok || !verified.paid) {
                    throw new Error(verified.error || "결제 확인에 실패했습니다.");
                  }

                  const activated = activatePersonalSubscription({
                    athleteUserId: verified.athleteId || pending.athleteUserId,
                    parentEmail: verified.parentEmail || pending.parentEmail,
                    parentName: verified.parentName || pending.parentName,
                    stripeCustomerId: verified.stripeCustomerId,
                    stripeSubscriptionId: verified.stripeSubscriptionId,
                  });

                  localStorage.setItem(
                    SUBSCRIPTION_KEY,
                    JSON.stringify({
                      athleteUserId: current.id,
                      stripeSubscriptionId: verified.stripeSubscriptionId,
                      currentPeriodEnd: verified.currentPeriodEnd ?? null,
                      cancelAtPeriodEnd: Boolean(verified.cancelAtPeriodEnd),
                    } satisfies StoredSubscription),
                  );
                  setNextBillingDate(verified.currentPeriodEnd ?? null);
                  setCancelAtPeriodEnd(Boolean(verified.cancelAtPeriodEnd));

                  if (activated) {
                    setMessage(
                      `결제가 완료되었습니다. ${verified.parentEmail || pending.parentEmail} 학부모 계정이 자동 등록·연결되었습니다.`,
                    );
                  }
                } else {
                  const activated = activatePersonalSubscription(pending);
                  if (activated) {
                    setMessage(
                      `결제가 완료되었습니다. ${pending.parentEmail} 학부모 계정이 자동 등록·연결되었습니다.`,
                    );
                  }
                }
                localStorage.removeItem(PENDING_KEY);
              }
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "결제 확인에 실패했습니다.");
            }
          }
          setActive(Boolean(getAthleteSubscription(current.id)));
        }

        if (query.get("billing") === "cancelled") {
          setMessage("결제가 취소되었습니다. 결제 전 입력 정보는 저장되지 않았습니다.");
        }
      }
    };

    void run();
  }, [router]);

  const startCheckout = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || user.role !== "athlete") return;

    const normalized = parentEmail.trim().toLowerCase();
    if (!normalized) {
      setMessage("학부모 이메일을 입력하세요.");
      return;
    }
    if (normalized === user.email) {
      setMessage("선수 본인 이메일과 다른 학부모 이메일을 입력하세요.");
      return;
    }

    const existing = findUserByEmail(normalized);
    if (existing && existing.role !== "parent") {
      setMessage("입력한 이메일은 다른 역할의 계정으로 사용 중입니다.");
      return;
    }

    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        athleteUserId: user.id,
        parentEmail: normalized,
        parentName: parentName.trim(),
      } satisfies PendingBilling),
    );

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "pro",
          athleteId: user.id,
          parentEmail: normalized,
          parentName: parentName.trim(),
          returnPath: "/mobile/billing",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        throw new Error(result.error || "결제 페이지를 만들 수 없습니다.");
      }
      window.location.href = result.url;
    } catch (error) {
      localStorage.removeItem(PENDING_KEY);
      setMessage(error instanceof Error ? error.message : "결제를 시작할 수 없습니다.");
      setLoading(false);
    }
  };

  const requestCancellation = async () => {
    if (!user || user.role !== "athlete") return;

    const storedRaw = localStorage.getItem(SUBSCRIPTION_KEY);
    let stored: StoredSubscription | null = null;
    if (storedRaw) {
      try {
        stored = JSON.parse(storedRaw) as StoredSubscription;
      } catch {}
    }

    if (!stored?.stripeSubscriptionId) {
      setMessage("현재 구독 정보를 확인할 수 없습니다. 결제 정보를 다시 확인해 주세요.");
      return;
    }

    if (cancelAtPeriodEnd) {
      setMessage("이미 월 구독 취소가 신청되어 있습니다.");
      return;
    }

    if (!window.confirm("월 구독을 취소 신청하시겠습니까?\n현재 이용 기간은 유지되며 다음 결제일부터 자동 결제가 중단됩니다.")) {
      return;
    }

    setCancelLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: stored.stripeSubscriptionId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "월 구독 취소 신청에 실패했습니다.");
      }

      const updated: StoredSubscription = {
        ...stored,
        currentPeriodEnd: result.currentPeriodEnd ?? stored.currentPeriodEnd ?? null,
        cancelAtPeriodEnd: true,
      };
      localStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(updated));
      setNextBillingDate(updated.currentPeriodEnd ?? null);
      setCancelAtPeriodEnd(true);
      setMessage(
        `월 구독 취소 신청이 완료되었습니다. ${formatBillingDate(updated.currentPeriodEnd ?? null)}에 구독이 종료되며 그 이후에는 자동 결제되지 않습니다.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "월 구독 취소 신청에 실패했습니다.");
    } finally {
      setCancelLoading(false);
    }
  };

  const requestRefund = () => {
    if (!user || user.role !== "athlete") return;
    const reason = refundReason.trim();
    if (!reason) {
      setMessage("환불 사유를 입력하세요.");
      return;
    }

    const request: RefundRequest = {
      id: `refund-${Date.now()}`,
      userId: user.id,
      email: user.email,
      reason,
      createdAt: new Date().toISOString(),
      status: "requested",
    };

    try {
      const raw = localStorage.getItem(REFUND_KEY);
      const list = raw ? (JSON.parse(raw) as RefundRequest[]) : [];
      localStorage.setItem(REFUND_KEY, JSON.stringify([...list, request]));
      setRefundRequested(true);
      setRefundReason("");
      setMessage("환불 신청이 접수되었습니다. 결제 확인 후 처리됩니다.");
    } catch {
      setMessage("환불 신청 정보를 저장하지 못했습니다. 다시 시도하세요.");
    }
  };

  if (!user) return null;

  return (
    <main className="mobile-page theme-ivory mobile-billing-page">
      <NovaTopBar statusText="AI 시스템 준비" />
      <div className="mobile-page-title">
        <span className="mobile-billing-eyebrow">PREMIUM BILLING</span>
        <h1>결제</h1>
        <p>선수 1건의 Premium 구독으로 선수와 연결된 학부모가 함께 이용합니다.</p>
      </div>

      <section className="mobile-content-card mobile-billing-card">
        <div className="mobile-card-heading">
          <span>PERSONAL PREMIUM</span>
          <strong>{active ? "Premium 이용 중" : "개인 Premium"}</strong>
        </div>

        <div className="mobile-billing-price">
          <strong>{price.toLocaleString("ko-KR")}원</strong>
          <span>/ 월</span>
        </div>

        <ul className="mobile-billing-benefits">
          <li>선수 1명 기준 월 구독</li>
          <li>결제한 선수의 학부모 계정 1개 자동 연결</li>
          <li>학부모는 별도 구독료를 결제하지 않음</li>
        </ul>

        {user.role === "parent" ? (
          <button className="mobile-action-button" type="button" onClick={() => router.push("/mobile")}>
            대시보드로 이동
          </button>
        ) : active ? (
          <>
            <div className="mobile-billing-subscription-info">
              <div>
                <span>다음 결제 예정일</span>
                <strong>{formatBillingDate(nextBillingDate)}</strong>
              </div>
              <p>
                {cancelAtPeriodEnd
                  ? "취소 신청이 완료되었습니다. 현재 이용 기간은 유지되며 다음 결제부터 자동 결제가 중단됩니다."
                  : "월 구독은 매월 자동 결제됩니다."}
              </p>
            </div>

            <div className="mobile-billing-success">현재 Premium 구독이 활성 상태입니다.</div>

            <button className="mobile-action-button" type="button" onClick={() => router.push("/mobile")}>
              대시보드로 이동
            </button>

            <button
              className="mobile-cancel-subscription-button"
              type="button"
              onClick={requestCancellation}
              disabled={cancelLoading || cancelAtPeriodEnd}
            >
              {cancelLoading
                ? "취소 신청 처리 중…"
                : cancelAtPeriodEnd
                  ? "월 구독 취소 신청됨"
                  : "월 구독 취소신청"}
            </button>

            <div className="mobile-refund-box">
              <strong>환불 신청</strong>
              <p>환불은 신청 후 결제 확인을 거쳐 처리됩니다.</p>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="환불 사유를 입력하세요."
                disabled={refundRequested}
              />
              <button
                type="button"
                className="mobile-secondary-button"
                onClick={requestRefund}
                disabled={refundRequested}
              >
                {refundRequested ? "환불 신청 접수됨" : "환불 신청"}
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={startCheckout}>
            <label className="mobile-billing-field">
              학부모 이름
              <input
                value={parentName}
                onChange={(e) => setParentName(e.target.value)}
                placeholder="홍길동 보호자"
              />
            </label>
            <label className="mobile-billing-field">
              학부모 이메일
              <input
                type="email"
                required
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
              />
            </label>
            <button className="mobile-action-button" type="submit" disabled={loading}>
              {loading ? "결제 페이지 준비 중…" : `${price.toLocaleString("ko-KR")}원 결제하기`}
            </button>
          </form>
        )}

        {message && <p className="mobile-billing-message" role="status">{message}</p>}

        <button className="mobile-billing-back" type="button" onClick={() => router.push("/mobile")}>
          ← 대시보드
        </button>
      </section>

      <style jsx global>{`
        .mobile-billing-page{padding-top:0!important}
        .mobile-billing-page .mobile-page-title{max-width:720px;margin:0 auto 16px;padding:18px 2px 0}
        .mobile-billing-eyebrow{font-size:9px;letter-spacing:.14em;color:#2563eb;font-weight:800}
        .mobile-billing-page .mobile-page-title h1{margin:6px 0;font-size:28px}
        .mobile-billing-page .mobile-page-title p{margin:0;color:#64748b;font-size:12px;line-height:1.6}
        .mobile-billing-card{margin-bottom:90px}
        .mobile-billing-price{display:flex;align-items:baseline;gap:5px;margin:18px 0 12px}
        .mobile-billing-price strong{font-size:30px;color:#101827}.mobile-billing-price span{font-size:12px;color:#64748b}
        .mobile-billing-benefits{margin:0 0 18px;padding:14px 16px;border-radius:12px;background:#f7f4ec;color:#475569;font-size:11px;line-height:1.9}
        .mobile-billing-benefits li{margin-left:14px}
        .mobile-billing-field{display:grid;gap:7px;margin-top:12px;color:#475569;font-size:11px;font-weight:700}
        .mobile-billing-field input,.mobile-refund-box textarea{width:100%;box-sizing:border-box;border:1px solid #d6d1c6;border-radius:10px;background:#fffdf8;padding:11px 12px;color:#111827;font:inherit}
        .mobile-action-button{width:100%;min-height:46px;margin-top:16px;border:0;border-radius:11px;background:#2563eb;color:#fff;font-weight:800;font-size:13px}
        .mobile-action-button:disabled,.mobile-secondary-button:disabled,.mobile-cancel-subscription-button:disabled{opacity:.55}
        .mobile-billing-subscription-info{margin:0 0 12px;padding:14px;border:1px solid #e2ddd3;border-radius:12px;background:#fffdf8}
        .mobile-billing-subscription-info>div{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
        .mobile-billing-subscription-info span{font-size:10px;color:#64748b;font-weight:700}
        .mobile-billing-subscription-info strong{font-size:15px;color:#101827}
        .mobile-billing-subscription-info p{margin:8px 0 0;color:#64748b;font-size:10px;line-height:1.6}
        .mobile-billing-success{padding:12px;border-radius:10px;background:#eaf8ef;color:#16824a;font-size:11px;font-weight:700}
        .mobile-cancel-subscription-button{width:100%;min-height:42px;margin-top:10px;border:1px solid #cfc9bd;border-radius:10px;background:#fff;color:#111827;font-weight:700}
        .mobile-refund-box{margin-top:18px;padding-top:18px;border-top:1px solid #e2ddd3}.mobile-refund-box strong{font-size:14px}.mobile-refund-box p{margin:6px 0 10px;color:#64748b;font-size:11px}
        .mobile-refund-box textarea{min-height:82px;resize:vertical}.mobile-secondary-button{width:100%;min-height:42px;margin-top:8px;border:1px solid #cfc9bd;border-radius:10px;background:#fffdf8;color:#111827;font-weight:700}
        .mobile-billing-message{padding:11px 12px!important;border-radius:10px;background:#f3f5f8;color:#475569!important}
        .mobile-billing-back{display:block;margin:14px auto 0;border:0;background:transparent;color:#64748b;font-size:11px}
      `}</style>
    </main>
  );
}
