# [PRD] 레스토랑 직원 근무 및 휴게시간 관리 시스템

## 1. 프로젝트 개요 및 기술 스택

본 시스템은 레스토랑 관리자용 '근무/휴게시간 자동 스케줄링' 웹 애플리케이션입니다. 모든 스케줄 데이터는 월말 정산을 위해 날짜 기반으로 영구 누적 저장됩니다.

- **프론트엔드:** Next.js (App Router), TypeScript, Tailwind CSS
- **상태 관리:** Zustand (`useAuthStore`, `useEmployeeStore`, `useScheduleStore` 분리)
- **백엔드 & DB:** Supabase (PostgreSQL), Supabase Auth (단일 관리자 단순 로그인)
- **유틸리티:** html2canvas (근무표 이미지 다운로드)

## 2. 디자인 시스템 및 UI 제약 규칙 (Strict Rules)

- **컬러 팔레트 (Max 3 Colors):**
  - `Primary`: `#4A3B32` (활성 탭, 주요 액션 버튼, 헤더)
  - `Neutral Dark`: `#2B2B2B` (기본 텍스트, 아이콘, 테이블 데이터)
  - `Neutral Light`: `#F9F8F6` (전체 앱 배경), `#FFFFFF` (카드 표면)
- **시각적 금지 사항:** 이모지, `box-shadow`, 그라데이션, 3D 입체감을 엄격히 금지합니다.
- **레이아웃 원칙 (과도한 박스화 금지):** 연관된 데이터나 같은 카테고리는 사방을 둘러싼 테두리 대신, 충분한 여백(Whitespace)과 최소한의 1px 실선(`border: 1px solid #E8E5E1`)만을 사용하여 시각적 계층을 깔끔하게 분리합니다.

## 3. 핵심 기능 요구사항

### 3.1 직원 정보 관리 (Employee Management)

- 새로운 직원 등록 시 다음 항목을 입력합니다.
  - 이름
  - 가능 직무 (다중 선택): `cashier`, `pass`, `ade`
  - 근무 가능 요일 (0~6)
  - 기본 근무 타입 (다중 선택): `open`, `close`, `oma`, `part`
- 물리적 삭제(`DELETE`)를 금지하며, 퇴사 시 `is_deleted = true` 플래그를 통한 소프트 삭제만 처리합니다.

### 3.2 주간 스케줄러 (Weekly Scheduler)

- 화면은 7개의 요일별 블록(Card Grid)으로 구성됩니다.
- **근무 자동 완성:** 특정 요일 블록에 직원을 추가하고 근무 타입을 선택하면, 기본 출퇴근 시간이 자동 채워집니다.
  - `open`: 10:30 ~ 20:00
  - `close`: 12:00 ~ 21:30
  - `oma`: 10:30 ~ 21:30
  - `part`: 시간 직접 입력
- **이미지 캡처:** 우측 상단의 다운로드 버튼 클릭 시, 7개 요일 블록 영역만 깔끔한 배경과 함께 렌더링 되어 기기에 이미지 파일로 저장됩니다.
- 이 화면에서 스케줄을 확정(저장)하면 `work_schedules` 테이블에 개별 기록으로 저장되며, 직원 원본 정보는 건드리지 않습니다.

## 4. 휴게시간 자동 배치 알고리즘 (핵심 로직)

AI 에이전트는 `lib/autoBreakAlgo.ts`에 다음 로직을 순수 함수로 구현해야 합니다. 인위적인 최대 동시 휴게 인원 제한(Hard Cap)은 없습니다.

- **Input:** 당일 근무자 배열(`work_schedules`), 휴게 기준 시작 시간 (예: `13:30`)
- **Step 1. [필요 블록 및 큐 정렬]:** 1블록을 30분으로 정의합니다. 직원별 휴게 필요 블록(oma/open/close = 연속 3블록(90분), part = 1블록(30분))을 계산 후, 처리 큐를 `[oma > open > part > close]` 순서로 정렬합니다.
- **Step 2. [Sliding Window 순회]:** 큐에서 직원을 1명씩 꺼내어, '휴게 기준 시작 시간'부터 30분 단위로 밀어가며 해당 직원의 '연속된 필요 블록'만큼 가배치 시뮬레이션을 돌립니다. 종료 시간 제한은 두지 않습니다.
- **Step 3. [Constraint 제약 검증]:** 가배치된 시간대에 휴식 중인 인원을 제외하고, **'현재 근무 중인 인원'**의 `available_roles` 배열을 Set으로 합집합(Union) 처리합니다. 합집합 내에 `['cashier', 'pass', 'ade']`가 모두 존재해야만 해당 슬롯을 '합격(Valid)'으로 판정합니다.
- **Step 4. [Greedy 선택 (평탄화)]:** 합격 판정을 받은 시간대 슬롯들 중, **'해당 시간에 이미 휴게가 배정된 다른 직원의 수'가 가장 적은 슬롯**을 최종 선택하여 동시 휴게 인원을 평탄화합니다. (합산 값이 같을 경우 앞선 시간 우선)
- **Step 5. [Fail-safe 및 경고]:** 직무 조건(Step 3)을 만족하는 슬롯이 단 하나도 없을 경우, 조건을 무시하고 동시 휴게 인원이 가장 적은 곳에 강제 배정합니다. 이후 누락된 직무 정보를 `warnings: [{ time: "15:00-15:30", missing: ["ade"] }]` 형태로 수집하여 반환하며, 프론트엔드는 이를 상단 경고창으로 띄웁니다.
- **수동 조작 제어:** 관리자가 UI에서 휴식을 수동으로 이동할 때도 Step 3의 로직을 거치며, 실패 시 저장을 막고 경고를 띄웁니다.

## 5. 데이터베이스 스키마 (Supabase PostgreSQL)

```sql
-- 1. Employees Table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    available_roles TEXT[] NOT NULL,
    available_days INTEGER[] NOT NULL,
    default_shift_types TEXT[] NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Work Schedules Table
CREATE TABLE work_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
