'use client';

import { useState, useMemo } from 'react';
import type { WorkSchedule, Employee, ShiftType } from '@/types';
import { SHIFT_DEFAULTS, SHIFT_LABELS, ROLE_LABELS } from '@/lib/constants';
import { formatDayLabel } from '@/lib/weekUtils';
import { useScheduleStore } from '@/store/useScheduleStore';
import EmployeeRow from './EmployeeRow';
import BottomSheet from '@/components/ui/BottomSheet';

const SHIFT_TEXT_COLOR: Record<ShiftType, string> = {
  open: '#D97706',
  close: '#2563EB',
  oma: '#DC2626',
  part: '#78716C',
};

interface DayCardProps {
  date: string;
  schedules: WorkSchedule[];
  employees: Employee[];
  onBreakClick?: (schedule: WorkSchedule) => void;
}

export default function DayCard({ date, schedules, employees }: DayCardProps) {
  const { upsertSchedule, deleteSchedules, syncDaySchedules } = useScheduleStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<string[]>([]);

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
      className="md:border md:rounded-xl"
      style={{
        borderColor: 'var(--color-border)',
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
          padding: '2px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 날짜 라벨 */}
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: isWeekend ? '#C0392B' : 'var(--color-neutral-dark)',
              letterSpacing: '-0.02em',
            }}
          >
            {formatDayLabel(date)}
          </span>
        </div>

        {/* 우측 액션: 선택 삭제 + 동기화 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 선택 삭제 (텍스트 형태) */}
          {selectedScheduleIds.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              title="선택한 직원 삭제"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '4px 2px',
                fontSize: 12,
                fontWeight: 500,
                color: '#C0392B',
                cursor: 'pointer',
                letterSpacing: '-0.02em',
              }}
              className="hover:opacity-80 transition-opacity"
            >
              삭제
            </button>
          )}

          {/* 동기화 버튼 (텍스트 형태) */}
          <button
            type="button"
            onClick={() => setShowSyncModal(true)}
            disabled={isSyncing}
            title="직원 정보 동기화"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '4px 2px',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--color-primary)',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              opacity: isSyncing ? 0.5 : 0.8,
              letterSpacing: '-0.02em',
            }}
            className="hover:opacity-100 transition-opacity"
          >
            동기화
          </button>
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
              variant="mobile"
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
            <tr>
              <td
                colSpan={4}
                style={{
                  padding: 0,
                  height: 1,
                  lineHeight: 0,
                  fontSize: 0,
                  border: 'none',
                  background: 'transparent',
                }}
              >
                <div style={{ margin: '0 16px', height: 1, background: 'var(--color-border)' }} />
              </td>
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
              sortedSchedules.map((s, idx) => (
                <EmployeeRow
                  key={s.id}
                  schedule={s}
                  isSelected={selectedScheduleIds.includes(s.id)}
                  onToggleSelect={handleToggleSelectOne}
                  isLast={idx === sortedSchedules.length - 1}
                  variant="desktop"
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── 하단: 직원 추가 버튼 ── */}
      <div
        style={{
          padding: '6px 16px 10px',
          background: 'var(--color-surface)',
        }}
      >
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          disabled={isAdding || availableEmployees.length === 0}
          title={availableEmployees.length === 0 ? '추가 가능한 직원이 없습니다' : '직원 추가'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontWeight: 600,
            background: availableEmployees.length === 0 ? '#FAF9F7' : '#F4EFEA',
            color: availableEmployees.length === 0 ? '#B0A898' : 'var(--color-primary)',
            border: 'none',
            borderRadius: 6,
            cursor: availableEmployees.length === 0 ? 'not-allowed' : 'pointer',
            letterSpacing: '-0.02em',
          }}
          className={`w-full flex items-center justify-center gap-1.5 rounded-md transition-colors h-[48px] text-[14px] md:h-[34px] md:text-[12px] ${availableEmployees.length === 0 ? '' : 'hover:bg-[#ECE6DE]'
            }`}
        >
          <span className="text-[16px] md:text-[13px]" style={{ lineHeight: 1 }}>+</span>
          직원 추가
        </button>
      </div>

      {/* ── 동기화 선택 바텀시트 ── */}
      {showSyncModal && (
        <SyncBottomSheet
          date={date}
          onClose={() => setShowSyncModal(false)}
          onSync={async (mode) => {
            setIsSyncing(true);
            try {
              await syncDaySchedules(date, mode, employees);
            } finally {
              setIsSyncing(false);
            }
          }}
          isSyncing={isSyncing}
        />
      )}

      {/* ── 직원 추가 바텀시트 ── */}
      {showAddModal && (
        <AddEmployeeBottomSheet
          date={date}
          availableEmployees={availableEmployees}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddEmployee}
        />
      )}
    </div>
  );
}

// ─── 동기화 바텀시트 (스크롤 잠금 + 아래로 스와이프 닫기) ─────────────────────────
interface SyncBottomSheetProps {
  date: string;
  onClose: () => void;
  onSync: (mode: 'missing_only' | 'reset_all') => Promise<void>;
  isSyncing: boolean;
}

function SyncBottomSheet({ date, onClose, onSync, isSyncing }: SyncBottomSheetProps) {
  return (
    <BottomSheet
      onClose={onClose}
      maxHeight="90vh"
      padding="10px 20px 32px"
      historyKey="syncSheet"
    >
      <div style={{ marginBottom: 12, marginTop: 8 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0 }}>
          동기화 방식을 선택하세요
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* 옵션 1: 누락된 직원만 추가 */}
        <button
          type="button"
          onClick={async () => {
            await onSync('missing_only');
            onClose();
          }}
          disabled={isSyncing}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '12px 0',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-neutral-dark)' }}>
              누락된 직원만 추가
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            해당 요일의 기존 스케줄은 유지하고,<br />아직 등록되지 않은 직원만 채움니다.
          </span>
        </button>

        {/* 옵션 2: 전체 기본값으로 재설정 */}
        <button
          type="button"
          onClick={async () => {
            if (!confirm(`${formatDayLabel(date)}의 기존 스케줄이 모두 삭제되고 기본값으로 다시 채워집니다. 진행하시겠습니까?`)) {
              return;
            }
            await onSync('reset_all');
            onClose();
          }}
          disabled={isSyncing}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            padding: '12px 0',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#C0392B' }}>
              전체 기본값으로 재설정
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
            해당 요일의 스케줄을 모두 지우고 새로 배치합니다.
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        style={{
          width: '100%',
          padding: '12px 0',
          marginTop: 14,
          fontSize: 13,
          fontWeight: 600,
          color: '#666',
          border: 'none',
          background: '#F0EEE9',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        취소
      </button>
    </BottomSheet>
  );
}

// ─── 직원 추가 바텀시트 (스크롤 잠금 + 아래로 스와이프 닫기) ─────────────────────
interface AddEmployeeBottomSheetProps {
  date: string;
  availableEmployees: Employee[];
  onClose: () => void;
  onAdd: (employee: Employee) => Promise<void>;
}

function AddEmployeeBottomSheet({ date, availableEmployees, onClose, onAdd }: AddEmployeeBottomSheetProps) {
  return (
    <BottomSheet
      onClose={onClose}
      maxWidth={420}
      maxHeight="80vh"
      padding="10px 20px 28px"
      historyKey="addEmployeeSheet"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, marginTop: 8 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0 }}>
            직원 추가
          </h3>
          <span style={{ fontSize: 12, color: '#777', marginTop: 2, display: 'block' }}>
            {formatDayLabel(date)} · 배정 가능 {availableEmployees.length}명
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: 20,
            color: '#888',
            cursor: 'pointer',
            padding: 4,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* 직원 목록 */}
      <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, margin: '0 -4px', padding: '0 4px' }}>
        {availableEmployees.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#999', fontSize: 13 }}>
            배정 가능한 직원이 없습니다.
          </div>
        ) : (
          availableEmployees.map((emp) => {
            const shiftType = emp.default_shift_types[0] as ShiftType | undefined;
            const shiftDefaults = shiftType ? SHIFT_DEFAULTS[shiftType] : undefined;
            const roles = emp.available_roles.map((r) => ROLE_LABELS[r] ?? r);

            return (
              <button
                key={emp.id}
                type="button"
                onClick={async () => {
                  await onAdd(emp);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '12px 14px',
                  background: '#FAF8F5',
                  border: '1px solid var(--color-border)',
                  borderRadius: 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#EAE7E2',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {emp.name.slice(-2)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-neutral-dark)' }}>
                        {emp.name}
                      </span>
                      {shiftType && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: SHIFT_TEXT_COLOR[shiftType] ?? '#666',
                            background: '#FFFFFF',
                            padding: '1px 5px',
                            borderRadius: 4,
                            border: '1px solid var(--color-border)',
                          }}
                        >
                          {SHIFT_LABELS[shiftType] ?? shiftType}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#777', marginTop: 3 }}>
                      {roles.join(' · ') || '직무 없음'}
                      {shiftDefaults && ` (${shiftDefaults.start}~${shiftDefaults.end})`}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    background: '#FFFFFF',
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--color-border)',
                    flexShrink: 0,
                  }}
                >
                  + 추가
                </span>
              </button>
            );
          })
        )}
      </div>
    </BottomSheet>
  );
}

const thStyle: React.CSSProperties = {
  padding: '6px 2px',
  fontSize: 11,
  fontWeight: 600,
  textAlign: 'center',
  color: 'var(--color-primary)',
  borderBottom: 'none',
  borderRight: '1px solid var(--color-border)',
  background: '#FAFAFA',
  whiteSpace: 'nowrap',
};
