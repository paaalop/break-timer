# 현재 프로젝트 지도

이 문서는 현재 소스 코드와 설정에서 확인한 사실만 기록한다. 제품의 목표와
장기 계획은 `docs/PRD.md`와 `docs/plan.md`를 참고하되, 계획 내용을 현재 구현으로
간주하지 않는다.

## 진입점과 실행 방식

- 애플리케이션은 Next.js 16.3.4 App Router와 React 19, TypeScript, Tailwind CSS
  v4로 구성되어 있다 (`package.json`, `app/`).
- `npm run dev`로 개발 서버를 실행하고, `npm run build`로 프로덕션 빌드를
  생성한다.
- `/`는 클라이언트에서 인증 상태를 확인해 `/scheduler` 또는 `/login`으로
  이동한다 (`app/page.tsx`).
- 사용자 화면은 `/login`, `/employees`, `/scheduler`, `/auto-break`에 구현되어
  있다 (`app/**/page.tsx`).
- `proxy.ts`는 로그인과 Next.js 정적 경로 등을 제외한 요청에서 인증 관련
  쿠키를 검사하고, 쿠키가 없으면 `/login`으로 보낸다.
- Supabase 연결 정보는 `NEXT_PUBLIC_SUPABASE_URL`과
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`에서 읽는다. 예시는 `.env.example`에 있다.

## 주요 파일과 책임

| 경로 | 현재 역할 |
| --- | --- |
| `app/layout.tsx` | 공통 HTML 레이아웃, 메타데이터, Vercel Analytics와 Clarity 연동 |
| `app/login/page.tsx` | 관리자 로그인 UI와 인증 스토어 호출 |
| `app/employees/page.tsx` | 직원 조회·등록·수정·소프트 삭제 화면 |
| `app/scheduler/page.tsx` | 주간 근무표 조회·편집·자동 채움·이미지 내보내기 화면 |
| `app/auto-break/page.tsx` | 날짜별 휴게 설정, 자동 배치, 시간대별 근무·휴게 현황 화면 |
| `store/useAuthStore.ts` | Supabase Auth 로그인·로그아웃·세션 확인과 연결 정보가 없을 때의 목업 인증 |
| `store/useEmployeeStore.ts` | `employees` 조회·생성·수정·소프트 삭제 및 목업 폴백 |
| `store/useScheduleStore.ts` | `work_schedules`와 `daily_break_settings` 조회·저장, 자동 근무/휴게 배치, 로컬 폴백 |
| `lib/autoBreakAlgo.ts` | 휴게 배치와 수동 휴게 검증에 사용하는 순수 계산 로직 |
| `lib/weekUtils.ts` | 날짜 문자열 변환, 주 시작일·주간 날짜·표시 범위 계산 |
| `lib/supabase.ts` | 환경 변수로 생성하는 Supabase 브라우저 클라이언트 |
| `types/index.ts` | 직원, 근무표, 휴게 설정과 알고리즘 결과의 공통 타입 |
| `proxy.ts` | 요청 쿠키 기반의 라우트 접근 제어 |
| `docs/schema.sql`, `supabase/migrations/` | 현재 데이터베이스 기본 스키마와 후속 마이그레이션 |

## 재사용할 공통 구현

같은 목적의 새 구현을 만들기 전에 아래 항목을 확인한다.

| 경로 | 재사용 목적 | 현재 사용처 |
| --- | --- | --- |
| `components/layout/Header.tsx` | 상단 탐색과 로그아웃 UI | 직원, 스케줄러, 휴게 배치 화면 |
| `components/ui/Overlay.tsx` | 포털, 중첩 스택, 스크롤 잠금, ESC·백드롭·뒤로가기, 포커스 관리 | 모든 바텀시트와 중앙 모달 |
| `components/ui/BottomSheet.tsx` | 드래그 닫기가 없는 공통 하단 시트 셸 | 직원·스케줄 편집, 시간 선택 UI |
| `components/ui/Dialog.tsx`, `ConfirmDialog.tsx` | 중앙 모달 셸과 비동기 확인/취소 흐름 | 규칙·수동 휴게·삭제·초기화 확인 UI |
| `components/ui/PageHeader.tsx` | 페이지 제목과 선택적 우측 액션 | 직원, 스케줄러, 휴게 배치 화면 |
| `components/ui/DateNavigator.tsx` | 이전·다음 날짜 이동과 접근성 레이블 | 스케줄러, 휴게 배치 화면 |
| `components/ui/Avatar.tsx` | 직원 이니셜 아바타 | 직원, 휴게 배치 화면 |
| `components/ui/Input.tsx` | 공통 입력 필드 | 로그인 등 폼 화면 |
| `components/ui/MultiSelectDropdown.tsx` | 다중 선택 입력 | 직원 편집 UI |
| `components/ui/TimeWheelPickerModal.tsx` | 시간 선택 모달 | 휴게 시간 입력 UI |
| `app/globals.css` | 색상·간격·반경·타이포그래피 토큰과 공통 UI 클래스의 단일 원천 | 전체 제품 UI |
| `lib/timeUtils.ts` | 시간 표시 형식 변환 | 근무표와 휴게시간 UI |
| `components/scheduler/WeekGrid.tsx`와 `DayCard.tsx` | 주간·일간 근무표 표시 | `/scheduler` |
| `components/scheduler/EmployeeRow.tsx` | 직원별 근무 행 편집 | 스케줄 카드 |
| `components/scheduler/BreakWarningBanner.tsx` | 휴게 배치 경고 표시 | 스케줄러와 휴게 배치 화면 |
| `hooks/useRefetchOnFocus.ts` | 탭 복귀·창 포커스 시 데이터 재조회 | 직원, 스케줄러, 휴게 배치 화면 |
| `lib/constants.ts` | 직무·요일·근무 타입 옵션과 표시명, 휴게 계산 상수 | 폼, 표, 알고리즘 |

## 상태와 데이터 흐름

- 화면 상태와 서버 데이터 캐시는 Zustand의 인증·직원·스케줄 스토어 세 곳으로
  나뉜다 (`store/`).
- Supabase가 설정되면 인증은 Supabase Auth를 사용하고, 직원·근무표·일별 휴게
  설정은 각각 `employees`, `work_schedules`, `daily_break_settings` 테이블을
  사용한다.
- Supabase가 설정되지 않았거나 일부 DB 작업이 실패하면 스토어의 메모리 목업과
  브라우저 `localStorage` 폴백을 사용하는 경로가 있다. 휴게 설정과 자동 배치
  결과의 로컬 키도 `useScheduleStore.ts`에서 관리한다.
- 직원 삭제는 `is_deleted` 플래그를 갱신하는 소프트 삭제 경로로 구현되어 있다.
- 스케줄러와 휴게 배치 화면은 스토어가 반환한 `WorkSchedule`에 조인된 직원
  정보를 사용한다. 자동 휴게 계산은 `lib/autoBreakAlgo.ts`에서 수행하고 결과를
  스토어가 저장한다.

## 검증

- 정적 검사: `npm run lint`
- TypeScript 검사: `npx tsc --noEmit`
- 프로덕션 빌드: `npm run build`
- 자동 테스트: `npm test` (Vitest, React Testing Library, jsdom)
- 개발 실행: `npm run dev`
- 오버레이 테스트는 단일·중첩 스크롤 잠금, ESC·백드롭·브라우저 뒤로가기,
  최상단 닫기와 포커스 복원을 검증한다. 소스 검사 테스트는 `globals.css` 외부의
  색상 리터럴, 금지된 그림자·그라데이션과 네이티브 `confirm()` 재도입을 막는다.
- `scratch/**`의 CommonJS 진단 스크립트는 제품 lint 대상에서 제외한다.
- 직원 CRUD, 주간 스케줄 편집, 자동·수동 휴게 배치, 이미지 내보내기와 인증 흐름은
  실행 중인 앱과 Supabase/목업 환경에서 별도로 확인해야 한다.
- 2026-10-01 기준 `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`가
  모두 통과한다. 현재 Node.js 20에서는 Supabase가 향후 Node.js 22 이상으로
  업그레이드하라는 경고를 출력한다.
- Next.js 관련 코드를 수정하기 전에는 `AGENTS.md` 지시에 따라 설치된 버전의
  `node_modules/next/dist/docs/`에서 관련 API 문서를 확인한다.

## 기존 문서와 현재 구현의 구분

- `docs/PRD.md`는 제품 요구사항이고 `docs/plan.md`는 장기 단계와 과거 진행 기록을
  포함한다. 두 문서의 항목은 사용자 승인 없이 구현 작업으로 시작하지 않는다.
- 현재 코드에는 PRD/계획 초기안 이후 추가된 `/auto-break`, 일별 휴게 설정,
  `manager` 직무, 분석 연동과 관련 마이그레이션이 존재한다. 정확한 현재 동작은
  위에 적은 소스와 설정을 기준으로 다시 확인한다.

## 문서 갱신 기준

라우트, 주요 모듈 책임, 데이터 저장소, 외부 연동 또는 검증 명령이 달라지는 코드
변경에서는 관련 항목을 다시 확인한다.
