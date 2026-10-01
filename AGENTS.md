<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 작업 진입점

자연어 작업 지시는 `.agent-workflow/WORKFLOW.md`를 따른다. 빠른 수정은
`docs/current-task.md` 없이 처리하고, 계획 작업은 구현 전에 그 파일에 하나만
정의한다. 이번 작업에 필요한 프로젝트 문서와 소스 코드만 연다.

이 프로젝트에 workflow를 처음 연결하는 중이라면
`.agent-workflow/BOOTSTRAP.md`에서 시작하고, 초기화 결과를 보고한 뒤 중단한다.

프로젝트 문서 경로는 다음과 같다.

- 제품 요구사항: `docs/PRD.md`
- 현재 구현 지도와 검증 진입점: `docs/project-map.md`
- 승인된 계획 작업: `docs/current-task.md`
- 장기 계획과 과거 진행 기록: `docs/plan.md`

`docs/plan.md`의 미완료 항목이나 단계 표시는 자동 실행 지시가 아니다. 사용자가
현재 작업으로 승인한 범위만 수행한다.

코드 검증 진입점은 `npm run lint`, `npx tsc --noEmit`, `npm run build`이다.
