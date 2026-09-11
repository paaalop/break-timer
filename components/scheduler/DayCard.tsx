'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import type { WorkSchedule, Employee, ShiftType } from '@/types';
import { SHIFT_DEFAULTS } from '@/types';
import { formatDayLabel } from '@/lib/weekUtils';
import { useScheduleStore } from '@/store/useScheduleStore';
import EmployeeRow from './EmployeeRow';

interface DayCardProps {
  date: string;
  schedules: WorkSchedule[];
  employees: Employee[];
  onBreakClick?: (schedule: WorkSchedule) => void;
}

export default function DayCard({ date, schedules, employees }: DayCardProps) {
  const { upsertSchedule, deleteSchedules } = useScheduleStore();
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 스케줄 목록 정렬: 1. 근무시간 오름차순 (시작시간 -> 종료시간), 2. 이름 오름차순
  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      const startCompare = a.start_time.localeCompare(b.start_time);
      if (startCompare !== 0) return startCompare;
      const endCompare = a.end_time.localeCompare(b.end_time);
      if (endCompare !== 0) return endCompare;
      const nameA = a.employee?.name || '';
      const nameB = b.employee?.name || '';
      return nameA.localeCompare(nameB, 'ko');
    });
  }, [schedules]);

  // 해당 날짜에 이미 배정된 직원 ID
  const assignedIds = new Set(schedules.map((s) => s.employee_id));

  // 배정 가능한 직원 (is_deleted=false, 아직 미배정, 이름 오름차순)
  const availableEmployees = useMemo(
    () =>
      employees
        .filter((e) => !e.is_deleted && !assignedIds.has(e.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [employees, assignedIds]
  );

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    if (!showAddDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowAddDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddDropdown]);

  // 스케줄 목록이 변경되면 유효하지 않은 선택 ID 정리
  useEffect(() => {
    setSelectedScheduleIds((prev) => prev.filter((id) => schedules.some((s) => s.id === id)));
  }, [schedules]);

  const handleToggleSelectAll = () => {
    if (schedules.length === 0) return;
    if (selectedScheduleIds.length === schedules.length) {
      setSelectedScheduleIds([]);
    } else {
      setSelectedScheduleIds(schedules.map((s) => s.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedScheduleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddEmployee = async (employee: Employee) => {
    setShowAddDropdown(false);
    setIsAdding(true);

    const defaultShift: ShiftType =
      (employee.default_shift_types[0] as ShiftType | undefined) ?? 'open';

    const defaults = SHIFT_DEFAULTS[defaultShift];
    const startTime = defaults.start;
    const endTime = defaults.end;

    try {
      await upsertSchedule({
        employee_id: employee.id,
        work_date: date,
        shift_type: defaultShift,
        start_time: startTime,
        end_time: endTime,
        break_start_time: null,
        break_end_time: null,
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedScheduleIds.length === 0) return;
    await deleteSchedules(selectedScheduleIds);
    setSelectedScheduleIds([]);
  };

  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isAllSelected =
    schedules.length > 0 && selectedScheduleIds.length === schedules.length;

  return (
    <div
      style={{
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        background: 'var(--color-surface)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── 날짜 헤더 바 ─────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: 'var(--color-bg)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 날짜 라벨 */}
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: isWeekend ? '#C0392B' : 'var(--color-neutral-dark)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatDayLabel(date)}
          </span>

          {/* 선택 삭제 버튼 */}
          {selectedScheduleIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              style={{
                padding: '3px 10px',
                fontSize: 12,
                fontWeight: 600,
                background: '#FDF2F1',
                color: '#C0392B',
                border: '1px solid #C0392B',
                borderRadius: 6,
                cursor: 'pointer',
                letterSpacing: '-0.02em',
              }}
            >
              {selectedScheduleIds.length}명 삭제
            </button>
          )}
        </div>

        {/* + 직원 추가 버튼 */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAddDropdown((v) => !v)}
            disabled={isAdding || availableEmployees.length === 0}
            title={availableEmployees.length === 0 ? '추가 가능한 직원이 없습니다' : '직원 추가'}
            style={{
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              background: availableEmployees.length === 0 ? '#F0EEE9' : 'var(--color-primary)',
              color: availableEmployees.length === 0 ? '#B0A898' : '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              cursor: availableEmployees.length === 0 ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.02em',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>+</span>
            직원 추가
          </button>

          {/* 직원 선택 드롭다운 */}
          {showAddDropdown && availableEmployees.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 36,
                right: 0,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                zIndex: 60,
                minWidth: 140,
                maxHeight: 200,
                overflowY: 'auto',
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              }}
            >
              {availableEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleAddEmployee(emp)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: 13,
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'transparent',
                    color: 'var(--color-neutral-dark)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#F9F8F6')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {emp.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 모바일: 카드 리스트 뷰 (md 미만) ─────────────────────────── */}
      <div className="block md:hidden">
        {sortedSchedules.length === 0 ? (
          <p
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              color: '#bbb',
              fontSize: 13,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            근무자 없음
          </p>
        ) : (
          sortedSchedules.map((s, idx) => (
            <EmployeeRow
              key={s.id}
              schedule={s}
              isSelected={selectedScheduleIds.includes(s.id)}
              onToggleSelect={handleToggleSelectOne}
              isLast={idx === sortedSchedules.length - 1}
            />
          ))
        )}
      </div>

      {/* ── 데스크톱: 테이블 뷰 (md 이상) ────────────────────────────── */}
      <div className="hidden md:block">
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
              {/* 체크박스 (전체 선택) */}
              <th style={{ ...thStyle, width: 28, padding: '4px 2px' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  disabled={schedules.length === 0}
                  style={{ cursor: schedules.length === 0 ? 'default' : 'pointer', margin: 0 }}
                  aria-label="전체 선택"
                />
              </th>
              {/* 이름 */}
              <th style={{ ...thStyle, width: '22%' }}>이름</th>
              {/* 근무 타입 */}
              <th style={{ ...thStyle, width: '24%' }}>근무 타입</th>
              {/* 근무 시간 (마지막 칼럼 우측 선 없음) */}
              <th style={{ ...thStyle, width: '54%', borderRight: 'none' }}>근무 시간</th>
            </tr>
          </thead>
          <tbody>
            {sortedSchedules.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: '24px 0',
                    textAlign: 'center',
                    color: '#bbb',
                    fontSize: 12,
                    borderBottom: 'none',
                  }}
                >
                  근무자 없음
                </td>
              </tr>
            ) : (
              sortedSchedules.map((s) => (
                <EmployeeRow
                  key={s.id}
                  schedule={s}
                  isSelected={selectedScheduleIds.includes(s.id)}
                  onToggleSelect={handleToggleSelectOne}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 2px',
  fontSize: 11,
  fontWeight: 600,
  textAlign: 'center',
  color: 'var(--color-primary)',
  borderBottom: '1px solid var(--color-border)',
  borderRight: '1px solid var(--color-border)',
  background: '#FAFAFA',
  whiteSpace: 'nowrap',
};
