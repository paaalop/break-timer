'use client';

import { useState, useMemo } from 'react';
import type { Employee, Role, DayOfWeek, ShiftType, CreateEmployeeInput, UpdateEmployeeInput } from '@/types';
import { ROLE_OPTIONS, ROLE_LABELS, DAY_OPTIONS, DAY_LABELS, SHIFT_OPTIONS, SHIFT_LABELS } from '@/lib/constants';
import MultiSelectDropdown from '@/components/ui/MultiSelectDropdown';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import BottomSheet from '@/components/ui/BottomSheet';

// ─── 뱃지 색상 ────────────────────────────────────────────────────────────────
const SHIFT_TEXT_COLOR: Record<ShiftType, string> = {
  open:  '#D97706', // 오픈 (따뜻한 앰버)
  close: '#2563EB', // 마감 (세련된 블루)
  oma:   '#DC2626', // 오마 (선명한 레드)
  part:  '#78716C', // 파트 (부드러운 그레이)
};


const SHIFT_LEGEND = [
  { type: 'open'  as ShiftType, label: '오픈' },
  { type: 'close' as ShiftType, label: '마감' },
  { type: 'oma'   as ShiftType, label: '오마' },
  { type: 'part'  as ShiftType, label: '파트' },
];

// DAY_OPTIONS 순서 그대로 (월~일)
const DAY_TOGGLE_ORDER: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0];

const ROLE_ORDER: Record<string, number> = Object.fromEntries(
  ROLE_OPTIONS.map((opt, i) => [opt.value, i])
);

function getSortedRoles(roles: Role[]): Role[] {
  return [...roles]
    .filter((r) => r in ROLE_LABELS)
    .sort((a, b) => (ROLE_ORDER[a] ?? 99) - (ROLE_ORDER[b] ?? 99));
}


function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.length >= 2 ? name.slice(-2) : name;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#EAE7E2',
        color: 'var(--color-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size >= 44 ? 15 : size * 0.33,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: '-0.02em',
      }}
    >
      {initials}
    </div>
  );
}

// ─── 모바일 직원 정보 시트 (수정 및 신규 등록 공용 바텀시트) ────────────────────
interface MobileEmployeeSheetProps {
  mode: 'edit' | 'add';
  emp?: Employee;
  onClose: () => void;
  onSave: (data: CreateEmployeeInput) => Promise<void>;
  onDelete?: () => void;
}

function MobileEmployeeSheet({ mode, emp, onClose, onSave, onDelete }: MobileEmployeeSheetProps) {
  const isEdit = mode === 'edit';
  const [name, setName] = useState(emp?.name ?? '');
  const [roles, setRoles] = useState<Set<Role>>(() => {
    if (emp) {
      const valid = emp.available_roles.filter((r): r is Role => r in ROLE_LABELS);
      return new Set(valid);
    }
    return new Set<Role>();
  });
  const [days, setDays] = useState<Set<DayOfWeek>>(
    new Set(emp ? emp.available_days : [])
  );
  const [shiftType, setShiftType] = useState<ShiftType>(
    emp?.default_shift_types[0] ?? 'open'
  );
  const [isMinor, setIsMinor] = useState<boolean>(emp?.is_minor ?? false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── 폼 핸들러 ──────────────────────────────────────────────────────────────
  const toggleRole = (r: Role) => {
    setRoles((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      if (next.size > 0) setRoleError(null);
      return next;
    });
  };

  const toggleDay = (d: DayOfWeek) => {
    setDays((prev) => {
      const next = new Set(prev);
      next.has(d) ? next.delete(d) : next.add(d);
      if (next.size > 0) setDayError(null);
      return next;
    });
  };

  const handleSave = async () => {
    let hasError = false;
    setNameError(null);
    setRoleError(null);
    setDayError(null);
    setGeneralError(null);

    if (!name.trim()) {
      setNameError('이름을 입력해 주세요.');
      hasError = true;
    }
    if (days.size === 0) {
      setDayError('근무 요일을 1개 이상 선택해 주세요.');
      hasError = true;
    }
    if (hasError) return;

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        available_roles: getSortedRoles([...roles]),
        available_days: [...days] as DayOfWeek[],
        default_shift_types: [shiftType],
        is_minor: isMinor,
      });
      onClose();
    } catch (err: any) {
      setGeneralError(err?.message || (isEdit ? '수정 실패' : '등록 실패'));
    } finally {
      setIsSaving(false);
    }
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'baseline',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#8C857B',
    marginBottom: 8,
    letterSpacing: '-0.02em',
  };

  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmDialog(false);
    }
  };

  return (
    <>
      <BottomSheet
        onClose={onClose}
        maxWidth={480}
        maxHeight="92vh"
        padding="10px 20px 36px"
        gap={20}
        historyKey="employeeSheet"
      >
        {/* 헤더: 제목 + (수정 모드일 때만 우상단 직원 삭제) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 12,
            minHeight: 28,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0, lineHeight: 1 }}>
            {isEdit ? '직원 정보 수정' : '신규 직원 추가'}
          </h2>
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirmDialog(true)}
              disabled={isSaving || isDeleting}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                color: '#C0392B',
                fontSize: 13,
                fontWeight: 600,
                opacity: isSaving || isDeleting ? 0.4 : 1,
                letterSpacing: '-0.02em',
              }}
            >
              직원 삭제
            </button>
          )}
        </div>

        {/* 이름 입력 (라벨 + 밑줄 형태 + 전체삭제 x버튼) */}
        <div>
          <label style={labelStyle}>
            이름
          </label>
          <Input
            variant="underline"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (e.target.value.trim()) setNameError(null);
            }}
            placeholder="이름 입력"
            style={{
              padding: '8px',
              fontSize: 20,
              fontWeight: 700,
            }}
          />
          {nameError && (
            <p style={{ fontSize: 12, color: '#C0392B', margin: '6px 0 0', fontWeight: 500 }}>
              {nameError}
            </p>
          )}
        </div>

        {/* 직무 (다중 선택: 분리된 토글 버튼 그리드) 및 미성년자 토글 버튼 */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              직무
            </label>
            <button
              type="button"
              onClick={() => setIsMinor((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '4px 8px',
                borderRadius: 20,
                border: isMinor ? '1px solid var(--color-primary)' : '1px solid #D5D1C9',
                background: isMinor ? '#F5F0EB' : '#FAFAFA',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="미성년자 여부 (휴게시간 2시간 30분 적용)"
              aria-pressed={isMinor}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: isMinor ? 700 : 500,
                  color: isMinor ? 'var(--color-primary)' : '#777777',
                  letterSpacing: '-0.02em',
                }}
              >
                미성년자
              </span>
              <div
                style={{
                  width: 28,
                  height: 16,
                  borderRadius: 8,
                  background: isMinor ? 'var(--color-primary)' : '#D5D1C9',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  boxSizing: 'border-box',
                  transition: 'background-color 0.18s ease',
                }}
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    transform: isMinor ? 'translateX(12px)' : 'translateX(0px)',
                    transition: 'transform 0.18s ease',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                  }}
                />
              </div>
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {ROLE_OPTIONS.map((opt) => {
              const active = roles.has(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleRole(opt.value)}
                  style={{
                    border: active ? '2px solid var(--color-primary)' : '1px solid #D5D1C9',
                    borderRadius: 8,
                    padding: '11px 0',
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    background: 'transparent',
                    color: active ? 'var(--color-primary)' : '#777777',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          {isMinor && (
            <p style={{ fontSize: 11, color: 'var(--color-primary)', margin: '6px 0 0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>ℹ️</span> 미성년자: 휴게시간 2시간 30분(150분)이 자동 적용됩니다.
            </p>
          )}
          {roleError && (
            <p style={{ fontSize: 12, color: '#C0392B', margin: '6px 0 0', fontWeight: 500 }}>
              {roleError}
            </p>
          )}
        </div>

        {/* 근무 요일 (다중 선택: 정원형 Circle 버튼) */}
        <div>
          <label style={labelStyle}>
            근무 요일
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            {DAY_TOGGLE_ORDER.map((d) => {
              const active = days.has(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    border: active ? '2px solid var(--color-primary)' : '1px solid #D5D1C9',
                    background: 'transparent',
                    color: active ? 'var(--color-primary)' : '#777777',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {DAY_LABELS[d]}
                </button>
              );
            })}
          </div>
          {/* 에러 발생 시 근무 요일 바로 아래 배치 */}
          {dayError && (
            <p style={{ fontSize: 12, color: '#C0392B', margin: '6px 0 0', fontWeight: 500 }}>
              {dayError}
            </p>
          )}
        </div>

        {/* 근무 타입 (단일 선택: 세그먼트 컨트롤) */}
        <div>
          <label style={labelStyle}>
            근무 타입
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              width: '100%',
              borderRadius: 8,
              border: '1px solid #D5D1C9',
              overflow: 'hidden',
              boxSizing: 'border-box',
              background: 'transparent',
            }}
          >
            {SHIFT_OPTIONS.map((opt, idx) => {
              const active = shiftType === opt.value;
              const isNextActive = idx < SHIFT_OPTIONS.length - 1 && shiftType === SHIFT_OPTIONS[idx + 1].value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setShiftType(opt.value)}
                  style={{
                    position: 'relative',
                    border: 'none',
                    borderRight: idx < SHIFT_OPTIONS.length - 1 ? (active || isNextActive ? 'none' : '1px solid #D5D1C9') : 'none',
                    borderRadius: idx === 0 ? '7px 0 0 7px' : idx === SHIFT_OPTIONS.length - 1 ? '0 7px 7px 0' : 0,
                    boxShadow: active ? 'inset 0 0 0 2px var(--color-primary)' : 'none',
                    padding: '11px 0',
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    background: 'transparent',
                    color: active ? 'var(--color-primary)' : '#777777',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 일반 에러 메시지 (API 등) */}
        {generalError && (
          <p style={{ fontSize: 12, color: '#C0392B', margin: 0, fontWeight: 500 }}>{generalError}</p>
        )}

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '14px 0',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            borderRadius: 8,
            background: 'var(--color-primary)',
            color: '#FFFFFF',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            marginTop: 6,
            transition: 'opacity 0.15s',
          }}
        >
          {isSaving ? (isEdit ? '저장 중...' : '등록 중...') : (isEdit ? '변경사항 저장' : '직원 등록')}
        </button>
      </BottomSheet>

      {/* 단건 삭제 확인 다이얼로그 */}
      {showDeleteConfirmDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 600,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirmDialog(false);
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '20px 22px',
              maxWidth: 320,
              width: '88%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: 'var(--color-neutral-dark)' }}>
              직원 삭제
            </h3>
            <p style={{ fontSize: 13, color: '#555', margin: '0 0 16px', lineHeight: 1.5 }}>
              <strong>{name || '해당'}</strong> 직원을 정말 삭제하시겠습니까?
              <br />
              <span style={{ fontSize: 11, color: '#999' }}>
                기존에 배정된 스케줄 기록은 유지됩니다.
              </span>
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirmDialog(false)}
                disabled={isDeleting}
                style={{
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  border: '1px solid var(--color-border)',
                  borderRadius: 6,
                  background: 'var(--color-surface)',
                  color: 'var(--color-neutral-dark)',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 6,
                  background: '#C0392B',
                  color: '#FFFFFF',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 기존 인터페이스 호환용 래퍼 컴포넌트
interface MobileEditSheetProps {
  emp: Employee;
  onClose: () => void;
  onSave: (id: string, data: UpdateEmployeeInput) => Promise<void>;
  onDelete: () => void;
}

function MobileEditSheet({ emp, onClose, onSave, onDelete }: MobileEditSheetProps) {
  return (
    <MobileEmployeeSheet
      mode="edit"
      emp={emp}
      onClose={onClose}
      onSave={(data) => onSave(emp.id, data)}
      onDelete={onDelete}
    />
  );
}

interface MobileAddSheetProps {
  onClose: () => void;
  onSave: (data: CreateEmployeeInput) => Promise<void>;
}

function MobileAddSheet({ onClose, onSave }: MobileAddSheetProps) {
  return (
    <MobileEmployeeSheet
      mode="add"
      onClose={onClose}
      onSave={onSave}
    />
  );
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
  // 신규 추가 상태
  const [newName, setNewName] = useState('');
  const [newRoles, setNewRoles] = useState<Role[]>([]);
  const [newDays, setNewDays] = useState<DayOfWeek[]>([]);
  const [newShifts, setNewShifts] = useState<ShiftType[]>(['open']);
  const [newIsMinor, setNewIsMinor] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // 데스크탑 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRoles, setEditRoles] = useState<Role[]>([]);
  const [editDays, setEditDays] = useState<DayOfWeek[]>([]);
  const [editShifts, setEditShifts] = useState<ShiftType[]>(['open']);
  const [editIsMinor, setEditIsMinor] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // 모바일 검색 + 시트 상태
  const [mobileQuery, setMobileQuery] = useState('');
  const [sheetEmp, setSheetEmp] = useState<Employee | null>(null);

  const resetNewForm = () => {
    setNewName('');
    setNewRoles([]);
    setNewDays([]);
    setNewShifts(['open']);
    setNewIsMinor(false);
    setAddError(null);
  };

  const handleSaveNewSubmit = async () => {
    if (!newName.trim()) { setAddError('이름 입력'); return; }
    if (newDays.length === 0) { setAddError('요일 선택'); return; }
    if (newShifts.length === 0) { setAddError('타입 선택'); return; }
    setAddError(null);
    setIsSubmittingAdd(true);
    try {
      await onSaveNew({
        name: newName.trim(),
        available_roles: newRoles,
        available_days: newDays,
        default_shift_types: newShifts,
        is_minor: newIsMinor,
      });
      resetNewForm();
    } catch (err: any) {
      setAddError(err?.message || '저장 실패');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // 데스크탑 편집
  const handleStartEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEditName(emp.name);
    setEditRoles(emp.available_roles.filter((r): r is Role => r in ROLE_LABELS));
    setEditDays([...emp.available_days]);
    setEditShifts(emp.default_shift_types.length ? [emp.default_shift_types[0]] : ['open']);
    setEditIsMinor(emp.is_minor ?? false);
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const handleSaveEditSubmit = async (id: string) => {
    if (!editName.trim()) { setEditError('이름 입력'); return; }
    if (editDays.length === 0) { setEditError('요일 선택'); return; }
    if (editShifts.length === 0) { setEditError('타입 선택'); return; }
    setEditError(null);
    setIsSubmittingEdit(true);
    try {
      await onUpdate(id, {
        name: editName.trim(),
        available_roles: editRoles,
        available_days: editDays,
        default_shift_types: editShifts,
        is_minor: editIsMinor,
      });
      setEditingId(null);
    } catch (err: any) {
      setEditError(err?.message || '수정 실패');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

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

  // ─────────────────────────────────────────────────────────────────────────────
  // 공통 스타일
  // ─────────────────────────────────────────────────────────────────────────────
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
              style={{
                height: 26,
                padding: '0 10px',
                fontSize: 11,
                fontWeight: 600,
                background: '#FDF2F1',
                color: '#C0392B',
                border: '1px solid #F8D7DA',
                borderRadius: 4,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              선택 삭제 ({selectedIds.length}명)
            </button>
          )}
        </div>
        <button
          onClick={onOpenAdd}
          disabled={isAdding}
          title="직원 추가"
          style={{
            height: 28,
            padding: '0 10px',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 600,
            background: 'var(--color-primary)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 4,
            cursor: isAdding ? 'not-allowed' : 'pointer',
            opacity: isAdding ? 0.35 : 1,
            gap: 4,
          }}
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
            background: '#F0EDE8',
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
            color: '#FFFFFF',
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
            <span style={{ fontSize: 12, fontWeight: 700, color: '#777777', letterSpacing: '-0.02em' }}>
              {mobileQuery.trim()
                ? `검색 결과 ${filteredEmployees.length}명 / 총 ${employees.length}명`
                : `총 ${employees.length}명`}
            </span>
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={onDeleteSelected}
                style={{
                  padding: '3px 8px',
                  fontSize: 11,
                  fontWeight: 600,
                  background: '#FDF2F1',
                  color: '#C0392B',
                  border: '1px solid #F8D7DA',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                선택 삭제 ({selectedIds.length}명)
              </button>
            )}
          </div>

          {filteredEmployees.length === 0 && !isAdding && (
            <p style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#bbb', margin: 0 }}>
              {mobileQuery ? '검색 결과가 없어요' : '등록된 직원이 없습니다. + 버튼을 눌러 직원을 등록해 주세요.'}
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface)')}
              >
                {/* 큼직한 아바타 서클: 오른쪽 텍스트들의 시각적 앵커 역할 */}
                <Avatar name={emp.name} size={52} />

                {/* 정보 영역: 아바타에 귀속된 단일 그룹으로 인지 */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column'}}>
                  {/* 1행: 이름 · 근무타입 (좌측 인라인 텍스트) / 직무 (우측 테두리 없는 개별 연한 배경 뱃지들) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-neutral-dark)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                        {emp.name}
                      </span>
                      {emp.is_minor && (
                        <span
                          style={{
                            marginLeft: 6,
                            padding: '1px 5px',
                            fontSize: 10,
                            fontWeight: 700,
                            borderRadius: 4,
                            background: '#FEF3C7',
                            color: '#D97706',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.3,
                            flexShrink: 0,
                          }}
                        >
                          미성년자
                        </span>
                      )}
                      {shiftType && (
                        <>
                          <span style={{ color: '#000000ff', margin: '0 5px', fontSize: 12, fontWeight: 700 }}>·</span>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: SHIFT_TEXT_COLOR[shiftType] ?? '#666666',
                              letterSpacing: '-0.02em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {SHIFT_LABELS[shiftType]}
                          </span>
                        </>
                      )}
                    </div>

                    {/* 직무: 테두리 없는 개별 연한 배경 뱃지 */}
                    {sortedRoles.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
                        {sortedRoles.map((role) => (
                          <span
                            key={role}
                            style={{
                              padding: '1px 4px',
                              fontSize: 11,
                              fontWeight: 600,
                              borderRadius: 4,
                              background: '#F0EEE9',
                              color: 'var(--color-primary)',
                              border: 'none',
                              whiteSpace: 'nowrap',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {ROLE_LABELS[role]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2행: 근무 가능 요일 (이름 바로 아래 배치) */}
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#666666', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sortedDays.length > 0 ? sortedDays.map(d => DAY_LABELS[d] ?? String(d)).join('·') : '요일 없음'}
                    요일 근무
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 수정 시트 오버레이 (항상 렌더 – fixed 포지션) */}
      {sheetEmp && (
        <MobileEditSheet
          emp={sheetEmp}
          onClose={() => setSheetEmp(null)}
          onSave={onUpdate}
          onDelete={handleSheetDelete}
        />
      )}

      {/* 신규 추가 시트 오버레이 (항상 렌더 – fixed 포지션) */}
      {isAdding && (
        <MobileAddSheet
          onClose={onCancelAdd}
          onSave={onSaveNew}
        />
      )}

      {/* 데스크탑 테이블 뷰 (md 이상) */}
      <div className="hidden md:block" style={{ border: '1px solid var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
                <th style={{ ...thStyle, width: 32, padding: '4px 2px' }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={onToggleSelectAll}
                    style={{ cursor: 'pointer', margin: 0 }}
                    aria-label="전체 선택"
                  />
                </th>
                <th style={{ ...thStyle, width: '14%' }}>이름</th>
                <th style={{ ...thStyle, width: '20%' }}>직무</th>
                <th style={{ ...thStyle, width: '45%' }}>근무 요일</th>
                <th style={{ ...thStyle, width: '21%', borderRight: 'none' }}>근무 타입</th>
              </tr>
            </thead>
            <tbody>
              {/* 신규 추가 행 */}
              {isAdding && (
                <tr style={{ background: '#F0F7FF', borderBottom: '2px solid var(--color-primary)' }}>
                  <td style={{ ...tdStyle, width: 32, padding: '2px 1px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                      <button
                        onClick={handleSaveNewSubmit}
                        disabled={isSubmittingAdd}
                        title="저장"
                        style={{ background: 'var(--color-primary)', color: '#FFFFFF', border: 'none', borderRadius: 2, width: 20, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => { resetNewForm(); onCancelAdd(); }}
                        disabled={isSubmittingAdd}
                        title="취소"
                        style={{ background: '#EEEEEE', color: '#666666', border: 'none', borderRadius: 2, width: 20, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <Input
                      variant="borderless"
                      type="text"
                      placeholder="이름"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveNewSubmit();
                        if (e.key === 'Escape') { resetNewForm(); onCancelAdd(); }
                      }}
                      style={{ padding: '2px 0', fontSize: 12, fontWeight: 600, textAlign: 'center', background: 'transparent' }}
                      autoFocus
                    />
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: newIsMinor ? 'var(--color-primary)' : '#888', cursor: 'pointer', marginTop: 2 }}>
                      <input
                        type="checkbox"
                        checked={newIsMinor}
                        onChange={(e) => setNewIsMinor(e.target.checked)}
                        style={{ margin: 0, width: 12, height: 12, cursor: 'pointer' }}
                      />
                      미성년자
                    </label>
                  </td>
                  <td style={tdStyle}>
                    <MultiSelectDropdown options={ROLE_OPTIONS} selected={newRoles} onChange={setNewRoles} placeholder="직무" />
                  </td>
                  <td style={tdStyle}>
                    <MultiSelectDropdown options={DAY_OPTIONS} selected={newDays} onChange={setNewDays} placeholder="요일" />
                  </td>
                  <td style={{ ...tdStyle, borderRight: 'none' }}>
                    <select
                      value={newShifts[0] ?? 'open'}
                      onChange={(e) => setNewShifts([e.target.value as ShiftType])}
                      style={{ width: '100%', minHeight: 26, border: 'none', outline: 'none', background: 'transparent', fontSize: 11, fontFamily: 'inherit', fontWeight: 400, color: 'var(--color-neutral-dark)', textAlign: 'center', textAlignLast: 'center', cursor: 'pointer', padding: '2px 4px', boxSizing: 'border-box' }}
                    >
                      {SHIFT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {addError && <div style={{ color: '#C0392B', fontSize: 10, marginTop: 1 }}>{addError}</div>}
                  </td>
                </tr>
              )}

              {/* 빈 상태 */}
              {employees.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', color: '#bbb', fontSize: 12, borderBottom: 'none' }}>
                    등록된 직원이 없습니다. 상단의 + 버튼을 눌러 직원을 등록해 주세요.
                  </td>
                </tr>
              )}

              {/* 기존 직원 행 */}
              {sortedEmployees.map((emp) => {
                const isEditing = editingId === emp.id;

                if (isEditing) {
                  return (
                    <tr key={emp.id} style={{ background: '#FFFDF0', borderBottom: '2px solid #E67E22' }}>
                      <td style={{ ...tdStyle, width: 32, padding: '2px 1px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                          <button
                            onClick={() => handleSaveEditSubmit(emp.id)}
                            disabled={isSubmittingEdit}
                            title="저장"
                            style={{ background: '#E67E22', color: '#FFFFFF', border: 'none', borderRadius: 2, width: 20, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            disabled={isSubmittingEdit}
                            title="취소"
                            style={{ background: '#EEEEEE', color: '#666666', border: 'none', borderRadius: 2, width: 20, height: 18, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <Input
                          variant="borderless"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditSubmit(emp.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          style={{ padding: '2px 0', fontSize: 12, fontWeight: 600, textAlign: 'center', background: 'transparent' }}
                          autoFocus
                        />
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: editIsMinor ? 'var(--color-primary)' : '#888', cursor: 'pointer', marginTop: 2 }}>
                          <input
                            type="checkbox"
                            checked={editIsMinor}
                            onChange={(e) => setEditIsMinor(e.target.checked)}
                            style={{ margin: 0, width: 12, height: 12, cursor: 'pointer' }}
                          />
                          미성년자
                        </label>
                      </td>
                      <td style={tdStyle}>
                        <MultiSelectDropdown options={ROLE_OPTIONS} selected={editRoles} onChange={setEditRoles} placeholder="직무" />
                      </td>
                      <td style={tdStyle}>
                        <MultiSelectDropdown options={DAY_OPTIONS} selected={editDays} onChange={setEditDays} placeholder="요일" />
                      </td>
                      <td style={{ ...tdStyle, borderRight: 'none' }}>
                        <select
                          value={editShifts[0] ?? 'open'}
                          onChange={(e) => setEditShifts([e.target.value as ShiftType])}
                          style={{ width: '100%', minHeight: 26, border: 'none', outline: 'none', background: 'transparent', fontSize: 11, fontFamily: 'inherit', fontWeight: 400, color: 'var(--color-neutral-dark)', textAlign: 'center', textAlignLast: 'center', cursor: 'pointer', padding: '2px 4px', boxSizing: 'border-box' }}
                        >
                          {SHIFT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {editError && <div style={{ color: '#C0392B', fontSize: 10, marginTop: 1 }}>{editError}</div>}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={emp.id}
                    onClick={() => handleStartEdit(emp)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="터치하여 즉시 수정"
                  >
                    <td style={{ ...tdStyle, width: 32, padding: '4px 2px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(emp.id)}
                        onChange={() => onToggleSelectOne(emp.id)}
                        style={{ cursor: 'pointer', margin: 0 }}
                        aria-label={`${emp.name} 선택`}
                      />
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, fontSize: 12 }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <span>{emp.name}</span>
                        {emp.is_minor && (
                          <span
                            style={{
                              padding: '1px 4px',
                              fontSize: 9,
                              fontWeight: 700,
                              borderRadius: 3,
                              background: '#FEF3C7',
                              color: '#D97706',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2,
                            }}
                          >
                            미성년자
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 11, color: 'var(--color-neutral-dark)' }}>
                        {getSortedRoles(emp.available_roles).map((r) => ROLE_LABELS[r]).join(', ') || '-'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                        {[...emp.available_days]
                          .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
                          .map((d) => (
                            <Badge key={d} label={DAY_LABELS[d] ?? String(d)} />
                          ))}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, borderRight: 'none' }}>
                      <span style={{ fontSize: 11, color: 'var(--color-neutral-dark)', whiteSpace: 'nowrap' }}>
                        {emp.default_shift_types[0]
                          ? (SHIFT_LABELS[emp.default_shift_types[0]] ?? emp.default_shift_types[0])
                          : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </> 
  );
}
