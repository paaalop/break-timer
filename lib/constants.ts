import type { Role, DayOfWeek, ShiftType, PartShiftType } from '@/types';

export const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'manager', label: '매니저' },
  { value: 'cashier', label: '캐셔' },
  { value: 'pass', label: '패스' },
];

export const ROLE_LABELS: Record<string, string> = {
  manager: '매니저',
  cashier: '캐셔',
  pass: '패스',
};

export const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
  { value: 0, label: '일' },
];

export const DAY_LABELS: Record<number, string> = {
  0: '일', 1: '월', 2: '화', 3: '수', 4: '목', 5: '금', 6: '토',
};

export const SHIFT_OPTIONS: { value: ShiftType; label: string }[] = [
  { value: 'open', label: '오픈' },
  { value: 'close', label: '마감' },
  { value: 'oma', label: '오마' },
  { value: 'part', label: '파트' },
];

export const SHIFT_LABELS: Record<string, string> = {
  open: '오픈',
  close: '마감',
  oma: '오마',
  part: '파트',
  part_open: '오파',
  part_close: '마파',
};

export const PART_SHIFT_OPTIONS: { value: PartShiftType; label: string }[] = [
  { value: 'part_open', label: '오픈파트' },
  { value: 'part_close', label: '마감파트' },
  { value: 'part', label: '사용자 지정' },
];

export function isPartShift(shift: ShiftType): shift is PartShiftType {
  return shift === 'part' || shift === 'part_open' || shift === 'part_close';
}

export function isFixedPartShift(shift: ShiftType): boolean {
  return shift === 'part_open' || shift === 'part_close';
}

// 근무 타입별 텍스트 색상
export const SHIFT_TEXT_COLOR: Record<ShiftType, string> = {
  open: 'var(--color-warning)',
  close: 'var(--color-info)',
  oma: 'var(--color-danger)',
  part: 'var(--color-shift-part)',
  part_open: 'var(--color-shift-part)',
  part_close: 'var(--color-shift-part)',
};

// Shift 기본 시간 테이블 (part 포함)
export const SHIFT_DEFAULTS: Record<ShiftType, { start: string; end: string }> = {
  open:  { start: '10:30', end: '20:00' },
  close: { start: '12:00', end: '21:30' },
  oma:   { start: '10:30', end: '21:30' },
  part:  { start: '10:00', end: '15:00' },
  part_open: { start: '10:30', end: '14:00' },
  part_close: { start: '18:30', end: '21:30' },
};

export function getShiftTimes(next: ShiftType, current: ShiftType, times: { start: string; end: string }): { start: string; end: string } {
  if (next === current || (next === 'part' && isPartShift(current))) return times;
  return SHIFT_DEFAULTS[next];
}

export const ALL_ROLES: Role[] = ['manager', 'cashier', 'pass'];
export const BREAK_BLOCK_MINUTES = 30;
export const BREAK_BLOCKS: Record<Exclude<ShiftType, PartShiftType>, number> = {
  oma: 3, open: 3, close: 3,
};
