import type { Role, WorkSchedule } from '@/types';
import { ALL_ROLES } from '@/lib/constants';
import { getBreakDurationMinutes, toMinutes, toTimeStr } from '@/lib/autoBreakAlgo';
import { isBreakOutsideWorkHours } from '@/lib/scheduleValidation';

export function getBreakIssues(schedule: WorkSchedule): string[] {
  const requiredMinutes = getBreakDurationMinutes(schedule);
  const start = schedule.break_start_time;
  const end = schedule.break_end_time;
  if (!start && !end) return requiredMinutes > 0 ? ['휴게 미배치'] : [];
  if (!start || !end) return ['휴게 시작·종료 시간을 모두 입력하세요.'];
  const duration = toMinutes(end) - toMinutes(start);
  if (!Number.isFinite(duration) || duration <= 0) return ['휴게 종료는 시작보다 늦어야 합니다.'];
  const issues: string[] = [];
  if (isBreakOutsideWorkHours(schedule)) issues.push('휴게가 근무시간을 벗어납니다.');
  if (duration < requiredMinutes) issues.push(`휴게시간 부족 · 기준 ${requiredMinutes}분 / 배치 ${duration}분`);
  return issues;
}

export function getSlotBreakUnavailableReason(schedule: WorkSchedule, startMin: number): string | null {
  const duration = getBreakDurationMinutes(schedule);
  if (!Number.isFinite(duration) || duration <= 0) return '휴게 대상이 아닙니다.';
  if (startMin < toMinutes(schedule.start_time)) return '출근 전에는 배치할 수 없습니다.';
  if (startMin + duration > toMinutes(schedule.end_time)) return '퇴근 전까지 휴게시간을 확보할 수 없습니다.';
  return null;
}

export interface BreakCoverageWarning {
  timeStr: string;
  startMin: number;
  endMin: number;
  missingRoles: Role[];
}

export interface BreakTimeSlot {
  timeStr: string;
  startMin: number;
  endMin: number;
  working: WorkSchedule[];
  onBreak: WorkSchedule[];
  warnings: BreakCoverageWarning[];
}

/** 화면은 30분 슬롯, 공백 검사는 각 슬롯 내 실제 출퇴근·휴게 경계 기준. */
export function getBreakTimeTable(schedules: WorkSchedule[], breakStartRef?: string): BreakTimeSlot[] {
  const validSchedules = schedules.filter((s) => {
    const start = toMinutes(s.start_time);
    const end = toMinutes(s.end_time);
    return Number.isFinite(start) && Number.isFinite(end) && start >= 0 && end <= 1440 && end > start;
  });
  if (validSchedules.length === 0) return [];
  const requestedStart = breakStartRef ? toMinutes(breakStartRef) : NaN;
  const start = Number.isFinite(requestedStart) && requestedStart >= 0 && requestedStart < 1440
    ? Math.floor(requestedStart / 30) * 30
    : Math.floor(Math.min(...validSchedules.map((s) => toMinutes(s.start_time))) / 30) * 30;
  const end = Math.ceil(Math.max(...validSchedules.map((s) => toMinutes(s.end_time))) / 30) * 30;
  const rows: BreakTimeSlot[] = [];
  for (let t = start; t < end; t += 30) {
    const slotEnd = t + 30;
    const boundaries = new Set<number>([t, slotEnd]);
    for (const s of validSchedules) {
      for (const time of [s.start_time, s.end_time, s.break_start_time, s.break_end_time]) {
        if (!time) continue;
        const minute = toMinutes(time);
        if (minute > t && minute < slotEnd) boundaries.add(minute);
      }
    }
    const times = [...boundaries].sort((a, b) => a - b);
    const workingIds = new Set<string>();
    const breakIds = new Set<string>();
    const warnings: BreakCoverageWarning[] = [];
    times.slice(0, -1).forEach((minute, i) => {
      const working: WorkSchedule[] = [];
      let hasBreak = false;
      for (const s of validSchedules) {
        if (minute < toMinutes(s.start_time) || minute >= toMinutes(s.end_time)) continue;
        if (s.break_start_time && s.break_end_time && minute >= toMinutes(s.break_start_time) && minute < toMinutes(s.break_end_time)) {
          breakIds.add(s.id);
          hasBreak = true;
        } else {
          workingIds.add(s.id);
          working.push(s);
        }
      }
      if (!hasBreak) return;
      const roles = new Set(working.flatMap((s) => s.employee?.available_roles ?? []));
      const missingRoles = ALL_ROLES.filter((r) => !roles.has(r));
      if (missingRoles.length) warnings.push({
        timeStr: `${toTimeStr(minute)} ~ ${toTimeStr(times[i + 1])}`,
        startMin: minute, endMin: times[i + 1], missingRoles,
      });
    });
    rows.push({ timeStr: `${toTimeStr(t)} ~ ${toTimeStr(slotEnd)}`, startMin: t, endMin: slotEnd,
      working: validSchedules.filter((s) => workingIds.has(s.id)),
      onBreak: validSchedules.filter((s) => breakIds.has(s.id)), warnings });
  }
  const requiredSchedules = schedules.filter((s) => getBreakDurationMinutes(s) > 0);
  const allAssigned = requiredSchedules.length > 0 && requiredSchedules.every((s) =>
    s.break_start_time && s.break_end_time && getBreakIssues(s).length === 0);
  if (allAssigned) {
    while (rows.length > 0 && rows.at(-1)!.onBreak.length === 0) rows.pop();
  }
  return rows;
}
