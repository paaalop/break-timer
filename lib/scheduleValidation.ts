import type { WorkSchedule } from '@/types';

type ScheduleTimes = Pick<
  WorkSchedule,
  'start_time' | 'end_time' | 'break_start_time' | 'break_end_time'
>;

function toMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

export function isBreakOutsideWorkHours(schedule: ScheduleTimes): boolean {
  const { start_time, end_time, break_start_time, break_end_time } = schedule;

  if (!break_start_time && !break_end_time) return false;
  if (!break_start_time || !break_end_time) return true;

  const workStart = toMinutes(start_time);
  const workEnd = toMinutes(end_time);
  const breakStart = toMinutes(break_start_time);
  const breakEnd = toMinutes(break_end_time);

  if (workStart === null || workEnd === null || breakStart === null || breakEnd === null) {
    return true;
  }

  return breakStart < workStart || breakEnd > workEnd;
}
