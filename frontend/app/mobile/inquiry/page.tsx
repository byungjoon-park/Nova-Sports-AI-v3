"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "../../../lib/nova-auth";
import "../mobile.css";
import NovaTopBar from "../../../components/NovaTopBar";

type InquiryRow = {
  id: string;
  user: string;
  userEmail: string;
  type: string;
  content: string;
  status: string;
  received: string;
  createdAt: string;
};

export default function MobileInquiryPage(){const router=useRouter();const [user,setUser]=useState<ReturnType<typeof getCurrentUser>>(null);const [type,setType]=useState("일반");const [content,setContent]=useState("");const [sent,setSent]=useState(false);useEffect(()=>{const u=getCurrentUser();if(!u){router.replace("/mobile/login");return;}setUser(u)},[router]);const submit=(e:FormEvent)=>{e.preventDefault();if(!user||!content.trim())return;let rows: InquiryRow[] = [];try { const parsed: unknown = JSON.parse(localStorage.getItem("nova-inquiries") || "[]"); rows = Array.isArray(parsed) ? parsed.filter((row): row is InquiryRow => typeof row === "object" && row !== null && typeof (row as Record<string, unknown>).id === "string") : []; } catch {}rows.unshift({id:`Q-${Date.now()}`,user:user.name,userEmail:user.email,type,content:content.trim(),status:"답변 대기",received:new Date().toLocaleString("ko-KR"),createdAt:new Date().toISOString()});localStorage.setItem("nova-inquiries",JSON.stringify(rows));setContent("");setSent(true)};if(!user)return null;return <main className="mobile-page theme-ivory"><NovaTopBar statusText="AI 시스템 준비" />
      <div className="mobile-page-title"><span className="mobile-eyebrow">NOVA SPORTS AI · MOBILE</span><h1>1:1 문의</h1><p>문의 내용을 남기면 관리자가 확인합니다.</p></div><section className="mobile-content-card"><form onSubmit={submit} className="mobile-account-form"><label>문의 유형<select value={type} onChange={e=>setType(e.target.value)}><option>일반</option><option>결제</option><option>AI 분석</option><option>계정</option><option>선수 관리</option><option>기타</option></select></label><label>문의 내용<textarea value={content} onChange={e=>setContent(e.target.value)} rows={7} placeholder="문의 내용을 입력하세요." required/></label><button className="mobile-action-button" type="submit">문의 접수</button>{sent&&<p className="mobile-note">문의가 접수되었습니다. 답변을 기다려 주세요.</p>}</form></section></main>}