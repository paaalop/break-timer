import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmployeeRow from './EmployeeRow';
import ShiftTypePicker from '@/components/ui/ShiftTypePicker';
import EmployeeTable from '@/components/employees/EmployeeTable';
import type { WorkSchedule } from '@/types';

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('@/store/useScheduleStore', () => ({ useScheduleStore: () => ({ upsertSchedule: save, deleteSchedule: vi.fn() }) }));

const schedule: WorkSchedule = {
  id: 'schedule', employee_id: 'employee', work_date: '2026-10-07', shift_type: 'part',
  start_time: '11:00', end_time: '16:30', break_start_time: null, break_end_time: null,
  created_at: '', updated_at: '',
  employee: { id: 'employee', name: '테스트직원', available_roles: ['cashier'], available_days: [3], default_shift_types: ['part'], is_deleted: false, created_at: '' },
};

beforeEach(() => save.mockReset().mockResolvedValue(undefined));

describe('part shift selection', () => {
  it('saves and reopens employee default part types with the same selector', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const employee = { ...schedule.employee!, default_shift_types: ['part_open'] as const };
    const props = {
      selectedIds: [], onToggleSelectAll: vi.fn(), onToggleSelectOne: vi.fn(), isAdding: false,
      onOpenAdd: vi.fn(), onDeleteSelected: vi.fn(), onCancelAdd: vi.fn(), onSaveNew: vi.fn(), onUpdate: update,
    };
    const employees = [{ ...employee, default_shift_types: [...employee.default_shift_types] }];
    const view = render(<EmployeeTable {...props} employees={employees} />);
    fireEvent.click(screen.getByRole('button', { name: /테스트직원/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: '오픈파트' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(dialog).getByRole('button', { name: '마감파트' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '변경사항 저장' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(update).toHaveBeenCalledWith('employee', expect.objectContaining({ default_shift_types: ['part_close'] }));
    view.rerender(<EmployeeTable {...props} employees={[{ ...employees[0], default_shift_types: ['part_close'] }]} />);
    fireEvent.click(screen.getByRole('button', { name: /테스트직원/ }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: '마감파트' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps four main choices and reveals three part choices with custom selected', () => {
    const change = vi.fn();
    const view = render(<ShiftTypePicker value="open" onChange={change} />);
    expect(within(screen.getByRole('group', { name: '근무 타입' })).getAllByRole('button')).toHaveLength(4);
    expect(screen.queryByRole('group', { name: '파트 유형' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '파트' }));
    expect(change).toHaveBeenCalledWith('part');
    view.rerender(<ShiftTypePicker value="part" onChange={change} />);
    const subtypes = screen.getByRole('group', { name: '파트 유형' });
    expect(within(subtypes).getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: '사용자 지정' })).toHaveAttribute('aria-pressed', 'true');
    expect(subtypes).toHaveStyle({ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
  });

  it.each([
    ['오픈파트', 'part_open', '10:30', '14:00'],
    ['마감파트', 'part_close', '18:30', '21:30'],
  ] as const)('saves and reopens %s with fixed times', async (label, type, start, end) => {
    const props = { isSelected: false, onToggleSelect: vi.fn(), variant: 'mobile' as const };
    const view = render(<EmployeeRow {...props} schedule={schedule} />);
    fireEvent.click(screen.getByText('테스트직원'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: '11:00' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: label }));
    expect(within(dialog).getByText(`${start} ~ ${end}`)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: start })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '변경사항 저장' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ shift_type: type, start_time: start, end_time: end }));
    view.rerender(<EmployeeRow {...props} schedule={{ ...schedule, shift_type: type, start_time: start, end_time: end }} />);
    fireEvent.click(screen.getByText('테스트직원'));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('dialog')).getByText(`${start} ~ ${end}`)).toBeInTheDocument();
  });

  it('preserves fixed times when switching to custom and preserves legacy custom times on save', async () => {
    render(<EmployeeRow schedule={schedule} isSelected={false} onToggleSelect={vi.fn()} variant="mobile" />);
    fireEvent.click(screen.getByText('테스트직원'));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: '파트' }));
    expect(within(dialog).getByRole('button', { name: '11:00' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '마감파트' }));
    fireEvent.click(within(dialog).getByRole('button', { name: '사용자 지정' }));
    expect(within(dialog).getByRole('button', { name: '18:30' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '21:30' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: '변경사항 저장' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ shift_type: 'part', start_time: '18:30', end_time: '21:30' })));
  });

  it('saves existing custom times without resetting them', async () => {
    render(<EmployeeRow schedule={schedule} isSelected={false} onToggleSelect={vi.fn()} variant="mobile" />);
    fireEvent.click(screen.getByText('테스트직원'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '변경사항 저장' }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ shift_type: 'part', start_time: '11:00', end_time: '16:30' })));
  });
});
