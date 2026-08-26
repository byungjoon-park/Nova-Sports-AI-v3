import { betaConfig } from "../../lib/beta-config";

export default function BetaStatusPage() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#f4efe3", color: "#20231f" }}>
      <section style={{ width: "min(100%, 520px)", padding: 32, background: "#fffdf7", border: "1px solid #e7dfcf", borderRadius: 24 }}>
        <p style={{ letterSpacing: ".12em", fontSize: 12 }}>NOVA SPORTS AI · BETA</p>
        <h1 style={{ margin: "10px 0" }}>베타 서비스 상태</h1>
        <p>버전: {betaConfig.version}</p>
        <p>상태: {betaConfig.enabled ? "베타 운영 중" : "베타 비활성"}</p>
        {betaConfig.enabled && <a href="/mobile">모바일 베타 입장</a>}
      </section>
    </main>
  );
}
