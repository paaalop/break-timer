/**
 * autoBreakAlgo.ts — 5단계 Greedy Sliding Window 휴게시간 자동 배치 알고리즘
 * Phase 3에서 완전 구현. Phase 0~2에서는 스텁으로 사용.
 */

import type { WorkSchedule, AlgoResult, BreakWarning, OptimizationPolicy } from '@/types';
import { ALL_ROLES, BREAK_BLOCK_MINUTES, BREAK_BLOCKS } from '@/types';

// ─── 시간 유틸리티 ───────────────────────────────────────────────────────────

/** 'HH:MM' → 분(number) */
export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 분(number) → 'HH:MM' */
export function toTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 두 구간이 겹치는지 확인 (열린 구간: [aStart, aEnd) ∩ [bStart, bEnd)) */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ─── Step 3 검증 로직 (외부 노출 — setManualBreak에서 재사용) ──────────────

export interface ValidateResult {
  isValid: boolean;
  missingRoles: string[];
}

/**
 * 특정 직원이 [start, end) 구간에 휴게 들어갈 때,
 * 남은 근무 직원의 직무 커버 여부를 검증한다.
 */
export function validateBreakSlot(
  target: WorkSchedule,
  start: string,
  end: string,
  otherSchedules: WorkSchedule[],
  minTotalStaff: number = 0
): ValidateResult {
  const slotStartMin = toMinutes(start);
  const slotEndMin = toMinutes(end);

  // 이미 휴게 중인 직원 IDs (target 포함)
  const onBreakIds = new Set<string>([target.employee_id]);
  for (const s of otherSchedules) {
    if (s.break_start_time && s.break_end_time) {
      if (overlaps(slotStartMin, slotEndMin, toMinutes(s.break_start_time), toMinutes(s.break_end_time))) {
        onBreakIds.add(s.employee_id);
      }
    }
  }

  // 남은 근무 직원들의 직무 합집합
  const activeWorkers = otherSchedules.filter((s) => !onBreakIds.has(s.employee_id));
  const unionRoles = new Set(activeWorkers.flatMap((s) => s.employee?.available_roles ?? []));

  const missingRoles: string[] = ALL_ROLES.filter((r) => !unionRoles.has(r));
  const isRoleValid = missingRoles.length === 0;
  const isStaffValid = activeWorkers.length >= minTotalStaff;

  if (!isStaffValid) {
    missingRoles.push(`최소 인원(${minTotalStaff}명) 미달`);
  }
  
  return { isValid: isRoleValid && isStaffValid, missingRoles };
}

// ─── 메인 알고리즘 ───────────────────────────────────────────────────────────

/**
 * 전진 배치(Front-Loading) 시뮬레이션 알고리즘
 * - 기준 시간(13:30)부터 30분 단위로 탐색하며 조건(역할 + 최소 인원)이 충족되는 가장 빠른 슬롯에 무조건 집어넣습니다.
 * - 동시 휴게가 가능하면 13:30~15:00에 최대한 많이 겹쳐 넣고, 다음 그룹은 15:00~16:30에 넣어 디너 피크 전 칼마감합니다.
 * 
 * @param schedules - employee 필드 포함 필수
 * @param breakStartRef - 기준 시작 시간 'HH:MM' (예: '13:30')
 * @param minTotalStaff - 최소 근무 인원 (기본 0)
 */
export function autoAssignBreaks(
  schedules: WorkSchedule[],
  breakStartRef: string,
  minTotalStaff: number = 0
): AlgoResult {
  if (schedules.length === 0) {
    return { allocations: {}, warnings: [] };
  }

  // 근무조(shift_type)별 총 인원 수
  const shiftTotalCounts = new Map<string, number>();
  for (const s of schedules) {
    shiftTotalCounts.set(s.shift_type, (shiftTotalCounts.get(s.shift_type) ?? 0) + 1);
  }

  // 75% 룰: 해당 근무조 인원 중 동시 휴게 가능한 최대 인원
  // (4명 -> 3명, 3명 -> 2명, 2명 -> 1명, 1명 -> 1명)
  function getMaxBreakAllowedForShift(shiftType: string): number {
    const total = shiftTotalCounts.get(shiftType) ?? 0;
    if (total <= 1) return 1;
    return Math.floor(total * 0.75);
  }

  // 우선순위: 오마 -> 오픈 -> 파트 -> 마감, 동일 shift_type 내에서는 매니저 직무 보유자 우선 배정
  const priorityOrder: Record<string, number> = { oma: 0, open: 1, part: 2, close: 3 };
  const queue = [...schedules].sort((a, b) => {
    const pA = priorityOrder[a.shift_type] ?? 99;
    const pB = priorityOrder[b.shift_type] ?? 99;
    if (pA !== pB) return pA - pB;
    const isManagerA = a.employee?.available_roles?.includes('manager') ? 0 : 1;
    const isManagerB = b.employee?.available_roles?.includes('manager') ? 0 : 1;
    return isManagerA - isManagerB;
  });

  const allocationsMin = new Map<string, { startMin: number; endMin: number }>();

  for (const worker of queue) {
    const workerStartMin = toMinutes(worker.start_time);
    const workerEndMin = toMinutes(worker.end_time);
    const workDurationMin = workerEndMin - workerStartMin;

    // 4시간(240분) 미만 근무자는 근로기준법상 휴게시간 제외
    if (workDurationMin < 240) {
      continue;
    }

    const isMinor = Boolean(worker.employee?.is_minor);
    let blocks = 3;

    if (isMinor) {
      // 미성년자: 총 근무시간에서 7시간(420분)을 뺀 시간 (최소 30분 보장)
      const calcMinorBreakMin = Math.max(30, workDurationMin - 420);
      blocks = Math.ceil(calcMinorBreakMin / BREAK_BLOCK_MINUTES);
    } else if (worker.shift_type === 'part') {
      // 파트타이머: 8시간(480분) 이상이면 1.5시간(3블록), 4시간 이상 8시간 미만이면 30분(1블록)
      blocks = workDurationMin >= 480 ? 3 : 1;
    } else {
      // 일반 근무
      blocks = (BREAK_BLOCKS as Record<string, number>)[worker.shift_type] ?? 3;
    }

    const durationMin = blocks * BREAK_BLOCK_MINUTES;
    // 탐색 시작: 기준 시간(breakStartRef)과 실제 출근 시간(workerStartMin) 중 늦은 시간부터
    let slotStartMin = Math.max(toMinutes(breakStartRef), workerStartMin);

    interface SlotCandidate {
      startMin: number;
      endMin: number;
      score: number;
    }

    const validSlots: SlotCandidate[] = [];

    // 근무 시간 내에서 30분 단위로 차례차례 들어갈 수 있는지 탐색
    while (slotStartMin + durationMin <= workerEndMin) {
      const slotEndMin = slotStartMin + durationMin;

      // 이 슬롯에 들어갔을 때 동시 휴게자 목록
      const onBreakIds = new Set<string>([worker.employee_id]);
      for (const [empId, { startMin: bStart, endMin: bEnd }] of allocationsMin) {
        if (overlaps(slotStartMin, slotEndMin, bStart, bEnd)) {
          onBreakIds.add(empId);
        }
      }

      // 각 30분 단위 블록마다 인원, 필수 직무(매니저, 캐셔, 패스), 75% 조 분할 룰 체크
      let isValid = true;
      for (let t = slotStartMin; t < slotEndMin; t += BREAK_BLOCK_MINUTES) {
        let countAtT = 0;
        const rolesAtT = new Set<string>();
        const breakCountByShift = new Map<string, number>();

        for (const s of schedules) {
          const sStart = toMinutes(s.start_time);
          const sEnd = toMinutes(s.end_time);
          if (t >= sStart && t < sEnd) {
            if (onBreakIds.has(s.employee_id)) {
              breakCountByShift.set(s.shift_type, (breakCountByShift.get(s.shift_type) ?? 0) + 1);
            } else {
              countAtT++;
              for (const r of s.employee?.available_roles ?? []) rolesAtT.add(r);
            }
          }
        }

        // 75% 룰 검사: 특정 근무조 인원의 75%를 초과하여 동시에 쉴 수 없음 (최소 1명 이상 근무 유지)
        for (const [sType, bCount] of breakCountByShift) {
          if (bCount > getMaxBreakAllowedForShift(sType)) {
            isValid = false;
            break;
          }
        }
        if (!isValid) break;

        const scheduledAtT = schedules.filter((s) => {
          const sStart = toMinutes(s.start_time);
          const sEnd = toMinutes(s.end_time);
          return t >= sStart && t < sEnd;
        }).length;
        const targetStaff = Math.min(minTotalStaff, scheduledAtT);

        if (countAtT < targetStaff) {
          isValid = false;
          break;
        }
        for (const r of ALL_ROLES) {
          if (!rolesAtT.has(r)) {
            isValid = false;
            break;
          }
        }
        if (!isValid) break;
      }

      if (isValid) {
        // 무조건 가장 빠른 앞시간 우선 배정
        validSlots.push({ startMin: slotStartMin, endMin: slotEndMin, score: slotStartMin });
      }

      slotStartMin += BREAK_BLOCK_MINUTES;
    }

    if (validSlots.length > 0) {
      // 조건 만족하는 가장 이른 슬롯 선택
      const best = validSlots.reduce((a, b) => (a.score <= b.score ? a : b));
      allocationsMin.set(worker.employee_id, { startMin: best.startMin, endMin: best.endMin });
    } else {
      // Fail-safe: 조건 100% 충족 불가 시, 동시 겹침을 최소화하되 무조건 가장 빠른 앞시간 선택
      let slotStartMinFs = Math.max(toMinutes(breakStartRef), workerStartMin);
      const allSlots: { startMin: number; endMin: number; score: number }[] = [];

      while (slotStartMinFs + durationMin <= workerEndMin) {
        const slotEndMinFs = slotStartMinFs + durationMin;
        let overlapCount = 0;
        for (const [, b] of allocationsMin) {
          if (overlaps(slotStartMinFs, slotEndMinFs, b.startMin, b.endMin)) {
            overlapCount++;
          }
        }
        // 동시 겹침 적은 곳 우선, 같으면 가장 앞시간!
        allSlots.push({
          startMin: slotStartMinFs,
          endMin: slotEndMinFs,
          score: overlapCount * 10000 + slotStartMinFs,
        });
        slotStartMinFs += BREAK_BLOCK_MINUTES;
      }

      if (allSlots.length === 0) {
        const forceStart = toMinutes(worker.start_time);
        allocationsMin.set(worker.employee_id, { startMin: forceStart, endMin: forceStart + durationMin });
      } else {
        const chosen = allSlots.reduce((a, b) => (a.score <= b.score ? a : b));
        allocationsMin.set(worker.employee_id, { startMin: chosen.startMin, endMin: chosen.endMin });
      }
    }
  }

  // 상세 경고 수집
  const baseStartMin = toMinutes(breakStartRef);
  const maxT = Math.max(...schedules.map((s) => toMinutes(s.end_time)));
  const warnings: BreakWarning[] = [];

  for (let t = baseStartMin; t < maxT; t += BREAK_BLOCK_MINUTES) {
    let activeStaff = 0;
    const activeRoles = new Set<string>();

    for (const s of schedules) {
      const sStart = toMinutes(s.start_time);
      const sEnd = toMinutes(s.end_time);
      if (t >= sStart && t < sEnd) {
        const b = allocationsMin.get(s.employee_id);
        if (b && t >= b.startMin && t < b.endMin) {
          // 휴게 중
        } else {
          activeStaff++;
          for (const r of s.employee?.available_roles ?? []) activeRoles.add(r);
        }
      }
    }

    const scheduledAtT = schedules.filter((s) => {
      const sStart = toMinutes(s.start_time);
      const sEnd = toMinutes(s.end_time);
      return t >= sStart && t < sEnd;
    }).length;
    const targetStaff = Math.min(minTotalStaff, scheduledAtT);

    const missing: string[] = ALL_ROLES.filter((r) => !activeRoles.has(r));
    if (activeStaff < targetStaff) {
      missing.push(`최소 인원(${minTotalStaff}명) 미달`);
    }
    if (missing.length > 0) {
      warnings.push({
        time: `${toTimeStr(t)}-${toTimeStr(t + BREAK_BLOCK_MINUTES)}`,
        missing,
      });
    }
  }

  const allocations: Record<string, { start: string; end: string }> = {};
  for (const [id, { startMin, endMin }] of allocationsMin) {
    allocations[id] = { start: toTimeStr(startMin), end: toTimeStr(endMin) };
  }

  return { allocations, warnings };
}

/*
 * ─── 단위 테스트 케이스 (주석) ───────────────────────────────────────────────
 *
 * [정상 케이스] 3명 (cashier, pass, ade) 각각 open shift
 *   - 기준 13:30, 순서대로 배정
 *   - 예상: 13:30/14:00/14:30 분산, warnings = []
 *
 * [Fail-safe 케이스] ade 역할 직원 없음
 *   - cashier + pass 2명 open shift
 *   - 예상: allocations 정상, warnings[0].missing = ['ade']
 *
 * [동점 케이스] score 같은 슬롯이 2개
 *   - 예상: 앞선 시간(startMin이 작은) 슬롯 선택
 *
 * [근무 시간 짧은 케이스] part shift, 근무 14:00-15:00
 *   - breakStartRef = 13:30
 *   - 예상: 14:00에 강제 배정 (슬롯 없음 → forceStart = 근무 시작)
 */
