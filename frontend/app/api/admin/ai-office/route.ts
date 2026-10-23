const REPOSITORY = "byungjoon-park/Nova-Sports-AI-v3";
const WORKFLOW_NAMES = [
  "NOVA AI 구현 직원",
  "NOVA AI 코드 리뷰",
  "NOVA AI 품질 검사",
  "NOVA Beta to Production",
] as const;

type GitHubRun = {
  id: number;
  name: string;
  display_title: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  run_started_at: string | null;
  updated_at: string;
  head_branch: string;
  event: string;
};

export async function GET() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPOSITORY}/actions/runs?per_page=100`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      return Response.json(
        { error: `GitHub Actions 정보를 불러오지 못했습니다. (${response.status})` },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload = (await response.json()) as { workflow_runs?: GitHubRun[] };
    const runs = (payload.workflow_runs ?? [])
      .filter((run) => WORKFLOW_NAMES.includes(run.name as (typeof WORKFLOW_NAMES)[number]))
      .map((run) => ({
        id: run.id,
        name: run.name,
        title: run.display_title,
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        startedAt: run.run_started_at,
        updatedAt: run.updated_at,
        branch: run.head_branch,
        event: run.event,
      }));

    return Response.json(
      { runs, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json(
      { error: "GitHub Actions 연결에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
