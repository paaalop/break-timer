# 레스토랑 직원 근무/휴게시간 관리 시스템 — 개발 플랜 (AI 에이전트 실행용)

> 이 문서의 목적: 에이전트가 이 파일 하나만 읽고 처음부터 끝까지 개발을 완주한다.

---

## 📍 현재 진행 현황 (에이전트가 Phase 완료 시 반드시 업데이트)

> **⚠️ 새로운 대화에서 시작하는 에이전트는 이 섹션을 가장 먼저 읽어라.**
> 소스코드를 보고 진행 상황을 추측하지 말 것 — 이 표가 유일한 정답이다.

| Phase | 버전 | 내용 | 상태 | 완료일 |
|---|---|---|---|---|
| Phase 0 | v0.0 | 환경 설정 (패키지 설치, 디자인 토큰, 타입/스토어/Supabase 기반) | 🔄 진행중 | 2026-09-10 |
| Phase 1 | v0.1 | 직원 관리 페이지 (`/employees`) CRUD 완성 | 🔄 진행중 | 2026-09-10 |
| Phase 2 | v0.2 | 주간 스케줄러 (`/scheduler`) UI + 근무 등록 완성 | 🔄 진행중 | 2026-09-10 |
| Phase 3 | v0.3 | 휴게시간 자동 배치 알고리즘 + 경고 배너 | 🔄 진행중 | 2026-09-10 |
| Phase 4 | v0.4 | 수동 휴게 조작 + 제약 검증 + 이미지 다운로드 | 🔄 진행중 | 2026-09-10 |
| Phase 5 | v1.0 | 인증(로그인) + 배포 준비 + 최종 QA | 🔄 진행중 | 2026-09-10 |

**현재 작업 Phase:** `Phase 0~5 코드 완성 — 사용자 검토 대기 중`

**확정된 결정 사항:**
- Supabase 연동: `.env.local`에 키 삽입 (없으면 Phase 0에서 목업 모드로 fallback)
- 인증: 단일 관리자 이메일/비밀번호 (Supabase Auth)
- 월별 정산 뷰: **v1 범위 외** (Non-Goal)
- 직원 관리: 별도 페이지 `/employees` (메인 스케줄러와 분리)
- 휴게 기준 시작 시간 기본값: `13:30`

---

### 에이전트 재시작 및 컨텍스트 보호 프로토콜 (Resume & Context Protection Protocol)

새로운 대화에서 시작할 때 혹은 페이즈를 수행하고 종료할 때 아래 순서를 철저히 따른다:

1. **시작 시 상태 표 확인 & 기능 개발:** 이 섹션의 표를 확인하고 `⬜ 대기` 또는 `🔄 진행중`인 Phase로 이동하여 작업을 진행한다.
2. **자체 빌드 및 디버그 실검증:** 코드 수정 시 반드시 터미널에서 `npx tsc --noEmit` 및 `npm run dev` 실행으로 '0 Errors'를 실제로 증명하고 디버깅한다.
3. **✋ 사용자 검사 (USER REVIEW) 및 무한 피드백 루프:** 자체 디버깅이 끝나면 멈추고 사용자에게 검사를 요청한다. 버그/피드백이 있으면 `수정 → 빌드 검증 → 사용자 검사`를 반복한다.
4. **Phase 사후 문서화 & 아카이빙 (사용자 최종 승인 시):** 사용자 합격 승인 후 `docs/Phase{N}_Summary.md`에 500자 이내 불릿 포인트 요약 작성. 상태 표 `✅ 완료`로 업데이트 및 해당 Phase 상세 지시문 삭제(Slimming).
5. **🚫 Git 커밋 & 대화 정지:** `git add .` 및 `git commit -m "feat: Phase N 완료"` 실행 후 **현재 대화를 반드시 종료**한다. 다음 Phase는 사용자가 새 대화를 열어 시작한다.

---

### 🛡️ Universal Code Review Protocol (페이즈를 넘어가기 전 필수)

코드 작성/수정 시 아래 6단계를 내부적으로 실행한 뒤 통과한 코드만 출력한다:

1. **🔐 보안:** SQL Injection/XSS 방지, API 키 하드코딩 금지, 접근 제어 누락 없음
2. **🧠 로직:** Null/Undefined 참조 방지, 경계값(빈 배열, 0, 극단값) 처리
3. **⚙️ 자원:** DB 커넥션/파일 I/O 안전 해제
4. **⚡ 성능:** 불필요한 O(N²), N+1 쿼리, 루프 내 무거운 I/O 없음
5. **🛡️ 에러 핸들링:** try/catch로 Graceful Degradation, 에러 삼킴 금지
6. **🧹 클린 코드:** 매직 넘버 상수화, 명확한 변수/함수명

**출력 형식:** 코드 하단에 `🛡️ 통합 자가 점검 완료: [이상 없음 / 발견한 문제와 수정 내용 1줄]` 첨부.

---

## 0. 프로젝트 컨텍스트

### 0-1. 현재 상태 (As-Is)
```
break-timer/
├── app/
│   ├── favicon.ico
│   ├── globals.css      ← Tailwind v4 기본 설정만 있음
│   ├── layout.tsx       ← Create Next App 기본 템플릿
│   └── page.tsx         ← Next.js 기본 홈 화면 (교체 필요)
├── docs/
│   ├── PRD.md           ← 요구사항 문서
│   └── plan.md          ← 이 파일
├── package.json         ← next 16.3.4, react 19.2.8, tailwindcss ^4
└── ...
```

### 0-2. 목표 상태 (To-Be)
```
break-timer/
├── app/
│   ├── globals.css               ← PRD 디자인 토큰 반영
│   ├── layout.tsx                ← 메타데이터, 폰트, lang="ko"
│   ├── page.tsx                  ← 로그인 상태 → /scheduler 리다이렉트
│   ├── login/page.tsx            ← 로그인 페이지
│   ├── scheduler/page.tsx        ← 주간 스케줄러 메인
│   └── employees/page.tsx        ← 직원 관리 페이지
├── components/
│   ├── layout/
│   │   └── Header.tsx
│   ├── scheduler/
│   │   ├── WeekGrid.tsx          ← html2canvas 캡처 대상
│   │   ├── DayCard.tsx
│   │   ├── EmployeeRow.tsx
│   │   ├── BreakWarningBanner.tsx
│   │   └── BreakControlPanel.tsx
│   └── employees/
│       ├── EmployeeForm.tsx
│       └── EmployeeTable.tsx
├── lib/
│   ├── supabase.ts               ← Supabase 클라이언트 싱글턴
│   └── autoBreakAlgo.ts          ← 5단계 Greedy Sliding Window
├── store/
│   ├── useAuthStore.ts
│   ├── useEmployeeStore.ts
│   └── useScheduleStore.ts
├── types/
│   └── index.ts
└── docs/
    ├── schema.sql
    └── Phase{N}_Summary.md       ← Phase 완료 시 생성
```

### 0-3. 기술 환경
- **OS:** Windows (PowerShell)
- **런타임:** Node.js (npx 사용 가능)
- **프레임워크:** Next.js 16.3.4 (App Router), TypeScript, Tailwind CSS v4
- **추가 패키지 (Phase 0에서 설치):**
  ```bash
  npm install zustand @supabase/supabase-js html2canvas
  ```
- **빌드 검증 명령:**
  ```bash
  npx tsc --noEmit   # 타입 에러 검증
  npm run dev        # 개발 서버 실행 (포트 3000)
  ```
- **Supabase:** `.env.local`에서 키 로드. 키가 없으면 목업 데이터로 동작.
- **중요:** `node_modules/next/dist/docs/` 에서 Next.js 16 API 문서를 반드시 확인 후 코드 작성.

---

## 1. 최종 파일 아키텍처

위 0-2의 To-Be 트리 참조. 각 Phase에서 해당 파일들을 순서대로 생성한다.

---

## 2. 핵심 설계 결정 사항 (변경 금지)

| 결정 | 내용 | 이유 |
|---|---|---|
| **물리적 삭제 금지** | 직원 삭제 시 `is_deleted = true` 소프트 삭제만 허용 | 이미 저장된 `work_schedules`와 참조 무결성 유지, 월말 정산 데이터 보존 |
| **알고리즘 처리 순서** | 처리 큐: `oma → open → part → close` | 긴 휴게(90분)를 먼저 처리해야 좁은 슬롯 선점을 방지 |
| **블록 단위** | 30분 = 1블록, oma/open/close = 3블록(90분), part = 1블록(30분) | PRD §4 명시 |
| **Hard Cap 없음** | 동시 휴게 인원 제한 없음 — 평탄화(Greedy)로 분산 | PRD §4 명시 |
| **Fail-safe 강제 배정** | 직무 조건 불만족 시 경고 수집 후 강제 배정 | 배정 자체가 안 되면 운영 불가 |
| **컬러 팔레트** | Primary `#4A3B32`, Dark `#2B2B2B`, BG `#F9F8F6`, Surface `#FFFFFF`, Border `#E8E5E1` | PRD §2 Strict Rules |
| **금지 시각 효과** | 이모지, box-shadow, 그라데이션, 3D 효과 사용 절대 금지 | PRD §2 Strict Rules |
| **레이아웃** | 과도한 테두리 박스화 금지, 여백 + 1px 실선으로 시각적 계층 분리 | PRD §2 Strict Rules |

---

## 3. 공통 데이터 타입

> 에이전트는 아래 코드를 `types/index.ts`에 그대로 사용한다.

```typescript
// types/index.ts

export type ShiftType = 'open' | 'close' | 'oma' | 'part';
export type Role = 'cashier' | 'pass' | 'ade';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Employee {
  id: string;
  name: string;
  available_roles: Role[];
  available_days: DayOfWeek[];
  default_shift_types: ShiftType[];
  is_deleted: boolean;
  created_at: string;
}

export interface WorkSchedule {
  id: string;
  employee_id: string;
  work_date: string;            // 'YYYY-MM-DD'
  shift_type: ShiftType;
  start_time: string;           // 'HH:MM'
  end_time: string;             // 'HH:MM'
  break_start_time: string | null;  // 'HH:MM'
  break_end_time: string | null;    // 'HH:MM'
  created_at: string;
  updated_at: string;
  employee?: Employee;          // Supabase 조인 시 포함
}

export interface BreakWarning {
  time: string;      // '15:00-15:30'
  missing: Role[];   // ['ade']
}

export interface AlgoResult {
  allocations: Record<string, { start: string; end: string }>;
  warnings: BreakWarning[];
}

// Shift 기본 시간 테이블 (변경 금지)
export const SHIFT_DEFAULTS: Record<Exclude<ShiftType, 'part'>, { start: string; end: string }> = {
  open:  { start: '10:30', end: '20:00' },
  close: { start: '12:00', end: '21:30' },
  oma:   { start: '10:30', end: '21:30' },
};

export const ALL_ROLES: Role[] = ['cashier', 'pass', 'ade'];
export const BREAK_BLOCK_MINUTES = 30;
export const BREAK_BLOCKS: Record<Exclude<ShiftType, 'part'>, number> = {
  oma: 3, open: 3, close: 3,
};
export const PART_BREAK_BLOCKS = 1;
```

---

## 4. 핵심 알고리즘 — autoBreakAlgo.ts

> 에이전트는 아래 의사코드를 `lib/autoBreakAlgo.ts`에 순수 함수로 구현한다.

### 함수 시그니처
```typescript
export function autoAssignBreaks(
  schedules: WorkSchedule[],   // employee 필드 포함 필수
  breakStartRef: string        // 기준 시작 시간 'HH:MM' (예: '13:30')
): AlgoResult
```

### 5단계 구현 의사코드

```
Step 1: 필요 블록 계산 & 큐 정렬
  - 각 schedule에 대해:
      blocks = shift_type === 'part' ? PART_BREAK_BLOCKS : BREAK_BLOCKS[shift_type]
  - priorityOrder = { oma: 0, open: 1, part: 2, close: 3 }
  - queue = schedules.sort((a, b) => priorityOrder[a.shift_type] - priorityOrder[b.shift_type])

Step 2: Sliding Window 시뮬레이션 (worker별 반복)
  - allocations: Map<employee_id, {start: number, end: number}> = new Map()
  - warnings: BreakWarning[] = []
  - for each worker in queue:
      slotStartMin = toMinutes(breakStartRef)
      validSlots: { startMin: number; endMin: number; score: number }[] = []
      loop:
          slotEndMin = slotStartMin + blocks * BREAK_BLOCK_MINUTES
          workerEnd = toMinutes(worker.end_time)
          if slotEndMin > workerEnd: break  // 탈출 조건: 근무 종료 초과
          (Step 3 실행)
          if isValid: validSlots.push({ startMin, endMin, score })
          slotStartMin += BREAK_BLOCK_MINUTES  // 30분 전진

Step 3: Constraint 검증 (슬롯별 실행)
  - onBreakIds = [worker.employee_id] + allocations에서 [slotStartMin, slotEndMin)와 겹치는 employee_id들
  - activeWorkers = schedules.filter(s => !onBreakIds.includes(s.employee_id))
  - unionRoles = new Set(activeWorkers.flatMap(s => s.employee!.available_roles))
  - isValid = ALL_ROLES.every(r => unionRoles.has(r))
  - score = onBreakIds.length - 1  // worker 자신 제외, 다른 휴게 중인 수

Step 4: Greedy 선택 (평탄화)
  if validSlots.length > 0:
      best = validSlots.reduce((a, b) => a.score <= b.score ? a : b)  // 최소 score, 동점 시 앞 시간
      allocations.set(worker.employee_id, { start: best.startMin, end: best.endMin })
  else:
      → Step 5 진입

Step 5: Fail-safe
  - allSlots = 전체 슬롯 재계산 (조건 무시, 동시 휴게 인원만 기준)
  - forceSlot = allSlots.reduce((a, b) => a.score <= b.score ? a : b)
  - allocations.set(worker.employee_id, { start: forceSlot.startMin, end: forceSlot.endMin })
  - missing = ALL_ROLES.filter(r => !unionRolesAtForceSlot.has(r))
  - warnings.push({ time: `${toTimeStr(forceSlot.startMin)}-${toTimeStr(forceSlot.endMin)}`, missing })

Return:
  - allocations을 Record<string, { start: string; end: string }>으로 변환 (toTimeStr 적용)
  - { allocations, warnings }
```

### 시간 유틸리티 (같은 파일 내 구현)
```typescript
function toMinutes(time: string): number  // '13:30' → 810
function toTimeStr(minutes: number): string  // 810 → '13:30'
function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean
// overlaps = aStart < bEnd && bStart < aEnd
```

---

## 5. 개발 단계 및 체크포인트

---

### Phase 0 — 환경 설정 (v0.0)

**목표:** 패키지 설치, 디자인 토큰, 타입/스토어/Supabase 기반 코드 작성 완료. 타입 에러 0개, 개발 서버 정상 실행.

#### 0-1. 패키지 설치
```bash
npm install zustand @supabase/supabase-js html2canvas
```

#### 0-2. `.env.local` 생성
경로: `c:\Users\palop\Desktop\Developments\break-timer\.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=여기에_URL_입력
NEXT_PUBLIC_SUPABASE_ANON_KEY=여기에_KEY_입력
```
키가 없으면 빈 문자열로 두고 목업 모드로 진행.

#### 0-3. `docs/schema.sql` 생성
PRD §5의 SQL 스크립트 저장 (Supabase SQL Editor 실행용):
```sql
-- 1. Employees Table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    available_roles TEXT[] NOT NULL,
    available_days INTEGER[] NOT NULL,
    default_shift_types TEXT[] NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Work Schedules Table
CREATE TABLE work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    work_date DATE NOT NULL,
    shift_type TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start_time TIME,
    break_end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 0-4. `app/globals.css` 업데이트
```css
@import "tailwindcss";

:root {
  --color-primary: #4A3B32;
  --color-neutral-dark: #2B2B2B;
  --color-bg: #F9F8F6;
  --color-surface: #FFFFFF;
  --color-border: #E8E5E1;
}

@theme inline {
  --color-primary: var(--color-primary);
  --color-neutral-dark: var(--color-neutral-dark);
  --color-background: var(--color-bg);
  --color-surface: var(--color-surface);
  --color-border: var(--color-border);
}

body {
  background: var(--color-bg);
  color: var(--color-neutral-dark);
  font-family: 'Noto Sans KR', sans-serif;
}
/* 절대 금지: box-shadow, 그라데이션(gradient), 3D 효과 */
```

#### 0-5. `types/index.ts` 생성
섹션 3의 코드를 그대로 작성.

#### 0-6. `lib/supabase.ts` 생성
```typescript
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !key) {
  console.warn('[Supabase] 환경변수 없음 — 목업 모드로 동작합니다.');
}

export const supabase = (url && key) ? createClient(url, key) : null;
```

#### 0-7. Zustand 스토어 3개 생성

**`store/useAuthStore.ts`** — Supabase Auth 세션 관리
- 상태: `session`, `isLoading`
- 액션: `signIn(email, password)`, `signOut`, `checkSession`
- supabase null이면 개발용 mock 세션 자동 주입

**`store/useEmployeeStore.ts`** — 직원 CRUD
- 상태: `employees: Employee[]`
- 액션: `fetchEmployees()`, `addEmployee(data)`, `updateEmployee(id, data)`, `softDeleteEmployee(id)`
- **절대 금지:** DELETE 쿼리 사용 금지 — `is_deleted = true`만 허용

**`store/useScheduleStore.ts`** — 스케줄 관리
- 상태: `selectedWeekStart: string`, `schedules: WorkSchedule[]`, `breakWarnings: BreakWarning[]`
- 액션: `setWeekStart(date)`, `fetchSchedules(weekStart)`, `upsertSchedule(data)`, `deleteSchedule(id)`, `runAutoBreak(date, breakStartRef)`, `setManualBreak(id, start, end)`

#### 0-8. `app/layout.tsx` 업데이트
- `lang="ko"` 설정
- title: `'근무 스케줄러 | 레스토랑 관리'`
- Noto Sans KR Google Fonts `<link>` 추가
- Next.js 16 App Router의 정확한 타입은 `node_modules/next/dist/docs/`에서 확인

#### [CHECKPOINT 0] — Phase 0 완료 자체 검증
> ⚠️ 뇌피셜 금지: 반드시 터미널에서 명령 실행 후 결과 확인.
- [ ] `npm install` 완료 — `node_modules/zustand`, `node_modules/@supabase/supabase-js` 존재
- [ ] `npx tsc --noEmit` → 에러 0개
- [ ] `npm run dev` → 포트 3000 정상 접속
- [ ] Universal Code Review 6단계 합격

#### [USER REVIEW 0]
자체 검증 결과 보고. 사용자 확인 요청:
1. `.env.local` Supabase 키 삽입 여부
2. 브라우저 화면 정상 확인
합격 승인 시: `docs/Phase0_Summary.md` 작성 → 상태 표 `✅ 완료` → Git 커밋 → **대화 종료**

---

### Phase 1 — 직원 관리 페이지 (v0.1)

**목표:** `/employees`에서 직원 등록/목록/소프트삭제 완전 작동.

#### 1-1. `components/layout/Header.tsx`
- 앱 타이틀: `레스토랑 스케줄러`
- 탭 네비게이션: `직원 관리 (/employees)` / `주간 스케줄러 (/scheduler)`
- 활성 탭: `color: var(--color-primary); border-bottom: 2px solid var(--color-primary)`
- 로그아웃 버튼 우측 배치
- box-shadow 금지

#### 1-2. `components/employees/EmployeeForm.tsx`
폼 필드:
- 이름 (text input)
- 가능 직무 (cashier/pass/ade 토글 버튼, 다중 선택)
- 근무 가능 요일 (월~일, 0~6 토글 버튼)
- 기본 근무 타입 (open/close/oma/part 토글 버튼, 다중 선택)

토글 버튼 스타일:
- 선택: `background: var(--color-primary); color: #FFFFFF`
- 미선택: `border: 1px solid var(--color-border); background: var(--color-surface)`

저장 버튼 → `addEmployee()` 또는 `updateEmployee()` 호출

#### 1-3. `components/employees/EmployeeTable.tsx`
컬럼: 이름 / 직무(텍스트 뱃지) / 근무 가능 요일 / 기본 근무 타입 / 액션(수정/삭제)
- `is_deleted = false`인 직원만 표시
- 헤더: `border-bottom: 1px solid var(--color-border)`
- 행 구분: `border-bottom: 1px solid var(--color-border)`
- 삭제: 확인 모달 → `softDeleteEmployee()` (DELETE 쿼리 절대 금지)

#### 1-4. `app/employees/page.tsx`
```tsx
'use client'
// useEffect → fetchEmployees()
// 레이아웃: Header + 상단 타이틀/추가버튼 + EmployeeTable + 우측 슬라이드 EmployeeForm
```

#### [CHECKPOINT 1]
> ⚠️ 뇌피셜 금지: 터미널 검증 필수.
- [ ] `npx tsc --noEmit` → 에러 0개
- [ ] `/employees` 접속 → 직원 등록 → 목록에 표시
- [ ] 소프트 삭제 → 목록에서 사라짐 (DB에는 `is_deleted=true` 존재)
- [ ] 디자인 규칙 위반 없음 (box-shadow/그라데이션/이모지 없음)
- [ ] Universal Code Review 6단계 합격

#### [USER REVIEW 1]
합격 승인 시: `docs/Phase1_Summary.md` → 상태 표 업데이트 → Git 커밋 → **대화 종료**

---

### Phase 2 — 주간 스케줄러 UI + 근무 등록 (v0.2)

**목표:** `/scheduler` 7일 카드 그리드 표시, 직원 추가, 근무 타입 선택 시 자동 시간 입력 동작.

#### 2-1. 주 탐색 유틸 (`lib/weekUtils.ts`)
```typescript
// getWeekDates(weekStart: string): string[]  → 월~일 7개 날짜 'YYYY-MM-DD' 배열
// getWeekStartFromDate(date: Date): string   → 주어진 날짜의 월요일 날짜 반환
// formatDayLabel(date: string): string       → '09/15 (월)' 형태
```

#### 2-2. `components/scheduler/WeekGrid.tsx`
- `forwardRef` 또는 props로 `captureRef: RefObject<HTMLDivElement>` 수신 (html2canvas 캡처 대상)
- `display: grid; grid-template-columns: repeat(7, 1fr)`
- 각 날짜별 `DayCard` 렌더링

#### 2-3. `components/scheduler/DayCard.tsx`
- props: `date: string`, `schedules: WorkSchedule[]`, `employees: Employee[]`
- 상단: 요일+날짜 (`border-bottom: 1px solid var(--color-border)`)
- `EmployeeRow` 목록
- "+ 직원 추가" 버튼 → 당일 미배정 직원 드롭다운

#### 2-4. `components/scheduler/EmployeeRow.tsx`
- 이름, shift_type `<select>` → `SHIFT_DEFAULTS`로 시간 자동 채움
- `part` 선택 시 start_time/end_time 직접 입력 가능
- 삭제(×) 버튼 → `deleteSchedule(id)`
- 휴게 배지: `break_start_time ~ break_end_time` 텍스트 (배정 후)

#### 2-5. `app/scheduler/page.tsx`
```tsx
'use client'
// 상단: Header + 주 탐색 (< 이전주 | YYYY.MM.DD~DD | 다음주 >) + 다운로드 버튼
// WeekGrid (captureRef 전달)
// BreakControlPanel (하단 또는 우측)
```

#### [CHECKPOINT 2]
- [ ] `npx tsc --noEmit` → 에러 0개
- [ ] `/scheduler` → 7개 카드 표시
- [ ] 직원 추가 → shift_type 선택 → 시간 자동 입력
- [ ] 이전/다음 주 탐색 정상
- [ ] Universal Code Review 6단계 합격

#### [USER REVIEW 2]
합격 승인 시: `docs/Phase2_Summary.md` → Git 커밋 → **대화 종료**

---

### Phase 3 — 휴게시간 자동 배치 알고리즘 (v0.3)

**목표:** "자동 배치" 실행 시 알고리즘 동작, 휴게 시간 표시, 경고 배너 출력.

#### 3-1. `lib/autoBreakAlgo.ts` 구현
섹션 4의 의사코드를 TypeScript 순수 함수로 구현.
외부 의존성(Supabase 호출) 없음. 시간 유틸 포함.
단위 테스트 케이스를 파일 하단 주석으로 명시.

#### 3-2. `components/scheduler/BreakControlPanel.tsx`
- 날짜별 "기준 시작 시간" time input (기본: `13:30`)
- "자동 배치 실행" 버튼 → `useScheduleStore.runAutoBreak(date, breakStartRef)`

#### 3-3. `components/scheduler/BreakWarningBanner.tsx`
- `warnings: BreakWarning[]` prop
- 경고 있을 때만 표시: `border: 1px solid #C0392B; background: #FDF2F1; padding: 12px`
- 경고 메시지: `{time}에 {missing.join(', ')} 포지션 커버 불가` (이모지 금지)

#### 3-4. `useScheduleStore.runAutoBreak` 구현
1. 해당 날짜 schedules (employee 조인) 조회
2. `autoAssignBreaks()` 호출
3. 결과 allocations → `upsertSchedule()` 일괄 처리 (N+1 주의: Promise.all 사용)
4. `breakWarnings` 상태 업데이트

#### [CHECKPOINT 3]
> ⚠️ 뇌피셜 금지: Node.js 스크립트로 알고리즘 단위 검증.
- [ ] 정상 케이스 (3개 역할 모두 커버): warnings 없음, allocations 정상
- [ ] Fail-safe 케이스 (ade 없음): warnings에 `missing: ['ade']` 포함
- [ ] 동점 케이스: 앞선 시간 슬롯 선택
- [ ] UI 자동 배치 후 EmployeeRow 휴게 배지 표시
- [ ] Fail-safe 시 BreakWarningBanner 표시
- [ ] Universal Code Review 6단계 합격

#### [USER REVIEW 3]
합격 승인 시: `docs/Phase3_Summary.md` → Git 커밋 → **대화 종료**

---

### Phase 4 — 수동 휴게 조작 + 이미지 다운로드 (v0.4)

**목표:** 수동 휴게 수정 가능, 제약 실패 시 저장 차단, PNG 이미지 다운로드 동작.

#### 4-1. `EmployeeRow` 수동 휴게 수정 UI
- 휴게 배지 클릭 → 인라인 시간 입력 폼 (start/end time)
- 저장 → `useScheduleStore.setManualBreak(id, start, end)` 호출

#### 4-2. `useScheduleStore.setManualBreak` 검증 로직
```typescript
// 1. 해당 날짜 전체 schedules 로드
// 2. 해당 직원의 새 휴게 시간으로 임시 allocations 구성
// 3. autoBreakAlgo의 Step 3 검증 로직 실행 (함수 분리 추출)
// 4. isValid=false → Error throw (저장 차단) + 경고 메시지
// 5. isValid=true → DB upsert
```

#### 4-3. 이미지 다운로드
```typescript
// scheduler/page.tsx 또는 Header.tsx 다운로드 버튼
import html2canvas from 'html2canvas';

async function downloadScheduleImage(captureRef: RefObject<HTMLDivElement>, weekStart: string) {
  if (!captureRef.current) return;
  const canvas = await html2canvas(captureRef.current, {
    backgroundColor: '#F9F8F6',
    scale: 2,
  });
  const link = document.createElement('a');
  link.download = `schedule_${weekStart}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

#### [CHECKPOINT 4]
- [ ] 수동 휴게 수정 → 유효: 저장 성공 + UI 업데이트
- [ ] 수동 휴게 수정 → 무효(직무 공백): 저장 차단 + 경고 메시지
- [ ] 이미지 다운로드 → WeekGrid 영역 PNG 저장
- [ ] Universal Code Review 6단계 합격

#### [USER REVIEW 4]
합격 승인 시: `docs/Phase4_Summary.md` → Git 커밋 → **대화 종료**

---

### Phase 5 — 인증 + 배포 준비 + 최종 QA (v1.0)

**목표:** 로그인 페이지, 라우트 보호, 빌드 성공, 최종 QA 완료.

#### 5-1. `app/login/page.tsx`
- 이메일/비밀번호 폼
- `useAuthStore.signIn()` → 성공 시 `/scheduler` 리다이렉트
- 실패 시 에러 메시지 (`border: 1px solid #C0392B` 인라인 텍스트)

#### 5-2. `middleware.ts` (루트) — 라우트 보호
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Supabase 세션 쿠키 확인
  // 세션 없으면 /login 리다이렉트
  // /login, /_next, /api, /favicon 경로는 통과
}

export const config = {
  matcher: ['/((?!_next|api|favicon\\.ico).*)'],
};
```
> **주의:** Next.js 16의 middleware API는 `node_modules/next/dist/docs/`에서 확인.

#### 5-3. `app/page.tsx` 업데이트
- 세션 확인 후 `/scheduler` 리다이렉트

#### 5-4. 최종 QA
- 전체 플로우: 로그인 → 직원 등록 → 스케줄 등록 → 자동 배치 → 경고 확인 → 다운로드
- `npm run build` 성공

#### [CHECKPOINT 5]
- [ ] `npm run build` → 에러 0개
- [ ] 비로그인 → `/login` 리다이렉트
- [ ] 로그인 성공 → `/scheduler` 이동
- [ ] 로그아웃 → `/login` 이동
- [ ] PRD §2 디자인 규칙 최종 확인 (전체 페이지)
- [ ] Universal Code Review 6단계 합격

#### [USER REVIEW 5]
최종 QA 보고. 합격 승인 시: `docs/Phase5_Summary.md` → `git tag v1.0.0` → Git 커밋.

---

## 6. 공통 에러 처리 가이드

| 상황 | 조치 |
|---|---|
| Supabase 키 없음 | `lib/supabase.ts`에서 `null` 반환, 스토어에서 로컬 상태 CRUD 사용 |
| `uuid_generate_v4()` 함수 없음 | `gen_random_uuid()`로 대체 (schema.sql에 이미 반영) |
| Next.js 16 타입 오류 | `node_modules/next/dist/docs/`에서 API 확인 후 수정 |
| `LayoutProps` 타입 | App Router layout 타입을 Next.js 16 docs에서 확인 |
| html2canvas 캡처 빈 화면 | `captureRef.current` null 체크, `await` 처리 확인, SSR 환경 여부 확인 |
| 알고리즘 무한 루프 | `slotStart > worker.end_time`이면 루프 탈출 조건 적용 |
| N+1 쿼리 (schedules + employee) | `supabase.from('work_schedules').select('*, employee:employees(*)')` 조인 쿼리 |
| Tailwind v4 클래스 미적용 | `@theme inline {}` 내 CSS 변수 사용. `tailwind.config.js` 불필요 |
| Supabase RLS 오류 | RLS 비활성화 후 개발, 배포 전 RLS 정책 추가 |

---

## 7. 최종 검증 체크리스트

- [ ] 모든 Phase `✅ 완료` 상태
- [ ] `npm run build` 에러 0개
- [ ] `npx tsc --noEmit` 에러 0개
- [ ] PRD §2 디자인 규칙 위반 없음 (box-shadow/그라데이션/이모지/3D 없음)
- [ ] 물리적 DELETE 쿼리가 employees 대상으로 코드베이스에 없음
- [ ] Supabase RLS 활성화 확인
- [ ] 이미지 다운로드 PNG 품질 확인 (scale: 2)
- [ ] 경고 배너 정상 표시/숨김
- [ ] 수동 휴게 제약 검증 정상 동작
