"use client";

import { useRouter } from "next/navigation";
import { useNovaSettings } from "../settings-context";
import NovaTopBar from "../../components/NovaTopBar";
import "./analysis.css";

export default function AnalysisPage() {
  const router = useRouter();
  const { theme } = useNovaSettings();
  const activeTheme = theme === "dark" || theme === "white" || theme === "ivory" ? theme : "ivory";

  return (
    <main className={`analysis-page theme-${activeTheme}`} data-theme={activeTheme}>
      <NovaTopBar />
      <section className="analysis-shell">
        <div className="analysis-header">
          <span className="analysis-eyebrow">AI 분석</span>
          <h1>AI 분석</h1>
          <p>기존 분석과 선수 성장·체력 변화를 확인합니다.</p>
        </div>
        <div className="analysis-options">
          <button className="analysis-card" type="button" onClick={() => router.push("/report")}>
            <strong>AI 분석 / 리포트</strong>
            <span>기존 AI 분석 결과와 리포트를 확인합니다.</span>
          </button>
          <button className="analysis-card" type="button" onClick={() => router.push("/growth-analysis")}>
            <strong>성장 / 체력 분석</strong>
            <span>키, 체중, 점프력과 기존 측정 기록의 변화를 확인합니다.</span>
          </button>
        </div>
      </section>
    </main>
  );
}
