import { describe, expect, it } from 'vitest';
import { isBreakOutsideWorkHours } from './scheduleValidation';

const workHours = {
  start_time: '10:30',
  end_time: '20:00',
};

describe('isBreakOutsideWorkHours', () => {
  it('does not warn when no break is assigned', () => {
    expect(isBreakOutsideWorkHours({
      ...workHours,
      break_start_time: null,
      break_end_time: null,
    })).toBe(false);
  });

  it('accepts a break whose start and end are both within work hours', () => {
    expect(isBreakOutsideWorkHours({
      ...workHours,
      break_start_time: '13:30',
      break_end_time: '15:00',
    })).toBe(false);
  });

  it('accepts a break on the exact work-hour boundaries', () => {
    expect(isBreakOutsideWorkHours({
      ...workHours,
      break_start_time: '10:30:00',
      break_end_time: '20:00:00',
    })).toBe(false);
  });

  it('warns when the break starts before work', () => {
    expect(isBreakOutsideWorkHours({
      ...workHours,
      break_start_time: '10:00',
      break_end_time: '11:30',
    })).toBe(true);
  });

  it('warns when the break ends after work', () => {
    expect(isBreakOutsideWorkHours({
      ...workHours,
      break_start_time: '19:00',
      break_end_time: '20:30',
    })).toBe(true);
  });

  it('warns when only one break boundary exists', () => {
    expect(isBreakOutsideWorkHours({
      ...workHours,
      break_start_time: '13:30',
      break_end_time: null,
    })).toBe(true);
  });
});
