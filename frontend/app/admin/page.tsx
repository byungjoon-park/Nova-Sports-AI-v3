"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNovaSettings } from "../settings-context";
import { getAuthStore } from "../../lib/nova-auth";
import BillingPanel from "./billing-panel";
import RefundPanel from "./refund-panel";
import InquiryPanel from "./inquiry-panel";
import ResearchPanel from "./research-panel";
import BetaPanel from "./beta-panel";
import "./admin.css";

type Section = "dashboard" | "users" | "athletes" | "teams" | "ai" | "measurements" | "medical" | "research" | "billing" | "refunds" | "inquiries" | "notices" | "logs" | "settings" | "beta";

const sectionTitles: Record<Section, string> = {
  dashboard: "관리자 대시보드", users: "사용자 관리", athletes: "선수 관리", teams: "팀 · 구단 관리",
  ai: "AI 분석 관리", measurements: "측정 데이터", medical: "의료 · 재활", research: "연구 · 통계",
  billing: "구독 · 결제", refunds: "환불 관리", inquiries: "1:1 문의", notices: "공지사항", logs: "운영 로그", settings: "시스템 설정", beta: "베타 관리",
};

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return <div className="admin-table-wrap"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{j === row.length - 1 ? <span className="admin-status">{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div>;
}

export default function AdminPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { role, theme, openSettings } = useNovaSettings();
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [researchFilters, setResearchFilters] = useState({ injury: "all", sport: "all", gender: "all", age: "all" });
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState("name-asc");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [athleteSort, setAthleteSort] = useState("name-asc");
  const [teamSearch, setTeamSearch] = useState("");
  const [teamSort, setTeamSort] = useState("name-asc");
  const section = (params.get("section") as Section) || "dashboard";
  const safeSection: Section = sectionTitles[section] ? section : "dashboard";

  const go = (next: Section) => router.push(`/admin?section=${next}`);
  const researchRows = useMemo(() => {
    const store = getAuthStore();
    const teamSport = new Map(store.teams.map((team) => [team.id, team.sport || "미입력"]));
    const members = new Map(store.members.filter((m) => m.role === "athlete").map((m) => [m.userId, teamSport.get(m.teamId) || "미입력"]));
    const nowYear = new Date().getFullYear();
    const athletes = store.users.filter((u) => u.role === "athlete").map((u) => {
      const profile = store.athleteProfiles.find((p) => p.userId === u.id);
      const age = profile?.birthYear ? nowYear - profile.birthYear : null;
      const ageGroup = age == null ? "미입력" : age < 13 ? "12세 이하" : age < 19 ? "13-18세" : age < 23 ? "19-22세" : age < 30 ? "23-29세" : "30세 이상";
      const injury = profile?.injuryHistory?.trim() || "미입력";
      const injuryGroup = injury === "미입력" ? injury : /무릎/.test(injury) ? "무릎" : /발목/.test(injury) ? "발목" : /어깨/.test(injury) ? "어깨" : /허리/.test(injury) ? "허리" : /고관절|엉덩이/.test(injury) ? "고관절" : "기타";
      return { sport: profile?.sport || members.get(u.id) || "미입력", gender: profile?.gender || "미입력", ageGroup, injury: injuryGroup };
    });
    return athletes.filter((a) =>
      (researchFilters.injury === "all" || a.injury === researchFilters.injury) &&
      (researchFilters.sport === "all" || a.sport === researchFilters.sport) &&
      (researchFilters.gender === "all" || a.gender === researchFilters.gender) &&
      (researchFilters.age === "all" || a.ageGroup === researchFilters.age)
    );
  }, [researchFilters, safeSection]);

  const userRows = useMemo(() => {
    const rows = [["John Kim","관리자","NOVA","활성","오늘 10:01"],["김민수","감독","NOVA Basketball","활성","오늘 09:52"],["박지훈","코치","NOVA Basketball","활성","어제 22:18"],["이서연","선수","NOVA Volleyball","활성","어제 18:04"]];
    const q = userSearch.trim().toLowerCase();
    const filtered = q ? rows.filter((r) => r.some((v) => v.toLowerCase().includes(q))) : rows;
    return [...filtered].sort((a,b) => {
      const [key, dir] = userSort.split("-");
      const index = key === "role" ? 1 : key === "org" ? 2 : key === "status" ? 3 : key === "recent" ? 4 : 0;
      return a[index].localeCompare(b[index], "ko") * (dir === "desc" ? -1 : 1);
    });
  }, [userSearch, userSort]);

  const athleteRows = useMemo(() => {
    const rows = [["김민수","농구","NOVA Basketball","활성","08/24"],["박지훈","축구","NOVA FC","활성","08/23"],["이서연","배구","NOVA Volleyball","활성","08/22"],["최도윤","육상","NOVA Track","대기","08/21"]];
    const q = athleteSearch.trim().toLowerCase();
    const filtered = q ? rows.filter((r) => r.some((v) => v.toLowerCase().includes(q))) : rows;
    return [...filtered].sort((a,b) => {
      const [key, dir] = athleteSort.split("-");
      const index = key === "sport" ? 1 : key === "team" ? 2 : key === "status" ? 3 : key === "recent" ? 4 : 0;
      return a[index].localeCompare(b[index], "ko") * (dir === "desc" ? -1 : 1);
    });
  }, [athleteSearch, athleteSort]);

  const teamRows = useMemo(() => {
    const rows = [["NOVA Basketball","농구","24","3","운영 중"],["NOVA FC","축구","31","4","운영 중"],["NOVA Volleyball","배구","18","2","운영 중"],["NOVA Track","육상","12","2","운영 중"]];
    const q = teamSearch.trim().toLowerCase();
    const filtered = q ? rows.filter((r) => r.some((v) => v.toLowerCase().includes(q))) : rows;
    return [...filtered].sort((a,b) => {
      const [key, dir] = teamSort.split("-");
      const index = key === "sport" ? 1 : key === "athletes" ? 2 : key === "coaches" ? 3 : key === "status" ? 4 : 0;
      const numeric = index === 2 || index === 3;
      const result = numeric ? Number(a[index]) - Number(b[index]) : a[index].localeCompare(b[index], "ko");
      return result * (dir === "desc" ? -1 : 1);
    });
  }, [teamSearch, teamSort]);

  const researchOptions = useMemo(() => {
    const store = getAuthStore();
    const teamSport = new Map(store.teams.map((team) => [team.id, team.sport || "미입력"]));
    const sports = new Set<string>(["미입력"]);
    store.members.filter((m) => m.role === "athlete").forEach((m) => sports.add(teamSport.get(m.teamId) || "미입력"));
    store.athleteProfiles.forEach((p) => sports.add(p.sport || "미입력"));
    return { sports: Array.from(sports).sort(), genders: ["미입력", "male", "female", "other"], ages: ["미입력", "12세 이하", "13-18세", "19-22세", "23-29세", "30세 이상"], injuries: ["미입력", "무릎", "발목", "어깨", "허리", "고관절", "기타"] };
  }, [safeSection]);




  if (role !== "admin") return <main className="admin-page" data-theme={theme}><section className="admin-denied"><span>NOVA ADMIN</span><h1>관리자 모드가 아닙니다.</h1><p>환경설정에서 사용자 모드를 관리자 모드로 변경하세요.</p><div><button onClick={openSettings}>환경설정</button><button onClick={() => router.push("/dashboard")}>대시보드</button></div></section></main>;

  const navGroups = [
    { label: "개요", items: [["dashboard", "⌂", "관리자 대시보드"]] },
    { label: "사용자 · 조직", items: [["users", "♙", "사용자 관리"], ["athletes", "♟", "선수 관리"], ["teams", "▣", "팀 · 구단 관리"]] },
    { label: "AI · 데이터", items: [["ai", "◎", "AI 분석 관리"], ["measurements", "⌁", "측정 데이터"], ["medical", "♡", "의료 · 재활"], ["research", "▥", "연구 · 통계"]] },
    { label: "결제 · 고객지원", items: [["billing", "₩", "구독 · 결제"], ["refunds", "↩", "환불 관리"], ["inquiries", "✉", "1:1 문의"]] },
    { label: "서비스 운영", items: [["notices", "▤", "공지사항"], ["logs", "◷", "운영 로그"], ["settings", "⚙", "시스템 설정"], ["beta", "◈", "베타 관리"]] },
  ] as { label: string; items: [string, string, string][] }[];

  return <main className="admin-page" data-theme={theme}>
    <aside className="admin-sidebar">
      <button className="admin-brand" onClick={() => router.push("/dashboard")}><strong>NOVA</strong><span>SPORTS AI · ADMIN</span></button>
      <div className="admin-sidebar-user"><span className="admin-avatar">A</span><div><strong>관리자</strong><small>Administrator</small></div></div>
      <nav>{navGroups.map((group) => <div className="admin-nav-group" key={group.label}><span className="admin-nav-label">{group.label}</span>{group.items.map(([key,icon,label]) => <button key={key} className={safeSection === key ? "is-active" : ""} onClick={() => go(key as Section)}><span>{icon}</span>{label}{key === "refunds" && <em>3</em>}{key === "inquiries" && <em>7</em>}</button>)}</div>)}</nav>
      <button className="admin-back-dashboard" onClick={() => router.push("/dashboard")}>← 사용자 대시보드</button>
    </aside>

    <section className="admin-main">
      <header className="admin-header"><div><span>ADMIN CONSOLE</span><h1>{sectionTitles[safeSection]}</h1><p>NOVA Sports AI 서비스 운영 및 데이터 관리</p></div><div className="admin-actions"><button onClick={openSettings}>환경설정</button></div></header>

      {safeSection === "dashboard" && <><section className="admin-kpis"><article><span>전체 사용자</span><strong>1,520</strong><small>명</small></article><article><span>활성 팀</span><strong>32</strong><small>팀</small></article><article><span>오늘 AI 분석</span><strong>315</strong><small>건</small></article><article><span>처리 대기 업무</span><strong>10</strong><small>건</small></article></section><div className="admin-overview-grid"><article className="admin-panel"><div className="admin-panel-head"><div><span>NEEDS ATTENTION</span><h2>처리 대기</h2></div></div><div className="admin-task-list"><button onClick={() => go("refunds")}><b>환불 관리</b><span>처리 대기 3건</span><em>3</em></button><button onClick={() => go("inquiries")}><b>1:1 문의</b><span>답변 대기 7건</span><em>7</em></button><button onClick={() => go("ai")}><b>AI 분석</b><span>처리 오류 2건</span><em>2</em></button></div></article><article className="admin-panel"><div className="admin-panel-head"><div><span>SERVICE STATUS</span><h2>서비스 상태</h2></div></div><div className="admin-status-list"><div><span>API</span><b>정상</b></div><div><span>AI 분석 서버</span><b>정상</b></div><div><span>데이터 저장소</span><b>정상</b></div><div><span>결제 시스템</span><b>정상</b></div></div></article></div></>}

      {safeSection === "users" && <section className="admin-panel"><div className="admin-panel-head"><div><span>USER MANAGEMENT</span><h2>사용자 계정</h2></div></div><div className="admin-management-tools"><input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="이름, 역할, 소속 검색" aria-label="사용자 검색" /><select value={userSort} onChange={(e) => setUserSort(e.target.value)} aria-label="사용자 정렬"><option value="name-asc">이름 오름차순</option><option value="name-desc">이름 내림차순</option><option value="role-asc">역할 오름차순</option><option value="status-asc">상태 오름차순</option><option value="recent-desc">최근 접속 최신순</option><option value="recent-asc">최근 접속 오래된순</option></select></div><DataTable headers={["사용자","역할","소속","상태","최근 접속"]} rows={userRows} /></section>}
      {safeSection === "athletes" && <section className="admin-panel"><div className="admin-panel-head"><div><span>ATHLETE MANAGEMENT</span><h2>선수 계정 및 소속</h2></div></div><div className="admin-management-tools"><input value={athleteSearch} onChange={(e) => setAthleteSearch(e.target.value)} placeholder="선수명, 종목, 팀 검색" aria-label="선수 검색" /><select value={athleteSort} onChange={(e) => setAthleteSort(e.target.value)} aria-label="선수 정렬"><option value="name-asc">선수명 오름차순</option><option value="name-desc">선수명 내림차순</option><option value="sport-asc">종목 오름차순</option><option value="team-asc">팀 오름차순</option><option value="status-asc">상태 오름차순</option><option value="recent-desc">최근 측정 최신순</option><option value="recent-asc">최근 측정 오래된순</option></select></div><DataTable headers={["선수","종목","팀","상태","최근 측정"]} rows={athleteRows} /></section>}
      {safeSection === "teams" && <section className="admin-panel"><div className="admin-panel-head"><div><span>TEAM MANAGEMENT</span><h2>팀 · 구단</h2></div></div><div className="admin-management-tools"><input value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} placeholder="팀명, 종목 검색" aria-label="팀 검색" /><select value={teamSort} onChange={(e) => setTeamSort(e.target.value)} aria-label="팀 정렬"><option value="name-asc">팀명 오름차순</option><option value="name-desc">팀명 내림차순</option><option value="sport-asc">종목 오름차순</option><option value="athletes-desc">선수 수 많은순</option><option value="athletes-asc">선수 수 적은순</option><option value="coaches-desc">코치 수 많은순</option><option value="status-asc">상태 오름차순</option></select></div><DataTable headers={["구단/팀","종목","선수","코치","상태"]} rows={teamRows} /></section>}
      {safeSection === "ai" && <section className="admin-panel"><div className="admin-panel-head"><div><span>AI OPERATIONS</span><h2>AI 분석 처리 현황</h2></div></div><div className="admin-kpis inner"><article><span>오늘 처리</span><strong>315</strong><small>건</small></article><article><span>처리 성공률</span><strong>98.7</strong><small>%</small></article><article><span>대기</span><strong>4</strong><small>건</small></article><article><span>오류</span><strong>2</strong><small>건</small></article></div><DataTable headers={["분석 유형","오늘 처리","성공","오류","상태"]} rows={[["Camera AI","126","124","2","정상"],["AI 분석 / 리포트","94","94","0","정상"],["성장 / 체력 분석","95","95","0","정상"]]} /></section>}
      {safeSection === "measurements" && <section className="admin-panel"><div className="admin-panel-head"><div><span>MEASUREMENTS</span><h2>측정 데이터</h2></div></div><DataTable headers={["측정 항목","오늘 측정","최근 7일","데이터 상태"]} rows={[["점프력","82","431","정상"],["속도","46","238","정상"],["근력","38","192","정상"],["신체정보/BMI","67","315","정상"]]} /></section>}
      {safeSection === "medical" && <section className="admin-panel"><div className="admin-panel-head"><div><span>MEDICAL & REHAB</span><h2>의료 · 재활 운영</h2></div></div><DataTable headers={["항목","진행 중","이번 달","상태"]} rows={[["부상 관리","12","28","정상"],["재활 프로그램","18","36","정상"],["복귀 관리","7","14","정상"]]} /></section>}
      {safeSection === "research" && <><section className="admin-panel"><div className="admin-panel-head"><div><span>RESEARCH</span><h2>연구 · 통계</h2></div><b>{researchRows.length}명</b></div><div className="admin-research-filters"><select value={researchFilters.injury} onChange={(e) => setResearchFilters((v) => ({ ...v, injury: e.target.value }))}><option value="all">부상 부위: 전체</option>{researchOptions.injuries.map((v) => <option key={v} value={v}>{v}</option>)}</select><select value={researchFilters.sport} onChange={(e) => setResearchFilters((v) => ({ ...v, sport: e.target.value }))}><option value="all">종목: 전체</option>{researchOptions.sports.map((v) => <option key={v} value={v}>{v}</option>)}</select><select value={researchFilters.gender} onChange={(e) => setResearchFilters((v) => ({ ...v, gender: e.target.value }))}><option value="all">성별: 전체</option>{researchOptions.genders.map((v) => <option key={v} value={v}>{v === "male" ? "남성" : v === "female" ? "여성" : v === "other" ? "기타" : v}</option>)}</select><select value={researchFilters.age} onChange={(e) => setResearchFilters((v) => ({ ...v, age: e.target.value }))}><option value="all">나이대: 전체</option>{researchOptions.ages.map((v) => <option key={v} value={v}>{v}</option>)}</select></div><DataTable headers={["구분","인원","비율"]} rows={[["필터 결과",String(researchRows.length),`${researchRows.length ? 100 : 0}%`],["부상 기록 있음",String(researchRows.filter((r) => r.injury !== "미입력").length),`${researchRows.length ? Math.round(researchRows.filter((r) => r.injury !== "미입력").length / researchRows.length * 100) : 0}%`],["남성",String(researchRows.filter((r) => r.gender === "male").length),`${researchRows.length ? Math.round(researchRows.filter((r) => r.gender === "male").length / researchRows.length * 100) : 0}%`],["여성",String(researchRows.filter((r) => r.gender === "female").length),`${researchRows.length ? Math.round(researchRows.filter((r) => r.gender === "female").length / researchRows.length * 100) : 0}%`]]} /></section><ResearchPanel /></>}
      {safeSection === "billing" && <BillingPanel />}
      {safeSection === "refunds" && <RefundPanel />}
      {safeSection === "inquiries" && <InquiryPanel />}
      {safeSection === "notices" && <section className="admin-panel"><div className="admin-panel-head"><div><span>NOTICE</span><h2>공지사항</h2></div></div><label className="admin-field">제목<input value={noticeTitle} onChange={e=>setNoticeTitle(e.target.value)} placeholder="공지사항 제목" /></label><label className="admin-field">내용<textarea value={noticeBody} onChange={e=>setNoticeBody(e.target.value)} rows={5} placeholder="전체 사용자에게 전달할 내용을 입력하세요." /></label><button className="admin-primary-button" onClick={()=>{ if(!noticeTitle.trim()||!noticeBody.trim()) return; localStorage.setItem("nova-admin-notice",JSON.stringify({title:noticeTitle,body:noticeBody,updatedAt:new Date().toISOString()})); window.dispatchEvent(new CustomEvent("nova-notice-updated",{detail:{title:noticeTitle,body:noticeBody}})); }}>공지 저장</button></section>}
      {safeSection === "logs" && <section className="admin-panel"><div className="admin-panel-head"><div><span>AUDIT LOG</span><h2>운영 로그</h2></div></div><DataTable headers={["시간","사용자","작업","대상","결과"]} rows={[["10:01","John Kim","로그인","관리자","성공"],["09:58","김민수","선수 정보 조회","김민수","성공"],["09:42","System","AI 분석 처리","RF-260824","성공"],["09:31","최유진","1:1 문의 등록","Q-260824-103","접수"]]} /></section>}
      {safeSection === "beta" && <BetaPanel />}
      {safeSection === "settings" && <section className="admin-panel"><div className="admin-panel-head"><div><span>SYSTEM</span><h2>시스템 설정</h2></div></div><div className="admin-settings-list"><div><span>서비스 상태</span><b>운영 중</b></div><div><span>AI 분석 사용</span><b>활성</b></div><div><span>신규 회원가입</span><b>활성</b></div><div><span>관리자 알림</span><b>활성</b></div></div><button className="admin-primary-button" onClick={openSettings}>기존 환경설정 열기</button></section>}
    </section>
  </main>;
}
