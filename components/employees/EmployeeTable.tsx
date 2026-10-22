'use client';

import { useState, useMemo } from 'react';
import type { Employee, Role, ShiftType, CreateEmployeeInput, UpdateEmployeeInput } from '@/types';
import { ROLE_OPTIONS, ROLE_LABELS, DAY_LABELS, SHIFT_LABELS, SHIFT_TEXT_COLOR } from '@/lib/constants';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import EmployeeFormModal from '@/components/employees/EmployeeForm';
import { useMediaQuery } from '@/hooks/useMediaQuery';


const ROLE_ORDER: Record<string, number> = Object.fromEntries(
  ROLE_OPTIONS.map((opt, i) => [opt.value, i])
);

function getSortedRoles(roles: Role[]): Role[] {
  return [...roles]
    .filter((r) => r in ROLE_LABELS)
    .sort((a, b) => (ROLE_ORDER[a] ?? 99) - (ROLE_ORDER[b] ?? 99));
}


interface EmployeeTableProps {
  employees: Employee[];
  selectedIds: string[];
  onToggleSelectAll: () => void;
  onToggleSelectOne: (id: string) => void;
  isAdding: boolean;
  onOpenAdd: () => void;
  onDeleteSelected: () => void;
  onDeleteSingle?: (id: string) => Promise<void>;
  onCancelAdd: () => void;
  onSaveNew: (data: CreateEmployeeInput) => Promise<void>;
  onUpdate: (id: string, data: UpdateEmployeeInput) => Promise<void>;
  isLoading?: boolean;
}

// ─── 메인 컴포넌트 ──────────────────────────────────────────────────────────────
export default function EmployeeTable({
  employees,
  selectedIds,
  onToggleSelectAll,
  onToggleSelectOne,
  isAdding,
  onOpenAdd,
  onDeleteSelected,
  onDeleteSingle,
  onCancelAdd,
  onSaveNew,
  onUpdate,
  isLoading,
}: EmployeeTableProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // 모바일 검색 + 시트 상태
  const [mobileQuery, setMobileQuery] = useState('');
  const [sheetEmp, setSheetEmp] = useState<Employee | null>(null);

  // 모바일 시트에서 삭제 (단건 삭제)
  const handleSheetDelete = async () => {
    if (!sheetEmp) return;
    const targetId = sheetEmp.id;
    setSheetEmp(null);
    if (onDeleteSingle) {
      await onDeleteSingle(targetId);
    }
  };

  // 이름 오름차순 (가나다순) 정렬
  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [employees]);

  const isAllSelected = sortedEmployees.length > 0 && sortedEmployees.every((emp) => selectedIds.includes(emp.id));

  const filteredEmployees = sortedEmployees.filter((e) =>
    e.name.includes(mobileQuery.trim())
  );

  if (isLoading) {
    return (
      <div className="ui-body" style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>
        불러오는 중...
      </div>
    );
  }





  return (
    <>
      {/* ── 1. 데스크톱 헤더 (총 직원 수 + 추가 버튼: md 이상 표시) ─────────────────── */}
      <div
        className="hidden md:flex items-center justify-between"
        style={{
          padding: '2px 0 10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-neutral-dark)', letterSpacing: '-0.02em' }}>
            {`총 ${employees.length}명`}
          </span>
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={onDeleteSelected}
              className="ui-button ui-button--sm ui-button--danger"
            >
              선택 삭제 ({selectedIds.length}명)
            </button>
          )}
        </div>
        <button
          onClick={onOpenAdd}
          disabled={isAdding}
          title="직원 추가"
          className="ui-button ui-button--sm ui-button--primary"
        >
          + 직원 추가
        </button>
      </div>

      {/* ── 2. 검색창 + 추가 버튼 (모바일 전용: 보더라인 제거 + 전체삭제 x버튼) ─── */}
      <div className="flex md:hidden items-center gap-2 mb-3 px-4 sm:px-0">
        <Input
          variant="borderless"
          value={mobileQuery}
          onChange={(e) => setMobileQuery(e.target.value)}
          placeholder="이름으로 검색"
          containerStyle={{ flex: 1 }}
          style={{
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--color-text-muted)',
            background: 'var(--color-muted-bg)',
          }}
        />
        <button
          onClick={onOpenAdd}
          disabled={isAdding}
          style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            border: 'none',
            fontSize: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            opacity: isAdding ? 0.5 : 1,
          }}
        >
          +
        </button>
      </div>

      <div
        style={{
          background: 'transparent',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
      {/* ═══════════════════════════════════════════════════════════════════════
          모바일 단일 블럭 리스트 뷰 (md 미만: 박스 내부에 총 직원 수 헤더 포함)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="block md:hidden">
        <div
          style={{
            background: 'var(--color-surface)',
            borderRadius: 0,
            overflow: 'hidden',
          }}
        >
          {/* 박스 내부 상단: 총 직원 수 헤더 */}
          <div
            style={{
              padding: '14px 16px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '-0.02em' }}>
              {mobileQuery.trim()
                ? `검색 결과 ${filteredEmployees.length}명 / 총 ${employees.length}명`
                : `총 ${employees.length}명`}
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={onDeleteSelected}
                className="ui-button ui-button--sm ui-button--danger"
              >
                선택 삭제 ({selectedIds.length}명)
              </button>
            )}
          </div>

          {filteredEmployees.length === 0 && !isAdding && (
            <p className="ui-label" style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--color-disabled)' }}>
              {mobileQuery ? '검색 결과가 없어요' : '등록된 직원이 없습니다.'}
            </p>
          )}
          {filteredEmployees.map((emp) => {
            const sortedDays = [...emp.available_days].sort(
              (a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)
            );
            const shiftType = emp.default_shift_types[0] as ShiftType | undefined;
            const sortedRoles = getSortedRoles(emp.available_roles);

            return (
              <button
                key={emp.id}
                onClick={() => setSheetEmp(emp)}
                style={{
                  display: 'flex',
                  width: '100%',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  background: 'var(--color-surface)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  border: 'none',
                  boxSizing: 'border-box',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
              >
                {/* 큼직한 아바타 서클: 오른쪽 텍스트들의 시각적 앵커 역할 */}
                <Avatar name={emp.name} size={52} />

                {/* 정보 영역: 아바타에 귀속된 단일 그룹으로 인지 */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* 1행: 이름 · 직무 (좌측) / 미성년자 (우측 상태 뱃지) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-neutral-dark)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                        {emp.name}
                      </span>
                      {sortedRoles.length > 0 && (
                        <span
                          style={{
                            padding: '1px 6px',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 4,
                            background: 'var(--color-muted-bg)',
                            color: 'var(--color-text-muted)',
                            letterSpacing: '-0.02em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            lineHeight: 1.4,
                            flexShrink: 0,
                          }}
                        >
                          {sortedRoles.map((role) => ROLE_LABELS[role]).join(' · ')}
                        </span>
                      )}
                    </div>

                    {/* 미성년자: 우측 상단 상태 뱃지 */}
                    {emp.is_minor && (
                      <span
                        style={{
                          padding: '1px 6px',
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 4,
                          background: 'var(--color-warning-surface)',
                          color: 'var(--color-warning)',
                          whiteSpace: 'nowrap',
                          lineHeight: 1.4,
                          flexShrink: 0,
                        }}
                      >
                        미성년자
                      </span>
                    )}
                  </div>

                  {/* 2행: 근무타입(컬러 텍스트) | 근무 가능 요일 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      color: 'var(--color-text-muted)',
                      letterSpacing: '-0.02em',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {shiftType && (
                      <>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 600,
                            color: SHIFT_TEXT_COLOR[shiftType] ?? 'var(--color-text-muted)',
                            flexShrink: 0,
                          }}
                        >
                          {SHIFT_LABELS[shiftType]}
                        </span>
                        <span style={{ color: 'var(--color-border-strong)', fontSize: 10 }}>|</span>
                      </>
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sortedDays.length > 0 ? sortedDays.map((d) => DAY_LABELS[d] ?? String(d)).join('·') : '요일 없음'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 직원 수정/추가 모달 (PC: 중앙 모달, 모바일: 바텀시트) */}
      {sheetEmp && (
        <EmployeeFormModal
          key={sheetEmp.id}
          mode="edit"
          presentation={isDesktop ? 'dialog' : 'sheet'}
          emp={sheetEmp}
          onClose={() => setSheetEmp(null)}
          onSave={(data) => onUpdate(sheetEmp.id, data)}
          onDelete={handleSheetDelete}
        />
      )}
      {isAdding && (
        <EmployeeFormModal
          mode="add"
          presentation={isDesktop ? 'dialog' : 'sheet'}
          onClose={onCancelAdd}
          onSave={onSaveNew}
        />
      )}

      {/* 데스크탑 테이블 뷰 (md 이상) */}
      <div className="hidden md:block emp-table-wrap">
        <table className="emp-table">
          <thead>
            <tr>
              <th style={{ width: 44 }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  style={{ cursor: 'pointer', margin: 0 }}
                  aria-label="전체 선택"
                />
              </th>
              <th style={{ width: '20%' }}>이름</th>
              <th style={{ width: '24%' }}>직무</th>
              <th style={{ width: '38%' }}>근무 요일</th>
              <th style={{ width: '18%' }}>근무 타입</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="emp-table__empty">등록된 직원이 없습니다.</td>
              </tr>
            )}
            {sortedEmployees.map((emp) => {
              const shift = emp.default_shift_types[0] as ShiftType | undefined;
              const roleLabels = getSortedRoles(emp.available_roles).map((r) => ROLE_LABELS[r]);
              return (
                <tr
                  key={emp.id}
                  className="emp-row"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setSheetEmp(emp); }}
                  onClick={() => setSheetEmp(emp)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(emp.id)}
                      onChange={() => onToggleSelectOne(emp.id)}
                      style={{ cursor: 'pointer', margin: 0 }}
                      aria-label={`${emp.name} 선택`}
                    />
                  </td>
                  <td>
                    <div className="emp-row__name">
                      <span className="emp-row__name-text">{emp.name}</span>
                      {emp.is_minor && <span className="emp-chip emp-chip--warning">미성년자</span>}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: 'var(--color-neutral-dark)', letterSpacing: '-0.02em' }}>
                      {roleLabels.length > 0 ? roleLabels.join(', ') : <span className="emp-row__none">-</span>}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: 13, color: 'var(--color-text-subtle)', letterSpacing: '-0.02em' }}>
                      {[...emp.available_days]
                        .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
                        .map((d) => DAY_LABELS[d] ?? String(d))
                        .join(', ') || <span className="emp-row__none">-</span>}
                    </span>
                  </td>
                  <td>
                    {shift ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: SHIFT_TEXT_COLOR[shift] ?? 'var(--color-text-muted)', letterSpacing: '-0.02em' }}>
                        {SHIFT_LABELS[shift] ?? shift}
                      </span>
                    ) : <span className="emp-row__none">-</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </> 
  );
}
