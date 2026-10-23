# NOVA Sports AI 자동화 업데이트

## 적용
저장소 루트에서 ZIP을 풀어 안의 파일 경로 그대로 덮어써 주세요. 이 ZIP은 GitHub의 최신 `beta` 기준 모바일 상단바와 CSS를 유지하며, AI 고객지원 기능과 품질 자동화를 더한 전체 교체 파일을 포함합니다.

## 자동화 내용
- PR이 `main` 또는 `beta`를 대상으로 열리거나 갱신되면 AI 리뷰가 변경 diff를 OpenAI Responses API에 보내 한국어 댓글을 작성 또는 갱신합니다. AI가 코드를 수정하거나 병합하지는 않습니다.
- `main`/`beta`의 PR·푸시·수동 실행 시 상담 단위 테스트, AI 상담 관련 파일 린트, TypeScript 검사, 프로덕션 빌드를 실행합니다.
- 저장소 소유자가 `ai-employee` 라벨을 이슈에 붙이거나 GitHub Actions에서 수동 실행하면 AI 구현 직원이 허용된 앱 소스 범위 안에서 코드를 작성하고, 테스트·린트·TypeScript·빌드가 모두 통과할 때만 초안 PR을 엽니다. 코드를 직접 기본 브랜치에 병합하거나 배포하지 않습니다.
- 모바일 문의 화면에 AI 상담과 기존 1:1 문의 전환 기능을 함께 제공합니다.
- 저장소의 기존 beta-to-production 워크플로가 beta 빌드에 성공하면 main으로 승격합니다. Vercel 프로젝트가 저장소의 main 브랜치에 연결되어 있어야 실제 프로덕션 자동 배포가 이어집니다.

### AI 구현 직원 사용 방법
1. GitHub 저장소에서 구현할 일을 이슈로 작성합니다.
2. 저장소 소유자가 `ai-employee` 라벨을 붙입니다. 또는 **Actions → NOVA AI 구현 직원 → Run workflow**에서 작업 내용을 직접 입력합니다.
3. 검사를 통과하면 `beta` 대상 초안 PR이 열립니다. 검토 후 준비 완료로 표시하고 병합해야 이후 배포 절차가 시작됩니다.

AI 구현 직원은 기존 파일 중 `frontend/app/`, `frontend/components/`, `frontend/lib/`, `frontend/tests/`의 최대 8개 파일만 수정합니다. 워크플로, 의존성, 인증 설정과 비밀값은 변경하지 않습니다. 자동 검사 실패 또는 안전 범위 밖 요청은 PR을 만들지 않고 실행을 실패 처리합니다.

## 필요한 설정

### GitHub
**Settings → Secrets and variables → Actions**에서 다음을 설정하세요.

- Repository secret `OPENAI_API_KEY`
- Repository variable `OPENAI_MODEL` (사용 가능한 Responses API 모델 ID)

코드 리뷰가 켜지면 PR diff가 OpenAI API로 전송됩니다.

### Vercel AI 상담
**Settings → Environment Variables**에 다음 값을 추가한 뒤 배포하세요.

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `SUPPORT_AI_ENABLED=true`

AI 상담은 전송 동의 후에만 질문을 서버로 보냅니다. 연락처나 건강 관련 질문은 OpenAI API로 전달하지 않습니다. 요청에는 `store: false`를 적용합니다. 실제 데이터 보존은 OpenAI API 계정의 정책을 확인해 주세요.

## 검사와 빌드
2026-10-24 현재 자동화 파일은 테스트 3개, TypeScript 검사, AI 상담 대상 파일 린트를 통과했습니다. 저장소 전체 린트에는 AI 변경과 무관한 기존 파일 오류가 있어 워크플로는 이번 AI 상담 파일만 린트하고 전체 TypeScript·빌드를 검사합니다.

Windows에서 Turbopack이 `.next/cache/turbopack` 내부 인덱스 오류로 중단되면 `frontend` 폴더에서 생성 캐시를 지운 뒤 빌드하세요:

```powershell
Remove-Item -Recurse -Force .next\cache\turbopack
npm run build
```

## 변경 파일
- `.github/workflows/ai-quality-check.yml`
- `.github/workflows/ai-pr-review.yml`
- `.github/scripts/ai-pr-review.mjs`
- `README.md`
- `frontend/app/api/assistant/support/route.ts`
- `frontend/app/mobile/inquiry/page.tsx`
- `frontend/app/mobile/mobile.css`
- `frontend/lib/support-ai-rules.mjs`
- `frontend/lib/support-ai-rules.d.mts`
- `frontend/tests/support-ai-rules.test.mjs`
- `frontend/package.json`

## 커밋 안내
커밋 메시지: `Add AI support and automated quality checks`

빌드 명령어 (`frontend` 폴더에서):

```powershell
npm run build
```

빌드가 성공한 뒤 저장소 루트에서 대상 파일만 스테이징하고 커밋·푸시하세요:

```powershell
git add .github/workflows/ai-quality-check.yml .github/workflows/ai-pr-review.yml .github/scripts/ai-pr-review.mjs README.md frontend/app/api/assistant/support/route.ts frontend/app/mobile/inquiry/page.tsx frontend/app/mobile/mobile.css frontend/lib/support-ai-rules.mjs frontend/lib/support-ai-rules.d.mts frontend/tests/support-ai-rules.test.mjs frontend/package.json
git commit -m "Add AI support and automated quality checks"
git push origin beta
```
