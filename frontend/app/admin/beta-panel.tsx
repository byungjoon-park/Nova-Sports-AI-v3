"use client";

import { useEffect, useState } from "react";
import { getBetaConfig, regenerateBetaCode, saveBetaConfig, type NovaBetaConfig } from "../../lib/nova-beta";
import { betaConfig } from "../../lib/beta-config";

export default function BetaPanel() {
  const [config, setConfig] = useState<NovaBetaConfig>({ enabled: false, code: "", updatedAt: "" });
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setConfig(getBetaConfig());
    setOrigin(window.location.origin);
  }, []);

  const toggle = () => setConfig(saveBetaConfig({ enabled: !config.enabled, code: config.code }));
  const regenerate = () => setConfig(regenerateBetaCode());
  const betaUrl = config.code ? `${origin}/mobile?beta=${encodeURIComponent(config.code)}` : `${origin}/mobile`;

  return <section className="admin-panel">
    <div className="admin-panel-head"><div><span>BETA MANAGEMENT</span><h2>베타 관리</h2><p>모바일 베타 접근을 관리합니다.</p></div><button className="admin-secondary-button" onClick={toggle}>{config.enabled ? "베타 OFF" : "베타 ON"}</button></div>
    <div className="admin-kpis inner">
      <article><span>베타 상태</span><strong>{config.enabled ? "ON" : "OFF"}</strong><small>접근 제어</small></article>
      <article><span>초대 코드</span><strong>{config.code || "-"}</strong><small>테스터 공유용</small></article><article><span>배포 버전</span><strong>{betaConfig.version}</strong><small>{betaConfig.enabled ? "배포 환경 ON" : "배포 환경 OFF"}</small></article>
    </div>
    <div className="admin-settings-list">
      <div><span>베타 접속 주소</span><b>{betaUrl}</b></div>
      <div><span>접근 방식</span><b>초대 코드가 포함된 링크</b></div>
      <div><span>마지막 변경</span><b>{config.updatedAt ? new Date(config.updatedAt).toLocaleString("ko-KR") : "-"}</b></div>
    </div>
    <div className="admin-panel-actions" style={{ marginTop: 18 }}>
      <button className="admin-primary-button" onClick={regenerate}>초대 코드 재발급</button>
      <button className="admin-secondary-button" onClick={() => { if (navigator.clipboard) void navigator.clipboard.writeText(betaUrl); }}>베타 링크 복사</button>
    </div>
    <p className="admin-header-p" style={{ marginTop: 14 }}>배포 서버의 베타 상태는 환경변수로 관리합니다. 현재 초대 코드는 브라우저 저장 구조를 사용하므로 실제 공개 서비스의 보안 권한으로 사용하지 마세요.</p>
  </section>;
}
