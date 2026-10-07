import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkSchedule } from '@/types';
import ManualBreakPage from './page';

const mocks = vi.hoisted(() => ({
  fetchDaySchedules: vi.fn(), fetchDayBreakSetting: vi.fn(), saveDayBreakSetting: vi.fn(), setManualBreak: vi.fn(), fetchEmployees: vi.fn(),
  refetch: null as null | (() => Promise<void>), storeError: null as string | null,
}));
vi.mock('@/store/useScheduleStore', () => ({ useScheduleStore: () => ({ ...mocks, error: mocks.storeError }) }));
vi.mock('@/store/useEmployeeStore', () => ({ useEmployeeStore: () => mocks }));
vi.mock('@/components/layout/Header', () => ({ default: () => null }));
vi.mock('@/hooks/useRefetchOnFocus', () => ({ useRefetchOnFocus: (callback: () => Promise<void>) => { mocks.refetch = callback; } }));

function schedule(date: string, name = '직원A'): WorkSchedule {
  return { id: `${date}-${name}`, employee_id: name, work_date: date, shift_type: 'open',
    start_time: '10:30', end_time: '20:00', break_start_time: null, break_end_time: null,
    created_at: '', updated_at: '', employee: { id: name, name, available_roles: ['manager'],
      available_days: [], default_shift_types: ['open'], is_deleted: false, created_at: '' } };
}
function schedules(date: string): WorkSchedule[] {
  return [schedule(date),
    { ...schedule(date, '직원B'), shift_type: 'part', end_time: '16:00' },
    { ...schedule(date, '단시간'), shift_type: 'part_open', end_time: '13:00' },
  ];
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function slot(time: string) {
  return within(screen.getByRole('region', { name: '시간대별 휴게 배치' })).getByRole('button', { name: `${time} 휴게 배치` });
}
function dialog() { return within(screen.getByRole('dialog')); }
function employee(name: string) { return dialog().getByRole('checkbox', { name: `${name} 휴게 선택` }); }
function confirm() { return dialog().getByRole('button', { name: '확인' }); }
function startTime() { return screen.getByRole('button', { name: '전체 휴게 시작시간' }); }
async function selectStartTime(user: ReturnType<typeof userEvent.setup>, time: string) {
  await user.click(startTime());
  const [hour, minute] = time.split(':');
  await user.click(within(dialog().getByLabelText('시')).getByRole('button', { name: hour }));
  await user.click(within(dialog().getByLabelText('분')).getByRole('button', { name: minute }));
  await user.click(confirm());
}

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  vi.clearAllMocks();
  mocks.refetch = null;
  mocks.storeError = null;
  mocks.fetchDaySchedules.mockImplementation(async (date: string) => schedules(date));
  mocks.fetchDayBreakSetting.mockImplementation(async (date: string) => ({ work_date: date, break_start_ref: '10:30', min_total_staff: 4 }));
  mocks.saveDayBreakSetting.mockResolvedValue(undefined);
  mocks.setManualBreak.mockResolvedValue(undefined);
});

describe('confirmed slot break selection', () => {
  it('resets assigned breaks for the selected day and keeps its start setting', async () => {
    mocks.fetchDaySchedules.mockImplementation(async (date: string) => [
      { ...schedule(date), break_start_time: '14:00', break_end_time: '15:30' },
      { ...schedule(date, '직원B'), break_start_time: '15:30', break_end_time: null },
      schedule(date, '미배치'),
    ]);
    mocks.fetchDayBreakSetting.mockResolvedValue({ break_start_ref: '14:00', min_total_staff: 4 });
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    await user.click(screen.getByRole('button', { name: '초기화' }));
    const date = mocks.fetchDaySchedules.mock.calls[0][0];
    expect(mocks.setManualBreak.mock.calls).toEqual([
      [`${date}-직원A`, null, null, true], [`${date}-직원B`, null, null, true],
    ]);
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('휴게자')).toHaveTextContent('—');
    expect(startTime()).toHaveTextContent('14:00');
    expect(mocks.saveDayBreakSetting).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '초기화' })).toBeDisabled();
    expect(slot('19:30 ~ 20:00')).toBeInTheDocument();
  });

  it('preserves failed reset assignments and retries only the remaining breaks', async () => {
    mocks.fetchDaySchedules.mockImplementation(async (date: string) => [
      { ...schedule(date), break_start_time: '14:00', break_end_time: '15:30' },
      { ...schedule(date, '직원B'), break_start_time: '14:00', break_end_time: '15:30' },
    ]);
    mocks.setManualBreak.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('초기화 실패'));
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    await user.click(screen.getByRole('button', { name: '초기화' }));
    expect(screen.getByRole('alert')).toHaveTextContent('1명 초기화 완료. 초기화 실패');
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('휴게자')).toHaveTextContent(/^직원B$/);
    await user.click(screen.getByRole('button', { name: '초기화' }));
    expect(mocks.setManualBreak).toHaveBeenCalledTimes(3);
    expect(mocks.setManualBreak).toHaveBeenLastCalledWith(expect.stringContaining('직원B'), null, null, true);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('locks controls during reset and ignores a refresh started before reset', async () => {
    const assigned = (date: string) => [{ ...schedule(date), break_start_time: '14:00', break_end_time: '15:30' }];
    mocks.fetchDaySchedules.mockImplementation(async (date: string) => assigned(date));
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    const date = mocks.fetchDaySchedules.mock.calls[0][0];
    const refresh = deferred<WorkSchedule[]>();
    const save = deferred<void>();
    mocks.fetchDaySchedules.mockReturnValueOnce(refresh.promise);
    mocks.setManualBreak.mockReturnValueOnce(save.promise);
    act(() => { void mocks.refetch!(); });
    await user.click(screen.getByRole('button', { name: '초기화' }));
    expect(screen.getByRole('button', { name: '초기화 중…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다음 날' })).toBeDisabled();
    expect(startTime()).toBeDisabled();
    expect(slot('14:00 ~ 14:30')).toBeDisabled();
    fireEvent.change(screen.getByLabelText('날짜 선택'), { target: { value: '2030-01-02' } });
    expect(screen.getByLabelText('날짜 선택')).toHaveValue(date);
    await act(async () => { save.resolve(); });
    await act(async () => { refresh.resolve(assigned(date)); });
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('휴게자')).toHaveTextContent('—');
    expect(mocks.setManualBreak).toHaveBeenCalledTimes(1);
  });

  it('offers a 30-minute start selector and saves it without changing any assignments', async () => {
    mocks.fetchDayBreakSetting.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    expect(startTime()).toHaveTextContent('14:00');
    expect(screen.queryByRole('button', { name: '13:30 ~ 14:00 휴게 배치' })).not.toBeInTheDocument();
    await user.click(startTime());
    expect(within(dialog().getByLabelText('시')).getAllByRole('button')).toHaveLength(24);
    expect(within(dialog().getByLabelText('분')).getAllByRole('button').map((button) => button.textContent)).toEqual(['00', '30']);
    await user.click(within(dialog().getByLabelText('시')).getByRole('button', { name: '15' }));
    await user.click(within(dialog().getByLabelText('분')).getByRole('button', { name: '30' }));
    expect(mocks.saveDayBreakSetting).not.toHaveBeenCalled();
    await user.click(confirm());
    expect(slot('15:30 ~ 16:00')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '14:00 ~ 14:30 휴게 배치' })).not.toBeInTheDocument();
    expect(mocks.saveDayBreakSetting).toHaveBeenCalledWith({ work_date: expect.any(String), min_total_staff: 4, break_start_ref: '15:30' });
    expect(mocks.setManualBreak).not.toHaveBeenCalled();
  });

  it('loads the saved start for each date and normalizes legacy times to 30-minute steps', async () => {
    let firstDate = '';
    mocks.fetchDayBreakSetting.mockImplementation(async (date: string) => {
      if (!firstDate) firstDate = date;
      return { work_date: date, break_start_ref: date === firstDate ? '14:10:00' : '15:30:00', min_total_staff: 6 };
    });
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    expect(startTime()).toHaveTextContent('14:00');
    await user.click(screen.getByRole('button', { name: '다음 날' }));
    await screen.findByRole('button', { name: '15:30 ~ 16:00 휴게 배치' });
    expect(startTime()).toHaveTextContent('15:30');
    await selectStartTime(user, '16:00');
    expect(mocks.saveDayBreakSetting).toHaveBeenLastCalledWith({ work_date: expect.any(String), min_total_staff: 6, break_start_ref: '16:00' });
  });

  it('keeps a changed start during refresh while saving is pending', async () => {
    const save = deferred<void>();
    mocks.saveDayBreakSetting.mockReturnValueOnce(save.promise);
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    await selectStartTime(user, '15:30');
    await act(async () => { await mocks.refetch!(); });
    expect(startTime()).toHaveTextContent('15:30');
    expect(screen.queryByRole('button', { name: '14:00 ~ 14:30 휴게 배치' })).not.toBeInTheDocument();
    await act(async () => { save.resolve(); });
    expect(startTime()).toBeEnabled();
  });

  it('restores the previous start after a save failure so the same selection can be retried', async () => {
    mocks.saveDayBreakSetting.mockRejectedValueOnce(new Error('시작시간 저장 실패'));
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    await selectStartTime(user, '15:30');
    expect(startTime()).toHaveTextContent('10:30');
    expect(screen.getByText('시작시간 저장 실패')).toBeInTheDocument();
    await selectStartTime(user, '15:30');
    expect(mocks.saveDayBreakSetting).toHaveBeenCalledTimes(2);
    expect(startTime()).toHaveTextContent('15:30');
    expect(screen.queryByText('시작시간 저장 실패')).not.toBeInTheDocument();
  });

  it('hides trailing empty slots once complete, shows names only and restores slots after unassignment', async () => {
    mocks.fetchDaySchedules.mockImplementation(async (date: string) => [
      { ...schedule(date), break_start_time: '14:00', break_end_time: '15:30' },
      { ...schedule(date, '단시간'), shift_type: 'part_open', end_time: '13:00' },
    ]);
    mocks.fetchDayBreakSetting.mockResolvedValue(null);
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    expect(screen.queryByRole('button', { name: '15:30 ~ 16:00 휴게 배치' })).not.toBeInTheDocument();
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('휴게자')).toHaveTextContent('직원A');
    expect(within(slot('14:00 ~ 14:30')).getByText('14:00')).toBeInTheDocument();
    expect(within(slot('14:00 ~ 14:30')).queryByText(/14:30/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('이름 표시 범례')).not.toBeInTheDocument();
    expect(within(slot('14:00 ~ 14:30')).queryByText(/직원A.*\(/)).not.toBeInTheDocument();
    await user.click(slot('15:00 ~ 15:30'));
    await user.click(employee('직원A'));
    await user.click(confirm());
    expect(slot('19:30 ~ 20:00')).toBeInTheDocument();
  });

  it('defers changes until confirmation and adds and removes breaks', async () => {
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' }));
    expect(dialog().queryByRole('checkbox', { name: '단시간 휴게 선택' })).not.toBeInTheDocument();
    expect(dialog().queryByText(/현재 휴게/)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '미배치 직원' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '배치 오류' })).not.toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    await user.click(employee('직원A'));
    await user.click(employee('직원B'));
    expect(employee('직원A')).toHaveAttribute('aria-checked', 'true');
    expect(mocks.setManualBreak).not.toHaveBeenCalled();
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('휴게자')).toHaveTextContent('—');
    await user.click(confirm());
    expect(mocks.setManualBreak).toHaveBeenNthCalledWith(1, expect.stringContaining('직원A'), '14:00', '15:30', true);
    expect(mocks.setManualBreak).toHaveBeenNthCalledWith(2, expect.stringContaining('직원B'), '14:00', '14:30', true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    for (const time of ['14:00 ~ 14:30', '14:30 ~ 15:00', '15:00 ~ 15:30']) {
      expect(within(slot(time)).getByLabelText('휴게자')).toHaveTextContent('직원A');
    }
    await user.click(slot('14:30 ~ 15:00'));
    expect(employee('직원A')).toHaveAttribute('aria-checked', 'true');
    await user.click(employee('직원A'));
    expect(confirm()).toBeEnabled();
    expect(mocks.setManualBreak).toHaveBeenCalledTimes(2);
    await user.click(confirm());
    expect(mocks.setManualBreak).toHaveBeenLastCalledWith(expect.stringContaining('직원A'), null, null, true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(slot('14:30 ~ 15:00')).getByLabelText('휴게자')).toHaveTextContent('—');
  });

  it('preserves checked breaks spanning this slot while allowing them to be unchecked even near departure', async () => {
    mocks.fetchDaySchedules.mockImplementation(async (date: string) => [
      { ...schedule(date), end_time: '15:30', break_start_time: '14:00', break_end_time: '15:30' },
      schedule(date, '직원B'),
    ]);
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '15:00 ~ 15:30 휴게 배치' }));
    expect(employee('직원A')).toBeEnabled();
    expect(employee('직원A')).toHaveAttribute('aria-checked', 'true');
    await user.click(confirm());
    expect(mocks.setManualBreak).not.toHaveBeenCalled();
    await user.click(slot('15:00 ~ 15:30'));
    await user.click(employee('직원B'));
    await user.click(confirm());
    expect(mocks.setManualBreak).toHaveBeenCalledTimes(1);
    expect(mocks.setManualBreak).toHaveBeenCalledWith(expect.stringContaining('직원B'), '15:00', '16:30', true);
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('휴게자')).toHaveTextContent('직원A');
    await user.click(slot('15:00 ~ 15:30'));
    await user.click(employee('직원A'));
    await user.click(confirm());
    expect(mocks.setManualBreak).toHaveBeenLastCalledWith(expect.stringContaining('직원A'), null, null, true);
  });

  it('discards draft changes on dismissal', async () => {
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' }));
    await user.click(employee('직원A'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.setManualBreak).not.toHaveBeenCalled();
    await user.click(slot('14:00 ~ 14:30'));
    expect(employee('직원A')).toHaveAttribute('aria-checked', 'false');
  });

  it('selects only eligible workers and supports clearing the draft selection', async () => {
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' }));
    await user.click(dialog().getByRole('button', { name: '전체 선택' }));
    expect(employee('직원A')).toHaveAttribute('aria-checked', 'true');
    expect(employee('직원B')).toHaveAttribute('aria-checked', 'true');
    expect(dialog().queryByRole('checkbox', { name: '단시간 휴게 선택' })).not.toBeInTheDocument();
    await user.click(dialog().getByRole('button', { name: '선택 해제' }));
    expect(confirm()).toBeDisabled();
    expect(mocks.setManualBreak).not.toHaveBeenCalled();
  });

  it('preserves the previous assignment after failure and retains the draft for retry', async () => {
    mocks.fetchDaySchedules.mockImplementation(async (date: string) => [{ ...schedule(date), break_start_time: '12:00', break_end_time: '13:30' }]);
    mocks.setManualBreak.mockRejectedValueOnce(new Error('저장 실패'));
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '12:00 ~ 12:30 휴게 배치' }));
    await user.click(employee('직원A'));
    await user.click(confirm());
    expect(dialog().getByRole('alert')).toHaveTextContent('저장 실패');
    expect(dialog().queryByText(/현재 휴게/)).not.toBeInTheDocument();
    expect(within(slot('12:00 ~ 12:30')).getByLabelText('휴게자')).toHaveTextContent('직원A');
    expect(employee('직원A')).toHaveAttribute('aria-checked', 'false');
    await user.click(confirm());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(slot('12:00 ~ 12:30')).getByLabelText('휴게자')).toHaveTextContent('—');
  });

  it('excludes other-slot assignments and ineligible workers while retaining current-slot selections', async () => {
    mocks.fetchDaySchedules.mockImplementation(async (date: string) => [
      { ...schedule(date), break_start_time: '14:00', break_end_time: '15:30' },
      { ...schedule(date, '다른 슬롯'), break_start_time: '16:00', break_end_time: '17:30' },
      schedule(date, '미배치'),
      { ...schedule(date, '출근 전'), start_time: '17:00', end_time: '21:30' },
      { ...schedule(date, '단시간'), end_time: '13:00' },
      { ...schedule(date, '휴게시간 부족'), end_time: '14:30' },
    ]);
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' }));
    expect(dialog().getAllByRole('checkbox')).toHaveLength(2);
    expect(employee('직원A')).toHaveAttribute('aria-checked', 'true');
    expect(employee('미배치')).toHaveAttribute('aria-checked', 'false');
    for (const name of ['다른 슬롯', '출근 전', '단시간', '휴게시간 부족']) {
      expect(dialog().queryByRole('checkbox', { name: `${name} 휴게 선택` })).not.toBeInTheDocument();
    }
    await user.click(dialog().getByRole('button', { name: '전체 선택' }));
    await user.click(confirm());
    expect(mocks.setManualBreak).toHaveBeenCalledTimes(1);
    expect(mocks.setManualBreak).toHaveBeenCalledWith(expect.stringContaining('미배치'), '14:00', '15:30', true);
  });

  it('shows an empty list message when all employees are excluded', async () => {
    mocks.fetchDaySchedules.mockImplementation(async (date: string) => [
      { ...schedule(date), break_start_time: '12:00', break_end_time: '13:30' },
    ]);
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '11:30 ~ 12:00 휴게 배치' }));
    expect(dialog().getByText('선택할 수 있는 직원이 없습니다.')).toBeInTheDocument();
    expect(dialog().queryByRole('checkbox')).not.toBeInTheDocument();
    expect(confirm()).toBeDisabled();
    expect(dialog().queryByRole('button', { name: '전체 선택' })).not.toBeInTheDocument();
    expect(mocks.setManualBreak).not.toHaveBeenCalled();
  });

  it('retries only unsaved changes after a partial failure', async () => {
    mocks.setManualBreak.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('두 번째 저장 실패'));
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' }));
    await user.click(employee('직원A'));
    await user.click(employee('직원B'));
    await user.click(confirm());
    expect(dialog().getByRole('alert')).toHaveTextContent('1명 변경이 저장되었습니다.');
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('휴게자')).toHaveTextContent('직원A');
    await user.click(confirm());
    expect(mocks.setManualBreak).toHaveBeenCalledTimes(3);
    expect(mocks.setManualBreak).toHaveBeenLastCalledWith(expect.stringContaining('직원B'), '14:00', '14:30', true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('blocks selection, duplicate confirmation and closing during submission', async () => {
    const save = deferred<void>();
    mocks.setManualBreak.mockReturnValueOnce(save.promise);
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' }));
    await user.click(employee('직원A'));
    await user.click(confirm());
    expect(employee('직원B')).toBeDisabled();
    expect(dialog().getByRole('button', { name: '저장 중...' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mocks.setManualBreak).toHaveBeenCalledTimes(1);
    await act(async () => { save.resolve(); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ignores an old date response arriving after the next date', async () => {
    const first = deferred<WorkSchedule[]>();
    let firstDate = '';
    mocks.fetchDaySchedules.mockImplementation((date: string) => {
      if (!firstDate) { firstDate = date; return first.promise; }
      return Promise.resolve([schedule(date, '다음날 직원')]);
    });
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(screen.getByRole('button', { name: '다음 날' }));
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    await act(async () => { first.resolve([schedule(firstDate, '이전날 직원')]); });
    expect(screen.queryByText(/이전날 직원/)).not.toBeInTheDocument();
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('근무자')).toHaveTextContent('다음날 직원');
  });

  it('does not let an old confirmed save cancel loading or alter a new date', async () => {
    const save = deferred<void>();
    const next = deferred<WorkSchedule[]>();
    mocks.setManualBreak.mockReturnValueOnce(save.promise);
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' }));
    await user.click(employee('직원A'));
    await user.click(confirm());
    mocks.fetchDaySchedules.mockReturnValueOnce(next.promise);
    fireEvent.change(screen.getByLabelText('날짜 선택'), { target: { value: '2030-01-02' } });
    await act(async () => { save.resolve(); });
    await act(async () => { next.resolve([schedule('2030-01-02', '새날 직원')]); });
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('휴게자')).toHaveTextContent('—');
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('근무자')).toHaveTextContent('새날 직원');
  });

  it('does not display an old confirmation error on a new date', async () => {
    const save = deferred<void>();
    mocks.setManualBreak.mockReturnValueOnce(save.promise);
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' }));
    await user.click(employee('직원A'));
    await user.click(confirm());
    fireEvent.change(screen.getByLabelText('날짜 선택'), { target: { value: '2030-01-02' } });
    await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' });
    await act(async () => { mocks.storeError = '이전 날짜 저장 실패'; save.reject(new Error(mocks.storeError)); });
    expect(screen.queryByText('이전 날짜 저장 실패')).not.toBeInTheDocument();
  });

  it('keeps a confirmed assignment when an earlier refresh completes late', async () => {
    const refresh = deferred<WorkSchedule[]>();
    const user = userEvent.setup();
    render(<ManualBreakPage />);
    await user.click(await screen.findByRole('button', { name: '14:00 ~ 14:30 휴게 배치' }));
    const date = mocks.fetchDaySchedules.mock.calls[0][0];
    mocks.fetchDaySchedules.mockReturnValueOnce(refresh.promise);
    act(() => { void mocks.refetch!(); });
    await user.click(employee('직원A'));
    await user.click(confirm());
    await act(async () => { refresh.resolve(schedules(date)); });
    expect(within(slot('14:00 ~ 14:30')).getByLabelText('휴게자')).toHaveTextContent('직원A');
  });

  it('shows loading failures and recovers on refresh', async () => {
    mocks.fetchDaySchedules.mockRejectedValueOnce(new Error('조회 실패'));
    render(<ManualBreakPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('조회 실패');
    await act(async () => { await mocks.refetch!(); });
    expect(screen.queryByText('조회 실패')).not.toBeInTheDocument();
    expect(slot('14:00 ~ 14:30')).toBeInTheDocument();
  });
});
