"use client";

import { useRouter } from "next/navigation";
import "./analysis.css";

export default function AnalysisPage() {
  const router = useRouter();
  return (
    <main className="analysis-page">
      <header className="analysis-header">
        <div>
          <span className="eyebrow">AI ANALYSIS</span>
          <h1>AI 분석</h1>
          <p>Camera AI와 성장·체력 데이터를 한 곳에서 확인합니다.</p>
        </div>
      </header>
      <section className="analysis-grid">
        <button type="button" className="analysis-card" onClick={() => router.push("/camera-ai")}>
          <span>Camera AI</span>
          <strong>동작·점프 분석</strong>
          <small>자세, 점프력, 착지 및 동작 분석</small>
        </button>
        <button type="button" className="analysis-card" onClick={() => router.push("/growth-analysis")}>
          <span>Growth / Fitness</span>
          <strong>성장 / 체력 분석</strong>
          <small>키, 체중, 점프력, 속도, 근력 추이</small>
        </button>
      </section>
    </main>
  );
}
