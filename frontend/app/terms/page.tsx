export default function TermsPage() {
  return (
    <main style={{minHeight:"100svh",padding:"48px 20px",background:"var(--nova-background)",color:"var(--nova-text)"}}>
      <article style={{maxWidth:860,margin:"0 auto",lineHeight:1.8}}>
        <h1>NOVA Sports AI 이용약관</h1>
        <p>시행일: 2026년 8월 18일</p>
        <h2>제1조 목적</h2><p>NOVA Sports AI는 선수 퍼포먼스, 팀 관리, 재활 및 분석 서비스를 제공합니다.</p>
        <h2>제2조 이용자</h2><p>이용자는 정확한 정보를 제공하고 본인의 권한 범위에서 서비스를 이용해야 합니다.</p>
        <h2>제3조 계정</h2><p>계정의 관리 책임은 이용자에게 있으며 타인의 계정을 무단으로 사용해서는 안 됩니다.</p>
        <h2>제4조 데이터</h2><p>서비스 이용 과정에서 생성되는 선수·훈련·재활 데이터는 서비스 목적과 이용자가 동의한 범위에서 처리됩니다.</p>
        <h2>제5조 탈퇴</h2><p>이용자는 환경설정의 회원 탈퇴를 통해 계정을 삭제할 수 있습니다. 삭제된 계정은 복구할 수 없습니다.</p>
        <h2 id="privacy">개인정보처리방침</h2>
        <p>회원가입 및 서비스 제공에 필요한 이름, 이메일, 역할 등의 정보를 처리합니다. 법령상 보존이 필요한 경우를 제외하고 탈퇴 요청에 따라 관련 계정을 삭제합니다.</p>
        <p><a href="/login">로그인으로 돌아가기</a></p>
      </article>
    </main>
  );
}
