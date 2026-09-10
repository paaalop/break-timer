'use client';

import { useState } from 'react';
import type { Employee, Role, DayOfWeek, ShiftType, CreateEmployeeInput, UpdateEmployeeInput } from '@/types';
import { ROLE_OPTIONS, ROLE_LABELS, DAY_OPTIONS, DAY_LABELS, SHIFT_OPTIONS, SHIFT_LABELS } from '@/lib/constants';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import Badge from '@/components/ui/Badge';

interface EmployeeTableProps {
  employees: Employee[];
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string) => void;
  isAdding: boolean;
  onOpenAdd: () => void;
  onDeleteSelected: () => void;
  onCancelAdd: () => void;
  onSaveNew: (data: CreateEmployeeInput) => Promise<void>;
  onUpdate: (id: string, data: UpdateEmployeeInput) => Promise<void>;
  isLoading?: boolean;
}

export default function EmployeeTable({
  employees,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectOne,
  isAdding,
  onOpenAdd,
  onDeleteSelected,
  onCancelAdd,
  onSaveNew,
  onUpdate,
  isLoading,
}: EmployeeTableProps) {
  // 신규 추가 상태
  const [newName, setNewName] = useState('');
  const [newRoles, setNewRoles] = useState<Role[]>([]);
  const [newDays, setNewDays] = useState<DayOfWeek[]>([1, 2, 3, 4, 5, 6]);
  const [newShifts, setNewShifts] = useState<ShiftType[]>(['open']);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState<Role[]>([]);
  const [editDays, setEditDays] = useState<DayOfWeek[]>([]);
  const [editShifts, setEditShifts] = useState<ShiftType[]>(['open']);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const resetNewForm = () => {
    setNewName('');
    setNewRoles([]);
    setNewDays([1, 2, 3, 4, 5, 6]);
    setNewShifts(['open']);
    setAddError(null);
  };

  const handleSaveNewSubmit = async () => {
    if (!newName.trim()) {
      setAddError('이름 입력');
      return;
    }
    if (newDays.length === 0) {
      setAddError('요일 선택');
      return;
    }
    if (newShifts.length === 0) {
      setAddError('타입 선택');
      return;
    }

    setAddError(null);
    setIsSubmittingAdd(true);
    try {
      await onSaveNew({
        name: newName.trim(),
        available_roles: newRoles,
        available_days: newDays,
        default_shift_types: newShifts,
      });
      resetNewForm();
    } catch (err: any) {
      setAddError(err?.message || '저장 실패');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleStartEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditRoles(emp.available_roles.filter((r): r is Role => r in ROLE_LABELS));
    setEditDays([...emp.available_days]);
    setEditShifts(emp.default_shift_types.length ? [emp.default_shift_types[0]] : ['open']);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEditSubmit = async (id: string) => {
    if (!editName.trim()) {
      setEditError('이름 입력');
      return;
    }
    if (editDays.length === 0) {
      setEditError('요일 선택');
      return;
    }
    if (editShifts.length === 0) {
      setEditError('타입 선택');
      return;
    }

    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      await onUpdate(id, {
        name: editName.trim(),
        available_roles: editRoles,
        available_days: editDays,
        default_shift_types: editShifts,
      });
      setEditingId(null);
    } catch (err: any) {
      setEditError(err?.message || '수정 실패');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const isAllSelected =
    employees.length > 0 && employees.every((emp) => selectedIds.includes(emp.id));

  const thStyle: React.CSSProperties = {
    padding: '8px 2px',
    fontSize: 11,
    fontWeight: 600,
    textAlign: 'center',
    color: 'var(--color-primary)',
    borderBottom: '1px solid var(--color-border)',
    borderRight: '1px solid var(--color-border)',
    background: '#FAFAFA',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '7px 2px',
    fontSize: 12,
    textAlign: 'center',
    borderBottom: '1px solid var(--color-border)',
    borderRight: '1px solid var(--color-border)',
    verticalAlign: 'middle',
  };

  if (isLoading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 14 }}>
        불러오는 중...
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 4,
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* 헤더 바: Total 인원수 + 왼쪽 정렬 +, - 버튼 (DayCard와 동일한 양식) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 8px',
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {/* Total 인원수 라벨 */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--color-neutral-dark)',
          }}
        >
          {`총 ${employees.length}명`}
        </span>

        {/* +, - 버튼 영역 (왼쪽 정렬) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* + 직원 추가 버튼 */}
          <button
            onClick={onOpenAdd}
            disabled={isAdding}
            title="직원 추가"
            style={{
              width: 22,
              height: 22,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 3,
              cursor: isAdding ? 'not-allowed' : 'pointer',
              opacity: isAdding ? 0.35 : 1,
            }}
          >
            +
          </button>

          {/* - 선택 삭제 버튼 */}
          <button
            onClick={onDeleteSelected}
            disabled={selectedIds.length === 0}
            title={
              selectedIds.length > 0
                ? `선택한 ${selectedIds.length}명 삭제`
                : '삭제할 직원을 체크하세요'
            }
            style={{
              width: 22,
              height: 22,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              background: selectedIds.length > 0 ? '#FDF2F1' : '#F5F5F5',
              color: selectedIds.length > 0 ? '#C0392B' : '#AAAAAA',
              border:
                selectedIds.length > 0
                  ? '1px solid #C0392B'
                  : '1px solid var(--color-border)',
              borderRadius: 3,
              cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            -
          </button>
        </div>
      </div>

      {/* 테이블 그리드 */}
      <div
        style={{
          width: '100%',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <table
          style={{
            width: '100%',
            tableLayout: 'fixed',
            borderCollapse: 'collapse',
            background: 'var(--color-surface)',
          }}
        >
          <thead>
            <tr>
              {/* 맨 앞 전체선택 체크박스: 고정 32px */}
              <th style={{ ...thStyle, width: 32, padding: '4px 2px' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  style={{ cursor: 'pointer', margin: 0 }}
                  aria-label="전체 선택"
                />
              </th>
              {/* 이름 */}
              <th style={{ ...thStyle, width: '14%' }}>이름</th>
              {/* 직무: 2개로 줄었으므로 20% */}
              <th style={{ ...thStyle, width: '20%' }}>직무</th>
              {/* 근무 요일: 45% 확보 */}
              <th style={{ ...thStyle, width: '45%' }}>근무 요일</th>
              {/* 근무 타입 */}
              <th style={{ ...thStyle, width: '21%', borderRight: 'none' }}>근무 타입</th>
            </tr>
          </thead>
          <tbody>
            {/* 1. 신규 직원 추가 행 */}
            {isAdding && (
              <tr style={{ background: '#F0F7FF', borderBottom: '2px solid var(--color-primary)' }}>
                {/* 맨 앞 저장/취소 아이콘 버튼 */}
                <td style={{ ...tdStyle, width: 32, padding: '2px 1px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                    <button
                      onClick={handleSaveNewSubmit}
                      disabled={isSubmittingAdd}
                      title="저장"
                      style={{
                        background: 'var(--color-primary)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 2,
                        width: 20,
                        height: 18,
                        fontSize: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        resetNewForm();
                        onCancelAdd();
                      }}
                      disabled={isSubmittingAdd}
                      title="취소"
                      style={{
                        background: '#EEEEEE',
                        color: '#666666',
                        border: 'none',
                        borderRadius: 2,
                        width: 20,
                        height: 18,
                        fontSize: 10,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </td>
                {/* 이름 */}
                <td style={tdStyle}>
                  <input
                    type="text"
                    placeholder="이름"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveNewSubmit();
                      if (e.key === 'Escape') {
                        resetNewForm();
                        onCancelAdd();
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '2px 0',
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      textAlign: 'center',
                      color: 'var(--color-neutral-dark)',
                      boxSizing: 'border-box',
                    }}
                    autoFocus
                  />
                </td>
                {/* 직무 */}
                <td style={tdStyle}>
                  <MultiSelectDropdown
                    options={ROLE_OPTIONS}
                    selected={newRoles}
                    onChange={setNewRoles}
                    placeholder="직무"
                  />
                </td>
                {/* 근무 요일 */}
                <td style={tdStyle}>
                  <MultiSelectDropdown
                    options={DAY_OPTIONS}
                    selected={newDays}
                    onChange={setNewDays}
                    placeholder="요일"
                  />
                </td>
                {/* 근무 타입 */}
                <td style={{ ...tdStyle, borderRight: 'none' }}>
                  <select
                    value={newShifts[0] ?? 'open'}
                    onChange={(e) => setNewShifts([e.target.value as ShiftType])}
                    style={{
                      width: '100%',
                      minHeight: 26,
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      fontWeight: 400,
                      color: 'var(--color-neutral-dark)',
                      textAlign: 'center',
                      textAlignLast: 'center',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      boxSizing: 'border-box',
                    }}
                  >
                    {SHIFT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {addError && (
                    <div style={{ color: '#C0392B', fontSize: 10, marginTop: 1 }}>{addError}</div>
                  )}
                </td>
              </tr>
            )}

            {employees.length === 0 && !isAdding && (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: '32px 0',
                    textAlign: 'center',
                    color: '#bbb',
                    fontSize: 12,
                    borderBottom: 'none',
                  }}
                >
                  등록된 직원이 없습니다. 상단의 + 버튼을 눌러 직원을 등록해 주세요.
                </td>
              </tr>
            )}

            {/* 2. 기존 직원 행들 */}
            {employees.map((emp) => {
              const isEditing = editingId === emp.id;

              if (isEditing) {
                return (
                  <tr
                    key={emp.id}
                    style={{ background: '#FFFDF0', borderBottom: '2px solid #E67E22' }}
                  >
                    {/* 수정 시 맨 앞 저장/취소 버튼 */}
                    <td
                      style={{ ...tdStyle, width: 32, padding: '2px 1px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                        <button
                          onClick={() => handleSaveEditSubmit(emp.id)}
                          disabled={isSubmittingEdit}
                          title="저장"
                          style={{
                            background: '#E67E22',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 2,
                            width: 20,
                            height: 18,
                            fontSize: 10,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSubmittingEdit}
                          title="취소"
                          style={{
                            background: '#EEEEEE',
                            color: '#666666',
                            border: 'none',
                            borderRadius: 2,
                            width: 20,
                            height: 18,
                            fontSize: 10,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                    {/* 이름 */}
                    <td style={tdStyle}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditSubmit(emp.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        style={{
                          width: '100%',
                          padding: '2px 0',
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          textAlign: 'center',
                          color: 'var(--color-neutral-dark)',
                          boxSizing: 'border-box',
                        }}
                        autoFocus
                      />
                    </td>
                    {/* 직무 */}
                    <td style={tdStyle}>
                      <MultiSelectDropdown
                        options={ROLE_OPTIONS}
                        selected={editRoles}
                        onChange={setEditRoles}
                        placeholder="직무"
                      />
                    </td>
                    {/* 근무 요일 */}
                    <td style={tdStyle}>
                      <MultiSelectDropdown
                        options={DAY_OPTIONS}
                        selected={editDays}
                        onChange={setEditDays}
                        placeholder="요일"
                      />
                    </td>
                    {/* 근무 타입 */}
                    <td style={{ ...tdStyle, borderRight: 'none' }}>
                      <select
                        value={editShifts[0] ?? 'open'}
                        onChange={(e) => setEditShifts([e.target.value as ShiftType])}
                        style={{
                          width: '100%',
                          minHeight: 26,
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          fontSize: 11,
                          fontFamily: 'inherit',
                          fontWeight: 400,
                          color: 'var(--color-neutral-dark)',
                          textAlign: 'center',
                          textAlignLast: 'center',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          boxSizing: 'border-box',
                        }}
                      >
                        {SHIFT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {editError && (
                        <div style={{ color: '#C0392B', fontSize: 10, marginTop: 1 }}>{editError}</div>
                      )}
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={emp.id}
                  onClick={() => handleStartEdit(emp)}
                  style={{
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                  title="터치하여 즉시 수정"
                >
                  {/* 행별 선택 체크박스 */}
                  <td
                    style={{ ...tdStyle, width: 32, padding: '4px 2px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(emp.id)}
                      onChange={() => onToggleSelectOne(emp.id)}
                      style={{ cursor: 'pointer', margin: 0 }}
                      aria-label={`${emp.name} 선택`}
                    />
                  </td>
                  {/* 이름 */}
                  <td style={{ ...tdStyle, fontWeight: 600, fontSize: 12 }}>{emp.name}</td>
                  {/* 직무 */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: 11, color: 'var(--color-neutral-dark)' }}>
                      {emp.available_roles
                        .filter((r) => r in ROLE_LABELS)
                        .map((r) => ROLE_LABELS[r])
                        .join(', ') || '-'}
                    </span>
                  </td>
                  {/* 근무 요일: gap 2, 패딩 최소화로 밀착 */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                      {[...emp.available_days]
                        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
                        .map((d) => (
                          <Badge key={d} label={DAY_LABELS[d] ?? String(d)} />
                        ))}
                    </div>
                  </td>
                  {/* 근무 타입 */}
                  <td style={{ ...tdStyle, borderRight: 'none' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-neutral-dark)', whiteSpace: 'nowrap' }}>
                      {emp.default_shift_types[0] ? (SHIFT_LABELS[emp.default_shift_types[0]] ?? emp.default_shift_types[0]) : '-'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
