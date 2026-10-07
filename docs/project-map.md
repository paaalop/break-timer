# 프로젝트 지도

주요 책임의 위치를 찾기 위한 안내다. 실제 동작은 해당 소스에서 확인한다.

## 실행과 화면

- Next.js App Router, React, TypeScript, Tailwind CSS 기반 앱이다.
- `app/page.tsx`: 인증 상태에 따라 로그인 또는 스케줄러로 이동.
- `app/login/page.tsx`: 관리자 로그인.
- `app/employees/page.tsx`: 직원 조회·등록·수정·삭제.
- `app/scheduler/page.tsx`: 주간 근무표 편집과 이미지 내보내기.
- `app/auto-break/page.tsx`: 날짜별 슬롯 클릭 휴게 배치, 시작시간 설정과 시간대별 휴게·근무 현황.
- `app/layout.tsx`: 공통 레이아웃, 폰트, 메타데이터, 분석 연동.
- `proxy.ts`: 인증 쿠키에 따른 경로 접근 제어.

## 상태와 데이터

- `store/useAuthStore.ts`: 인증과 세션 관리.
- `store/useEmployeeStore.ts`: 직원 데이터 조회·저장.
- `store/useScheduleStore.ts`: 근무표, 일별 휴게 설정, 자동 배치와 저장.
- `lib/supabase.ts`: 환경 변수로 Supabase 클라이언트 생성.
- `types/index.ts`: 직원·근무표·휴게 설정 등 공통 타입.
- `docs/schema.sql`, `supabase/migrations/`: DB 스키마와 후속 변경.
- `docs/database-security.md`: 운영 RLS 적용 절차와 관리자 접근 정책.
- `supabase/verify-admin-access.sql`: 운영 DB 접근 정책 검증.
- `.env.example`: Supabase 연결 환경 변수 예시.

## 공통 UI와 계산

- `components/layout/Header.tsx`: 상단 탐색과 로그아웃.
- `components/employees/EmployeeTable.tsx`: 직원 목록과 편집 UI.
- `components/scheduler/`: 근무표 그리드·행, 내보내기, 휴게 모달과 경고.
- `components/ui/ShiftTypePicker.tsx`: 직원·근무 수정에서 공유하는 근무 타입과 파트 세부 유형 선택.
- `components/ui/`: 공통 입력·날짜 탐색·아바타·모달 UI.
  `Overlay.tsx`가 모달의 포커스, 스크롤 잠금과 닫기 동작을 담당한다.
- `app/globals.css`: 전역 스타일과 디자인 토큰.
- `components/scheduler/SlotBreakModal.tsx`: 슬롯별 직원 선택과 휴게 배치·이동·해제.
- `lib/autoBreakAlgo.ts`: 공통 휴게 길이 계산, 자동 휴게 배치와 휴게 구간 검증.
- `lib/scheduleValidation.ts`: 휴게시간의 근무시간 범위 검사.
- `lib/breakValidation.ts`: 슬롯 배치 가능 여부, 직원별 오류와 시간대별 포지션 검사.
- `lib/weekUtils.ts`, `lib/timeUtils.ts`: 날짜·주간 범위·시간 표시 계산.
- `lib/constants.ts`: 직무·요일·근무 타입 등 공통 상수.
- `hooks/useRefetchOnFocus.ts`: 창 포커스 복귀 시 데이터 재조회.
- `components/analytics/ClarityAnalytics.tsx`: Clarity 분석 연동.

## 검증과 문서

- 실행 명령은 `package.json`에 정의한다: 개발 `npm run dev`, lint
  `npm run lint`, 테스트 `npm test`, 빌드 `npm run build`.
- 타입 검사: `npx tsc --noEmit`.
- 테스트 설정: `vitest.config.ts`, `vitest.setup.ts`.
- 주요 테스트: `components/ui/Overlay.test.tsx`,
  `lib/scheduleValidation.test.ts`, `tests/design-system.test.ts`.
- `docs/PRD.md`: 제품 요구사항. `docs/plan.md`: 장기 계획과 과거 기록.
  현재 작업 범위는 사용자의 지시와 `AGENTS.md`를 따른다.
