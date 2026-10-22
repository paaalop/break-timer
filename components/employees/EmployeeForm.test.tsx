import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EmployeeFormModal from './EmployeeForm';
import type { Employee } from '@/types';

const employee = {
  id: 'e1',
  name: '김철수',
  available_roles: ['kitchen'],
  available_days: [1, 2],
  default_shift_types: ['open'],
  is_minor: false,
} as unknown as Employee;

describe('EmployeeFormModal', () => {
  it.each(['dialog', 'sheet'] as const)('shows validation errors when empty (%s)', async (presentation) => {
    const onSave = vi.fn();
    render(<EmployeeFormModal mode="add" presentation={presentation} onClose={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /등록/ }));
    expect(await screen.findByText('이름을 입력해 주세요.')).toBeTruthy();
    expect(screen.getByText('근무 요일을 1개 이상 선택해 주세요.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves edited values and closes (dialog)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<EmployeeFormModal mode="edit" presentation="dialog" emp={employee} onClose={onClose} onSave={onSave} onDelete={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('이름 입력'), { target: { value: '김영희' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: '김영희', available_days: [1, 2] }));
  });

  it('asks for confirmation before deleting (dialog)', async () => {
    const onDelete = vi.fn();
    render(<EmployeeFormModal mode="edit" presentation="dialog" emp={employee} onClose={vi.fn()} onSave={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    expect(onDelete).not.toHaveBeenCalled();
    expect(await screen.findByText('직원을 삭제하시겠습니까?')).toBeTruthy();
  });
});

