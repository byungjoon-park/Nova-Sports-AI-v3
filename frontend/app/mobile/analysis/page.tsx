"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser } from "../../../lib/nova-auth";
import { readNovaAthleteData, type NovaAthleteData } from "../../../lib/nova-data";

export default function MobileAnalysis() {
  const [data, setData] = useState<NovaAthleteData | null>(null);
  useEffect(() => { const user = getCurrentUser(); if (user?.role === "athlete") setData(readNovaAthleteData()); }, []);
  if (!data) return <MobileNotice text="선수 계정으로 로그인하면 실제 측정 데이터를 확인할 수 있습니다." />;
  const body = data.bodyRecords[data.bodyRecords.length - 1];
  const performance = data.performanceRecords[data.performanceRecords.length - 1];
  const recovery = data.recoveryRecords[data.recoveryRecords.length - 1];
  const fatigue = data.fatigueRecords[data.fatigueRecords.length - 1];
  return <MobileSection title="성장·체력 분석" subtitle="실제 저장된 측정값만 표시합니다.">
    <div className="mobile-detail-grid">
      <Detail label="키" value={body?.heightCm ? `${body.heightCm} cm` : "기록 없음"} />
      <Detail label="체중" value={body?.weightKg ? `${body.weightKg} kg` : "기록 없음"} />
      <Detail label="퍼포먼스" value={performance ? `${performance.score}` : "기록 없음"} />
      <Detail label="회복" value={recovery ? `${recovery.score}` : "기록 없음"} />
      <Detail label="피로도" value={fatigue ? `${fatigue.score}` : "기록 없음"} />
    </div>
    <p className="mobile-note">측정 데이터가 없으면 값을 추정하거나 임의로 생성하지 않습니다.</p>
  </MobileSection>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="mobile-detail"><span>{label}</span><strong>{value}</strong></div>; }
function MobileSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <div className="mobile-page"><header className="mobile-subheader"><div className="mobile-desktop-header"><div className="mobile-desktop-header-left"><Link href="/mobile" aria-label="뒤로">←</Link><div className="mobile-desktop-brand"><strong>N O V A</strong><span>AI SPORTS PERFORMANCE PLATFORM</span></div></div><div className="mobile-ai-status"><i></i> AI 시스템 준비</div></div><div className="mobile-page-title"><h1>{title}</h1><p>{subtitle}</p></div></header>{children}<MobileNav /></div>; }
function MobileNotice({ text }: { text: string }) { return <MobileSection title="성장·체력 분석" subtitle=""> <div className="mobile-empty-card">{text}</div></MobileSection>; }
function MobileNav() { return <nav className="mobile-bottom-nav"><Link href="/mobile">홈</Link><Link className="active" href="/mobile/analysis">분석</Link><Link href="/mobile/training">훈련</Link><Link href="/mobile/rehab">재활</Link><Link href="/mobile/report">리포트</Link></nav>; }
