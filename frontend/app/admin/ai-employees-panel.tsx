"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Run = {
  id: number;
  name: string;
  title: string;
  status: string;
  conclusion: string | null;
  url: string;
  startedAt: string | null;
  updatedAt: string;
  branch: string;
  event: string;
};

type ApiResult = { runs: Run[]; fetchedAt: string } | { error: string };

const employees = [
  { name: "AI 구현 직원", workflow: "NOVA AI 구현 직원", role: "요청된 기능을 구현하고 검사를 통과하면 초안 PR을 엽니다.", initials: "DEV", tint: "blue" },
  { name: "AI 코드 리뷰 직원", workflow: "NOVA AI 코드 리뷰", role: "PR 변경 내용을 검토하고 GitHub에 리뷰를 남깁니다.", initials: "REV", tint: "violet" },
  { name: "AI 품질 검사 직원", workflow: "NOVA AI 품질 검사", role: "테스트·린트·TypeScript·프로덕션 빌드를 실행합니다.", initials: "QA", tint: "green" },
  { name: "AI 배포 직원", workflow: "NOVA Beta to Production", role: "beta 빌드를 확인한 뒤 설정된 승격 절차를 실행합니다.", initials: "OPS", tint: "amber" },
];

function statusOf(run?: Run) {
  if (!run) return { label: "기록 없음", className: "unknown" };
  if (run.status === "in_progress") return { label: "작업 중", className: "working" };
  if (run.status === "queued" || run.status === "waiting" || run.status === "requested") return { label: "대기 중", className: "queued" };
  if (run.conclusion === "success") return { label: "완료", className: "success" };
  if (run.conclusion === "failure" || run.conclusion === "cancelled" || run.conclusion === "timed_out") return { label: run.conclusion === "cancelled" ? "취소" : "실패", className: "failure" };
  return { label: run.conclusion ?? run.status, className: "unknown" };
}

function formatDate(value?: string | null) {
  if (!value) return "시작 시각 없음";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AiEmployeesPanel() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [fetchedAt, setFetchedAt] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/ai-office", { cache: "no-store" });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : "상태를 불러오지 못했습니다.");
      setRuns(result.runs);
      setFetchedAt(result.fetchedAt);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "상태를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const latestByName = useMemo(() => {
    const map = new Map<string, Run>();
    for (const run of runs) {
      const current = map.get(run.name);
      if (!current || run.status === "in_progress" || run.status === "queued") map.set(run.name, run);
    }
    return map;
  }, [runs]);

  const activeCount = employees.filter(({ workflow }) => {
    const status = latestByName.get(workflow)?.status;
    return status === "in_progress" || status === "queued" || status === "waiting";
  }).length;

  return <div className="ai-office">
    <section className="admin-panel ai-office-hero">
      <div className="ai-office-hero-copy"><span>OPENAI · AI TEAM</span><h2>AI 직원 관제실</h2><p>직원의 실제 작업 상태와 GitHub 실행 기록을 확인합니다. 상태는 1분마다 갱신됩니다.</p></div>
      <div className="ai-office-live"><i className={activeCount ? "is-live" : ""} />{activeCount ? `${activeCount}명 작업 중` : "현재 실행 중인 직원 없음"}</div>
      <button type="button" className="ai-office-refresh" onClick={() => { setLoading(true); void refresh(); }}>새로고침</button>
    </section>

    {error && <div className="ai-office-alert" role="alert">{error} <button type="button" onClick={() => { setLoading(true); void refresh(); }}>다시 시도</button></div>}

    <section className="ai-office-grid" aria-label="AI 직원 목록">
      {employees.map((employee) => {
        const run = latestByName.get(employee.workflow);
        const state = statusOf(run);
        return <article className={`ai-employee-card ${state.className}`} key={employee.workflow}>
          <div className="ai-employee-top"><div className={`ai-employee-avatar ${employee.tint}`}>{employee.initials}</div><span className={`ai-employee-state ${state.className}`}><i />{state.label}</span></div>
          <h3>{employee.name}</h3><p>{employee.role}</p>
          <div className="ai-employee-task"><span>최근 작업</span>{run ? <strong>{run.title}</strong> : <strong>아직 실행 기록이 없습니다.</strong>}</div>
          <div className="ai-employee-meta">{run ? <><span>{formatDate(run.startedAt ?? run.updatedAt)}</span><span>{run.branch}</span></> : <span>GitHub Actions 실행 기록 기준</span>}</div>
          {run && <a className="ai-employee-link" href={run.url} target="_blank" rel="noreferrer">실행 로그 보기 ↗</a>}
        </article>;
      })}
    </section>

    <section className="admin-panel ai-office-history">
      <div className="admin-panel-head"><div><span>LIVE ACTIVITY LOG</span><h2>최근 실행 내역</h2></div><small>{loading ? "불러오는 중…" : fetchedAt ? `마지막 갱신 ${formatDate(fetchedAt)}` : "실행 기록 연결 대기"}</small></div>
      {!loading && !error && runs.length === 0 && <p className="ai-office-empty">표시할 실행 내역이 없습니다. 직원 실행은 GitHub 저장소의 Actions에서도 확인할 수 있습니다.</p>}
      {runs.length > 0 && <div className="ai-run-list">{runs.slice(0, 12).map((run) => {
        const state = statusOf(run);
        return <a className="ai-run-row" href={run.url} target="_blank" rel="noreferrer" key={run.id}>
          <span className={`ai-run-dot ${state.className}`} />
          <span className="ai-run-main"><strong>{run.name}</strong><small>{run.title}</small></span>
          <span className={`ai-run-status ${state.className}`}>{state.label}</span>
          <span className="ai-run-date">{formatDate(run.startedAt ?? run.updatedAt)}</span><span className="ai-run-arrow">↗</span>
        </a>;
      })}</div>}
    </section>

    <section className="admin-panel ai-office-note">
      <div><span>DAILY BRIEFING</span><h2>매출 · 논문 조사 보고</h2></div>
      <p>매일 오전 9시 보고 자동화는 Codex 일정에서 실행됩니다. 현재 실행 이력은 NOVA 사이트에 연결되어 있지 않아 이 관제실에서는 직원의 실시간 작업 상태로 표시하지 않습니다.</p>
      <small>보고 내용은 실제 연결된 매출 자료와 출처가 확인된 논문을 기준으로 작성됩니다.</small>
    </section>
  </div>;
}
